import type { PatternOutput, Quantity } from '../../model/contracts.ts';
import type { BldcEvaluationInput } from '../../derive/bldc.ts';
import { value, missingFor } from '../../derive/bldc.ts';
import { calculateBusPumping } from '../../physics/busPumping.ts';
import { patternStateFromPhysics, validateNumericDomain } from '../../physics/result.ts';
import { makeNode, makeMargin, traceInput, ok } from '../../trace/trace.ts';
import { finalizePattern } from '../finalize.ts';
import { BLDC_CONTENT } from '../../../content/bldc.ts';

const REQUIRED = ['vbusNominalV', 'vdsRatingV', 'regenEfficiency', 'absorbedEnergyJ', 'rpm', 'rotorInertiaKgM2', 'cbusUf'] as const;
const derivedQ = (v: number, unit: string): Quantity => ok(v, unit, 'DERIVED', 'core/physics/busPumping');

export function evaluateP001(input: BldcEvaluationInput): PatternOutput {
  const unknowns = missingFor(input, REQUIRED);
  if (unknowns.length) return finalizePattern({
    id: 'BLDC.P001', name: '母线泵升', kind: 'FAILURE_MODE', triggered: 'insufficient_input', veto: { triggered: false }, values: [], trace: [],
    measures: [BLDC_CONTENT.measures.busClamp(), BLDC_CONTENT.measures.busCap(), BLDC_CONTENT.measures.busContainment()], verification: [BLDC_CONTENT.verification.bus], unknowns,
  }, 'Unknown');

  const vbus = value(input, 'vbusNominalV')!; const vds = value(input, 'vdsRatingV')!; const eta = value(input, 'regenEfficiency')!; const absorbedEnergyJ = value(input, 'absorbedEnergyJ')!; const rpm = value(input, 'rpm')!;
  const limitDomain = validateNumericDomain([{ name: 'vbusNominalV', value: vbus, minExclusive: 0 }, { name: 'vdsRatingV', value: vds, minExclusive: 0 }]);
  if (limitDomain.status !== 'ok') { const failure = patternStateFromPhysics(limitDomain); return finalizePattern({ id: 'BLDC.P001', name: '母线泵升', kind: 'FAILURE_MODE', ...failure, values: [], trace: [], measures: [BLDC_CONTENT.measures.busClamp(), BLDC_CONTENT.measures.busCap(), BLDC_CONTENT.measures.busContainment()], verification: [BLDC_CONTENT.verification.bus] }, failure.riskLevel); }
  const inertia = value(input, 'rotorInertiaKgM2')!; const cbus = value(input, 'cbusUf')!;
  const calc = calculateBusPumping({ vbusNominalV: vbus, cbusUf: cbus, rotorInertiaKgM2: inertia, rpm, efficiency: eta, absorbedEnergyJ });
  if (calc.status !== 'ok') {
    const failure = patternStateFromPhysics(calc);
    return finalizePattern({ id: 'BLDC.P001', name: '母线泵升', kind: 'FAILURE_MODE', ...failure, values: [], trace: [], measures: [BLDC_CONTENT.measures.busClamp(), BLDC_CONTENT.measures.busCap(), BLDC_CONTENT.measures.busContainment()], verification: [BLDC_CONTENT.verification.bus] }, failure.riskLevel);
  }
  const measured = value(input, 'vbusMeasuredPeakV');
  const actualQ = measured === undefined ? derivedQ(calc.value.vbusPeakV, 'V') : input.quantities.vbusMeasuredPeakV;
  const actual = actualQ.status === 'ok' ? actualQ.value : calc.value.vbusPeakV;
  const veto = actual >= vds;
  const triggered = veto;
  const margin = makeMargin(vds, actual, 'V', 'MAX');
  const node = makeNode({
    id: 'BLDC.P001.actualVbusPeakV', title: 'DC-Link 峰值与 VDS 门限',
    formula: 'E_recover=1/2·J·ω²·η−E_abs；1/2·C·(Vpk²−V0²)=E_recover；有实测峰值时实测覆盖理论值',
    standardRef: '器件 VDS 绝对最大额定值，以实际 datasheet 为准',
    inputs: [traceInput('vbusNominalV', '母线标称电压', input.quantities.vbusNominalV), traceInput('vdsRatingV', 'VDS 额定耐压', input.quantities.vdsRatingV), traceInput('regenEfficiency', '再生效率 η', input.quantities.regenEfficiency), traceInput('absorbedEnergyJ', '显式泄放吸收能量', input.quantities.absorbedEnergyJ), traceInput('rpm', '转速', input.quantities.rpm), traceInput('rotorInertiaKgM2', '转子等效惯量', input.quantities.rotorInertiaKgM2), traceInput('cbusUf', '母线电容', input.quantities.cbusUf), ...(measured !== undefined ? [traceInput('vbusMeasuredPeakV', '实测母线峰值（优先证据）', input.quantities.vbusMeasuredPeakV)] : [])],
    verdict: veto ? 'FAIL' : margin.verdict === 'WARN' ? 'WARN' : 'PASS',
  });
  return finalizePattern({
    id: 'BLDC.P001', name: '母线泵升', kind: 'FAILURE_MODE', triggered, veto: { triggered: veto, ...(veto ? { reason: '用于判定的母线峰值超过器件 VDS 额定边界' } : {}) },
    values: [{ key: 'actualVbusPeakV', label: '用于判定的母线峰值', value: actualQ, margin }], trace: [node], measures: [BLDC_CONTENT.measures.busClamp(), BLDC_CONTENT.measures.busCap(), BLDC_CONTENT.measures.busContainment()], verification: [BLDC_CONTENT.verification.bus], unknowns: [],
  }, veto ? 'Critical' : (triggered ? 'High' : 'Low'));
}
