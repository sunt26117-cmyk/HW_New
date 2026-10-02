import type { PatternOutput, Quantity } from '../../model/contracts.ts';
import type { BldcEvaluationInput } from '../../derive/bldc.ts';
import { value, missingFor } from '../../derive/bldc.ts';
import { checkMillerRisk } from '../../physics/miller.ts';
import { patternStateFromPhysics, validateNumericDomain } from '../../physics/result.ts';
import { makeNode, makeMargin, traceInput, ok } from '../../trace/trace.ts';
import { finalizePattern } from '../finalize.ts';
import { BLDC_CONTENT } from '../../../content/bldc.ts';

const REQUIRED = ['vthMinV', 'cgdPf', 'rgOffOhm', 'dvDtVns', 'vbusNominalV'] as const;
const dq = (v: number, unit: string): Quantity => ok(v, unit, 'DERIVED', 'core/physics/miller');

export function evaluateP003(input: BldcEvaluationInput): PatternOutput {
  const unknowns = missingFor(input, REQUIRED);
  if (unknowns.length) return finalizePattern({
    id: 'BLDC.P003', name: '高 dv/dt → 米勒误导通', kind: 'FAILURE_MODE', triggered: 'insufficient_input', veto: { triggered: false }, values: [], trace: [],
    measures: [BLDC_CONTENT.measures.gateDrive(), BLDC_CONTENT.measures.gateContainment()], verification: [BLDC_CONTENT.verification.gate], unknowns,
  }, 'Unknown');
  const vth = value(input, 'vthMinV')!; const cgd = value(input, 'cgdPf')!; const rg = value(input, 'rgOffOhm')!; const dvdt = value(input, 'dvDtVns')!; const vbus = value(input, 'vbusNominalV')!;
  const limitDomain = validateNumericDomain([{ name: 'vthMinV', value: vth, minExclusive: 0 }]);
  if (limitDomain.status !== 'ok') { const failure = patternStateFromPhysics(limitDomain); return finalizePattern({ id: 'BLDC.P003', name: '高 dv/dt → 米勒误导通', kind: 'FAILURE_MODE', ...failure, values: [], trace: [], measures: [BLDC_CONTENT.measures.gateDrive(), BLDC_CONTENT.measures.gateContainment()], verification: [BLDC_CONTENT.verification.gate] }, failure.riskLevel); }
  const calc = checkMillerRisk({ cgdPf: input.quantities.cgdPf, rgOffOhm: input.quantities.rgOffOhm, dvDtVns: input.quantities.dvDtVns, vbusV: input.quantities.vbusNominalV, cgsPf: input.quantities.cgsPf, sourceInductanceNh: input.quantities.sourceInductanceNh, diDtANs: input.quantities.diDtANs });
  if (calc.status !== 'ok') {
    const failure = patternStateFromPhysics(calc);
    return finalizePattern({ id: 'BLDC.P003', name: '高 dv/dt → 米勒误导通', kind: 'FAILURE_MODE', ...failure, values: [], trace: [], measures: [BLDC_CONTENT.measures.gateDrive(), BLDC_CONTENT.measures.gateContainment()], verification: [BLDC_CONTENT.verification.gate] }, failure.riskLevel);
  }
  const measured = value(input, 'gateSpikeMeasuredV');
  const actualQ = measured === undefined ? dq(calc.value.theoreticalGateV, 'V') : input.quantities.gateSpikeMeasuredV;
  const actual = actualQ.status === 'ok' ? actualQ.value : calc.value.theoreticalGateV;
  const veto = actual >= vth; const triggered = veto; const margin = makeMargin(vth, actual, 'V', 'MAX');
  const node = makeNode({
    id: 'BLDC.P003.actualGateV', title: 'Vgs 诱导上升与 Vth 门限',
    formula: 'I_miller=Cgd·dv/dt；Vgs≈I_miller·Rg_off；有实测 Vgs 时实测覆盖理论值',
    standardRef: 'Vth / Crss 等器件参数以实际 datasheet 与测试条件为准',
    inputs: [traceInput('vthMinV', '最低 Vth', input.quantities.vthMinV), traceInput('cgdPf', 'Cgd/Crss', input.quantities.cgdPf), traceInput('rgOffOhm', '关断回路电阻', input.quantities.rgOffOhm), traceInput('dvDtVns', 'dv/dt', input.quantities.dvDtVns), traceInput('vbusNominalV', '母线电压', input.quantities.vbusNominalV), ...(input.quantities.gateSpikeMeasuredV.status === 'ok' ? [traceInput('gateSpikeMeasuredV', '实测 Vgs 尖峰（优先证据）', input.quantities.gateSpikeMeasuredV)] : [])],
    verdict: veto ? 'FAIL' : margin.verdict === 'WARN' ? 'WARN' : 'PASS',
  });
  return finalizePattern({
    id: 'BLDC.P003', name: '高 dv/dt → 米勒误导通', kind: 'FAILURE_MODE', triggered, veto: { triggered: veto, ...(veto ? { reason: '用于判定的门极尖峰达到/超过最低 Vth 门限' } : {}) },
    values: [{ key: 'actualGateV', label: '用于判定的 Vgs 尖峰', value: actualQ, margin }], trace: [node], measures: [BLDC_CONTENT.measures.gateDrive(), BLDC_CONTENT.measures.gateContainment()], verification: [BLDC_CONTENT.verification.gate], unknowns: [],
  }, veto ? 'Critical' : (triggered ? 'High' : 'Low'));
}
