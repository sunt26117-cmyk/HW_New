import type { PatternOutput, Quantity } from '../../model/contracts.ts';
import type { BldcEvaluationInput } from '../../derive/bldc.ts';
import { value, missingFor } from '../../derive/bldc.ts';
import { calculateProtectionTiming } from '../../physics/shortCircuit.ts';
import { patternStateFromPhysics } from '../../physics/result.ts';
import { makeNode, makeMargin, traceInput, ok } from '../../trace/trace.ts';
import { finalizePattern } from '../finalize.ts';
import { BLDC_CONTENT } from '../../../content/bldc.ts';

const REQUIRED = ['senseDelayNs', 'comparatorDelayNs', 'digitalFilterDelayNs', 'driverPropDelayNs', 'gateTurnOffDelayNs', 'currentFallDelayNs', 'soaShortCircuitTimeUs'] as const;
const dq = (v: number, unit: string): Quantity => ok(v, unit, 'DERIVED', 'core/physics/shortCircuit');

export function evaluateP016(input: BldcEvaluationInput): PatternOutput {
  const unknowns = missingFor(input, REQUIRED);
  if (unknowns.length) return finalizePattern({
    id: 'BLDC.P016', name: '过流/短路保护响应时间 ↔ SOA', kind: 'FAILURE_MODE', triggered: 'insufficient_input', veto: { triggered: false }, values: [], trace: [],
    measures: [BLDC_CONTENT.measures.scProtection(), BLDC_CONTENT.measures.scContainment()], verification: [BLDC_CONTENT.verification.shortCircuit], unknowns,
  }, 'Unknown');
  const calc = calculateProtectionTiming({
    senseDelayNs: input.quantities.senseDelayNs, comparatorDelayNs: input.quantities.comparatorDelayNs, filterDelayNs: input.quantities.digitalFilterDelayNs,
    driverDelayNs: input.quantities.driverPropDelayNs, gateTurnOffDelayNs: input.quantities.gateTurnOffDelayNs, currentFallDelayNs: input.quantities.currentFallDelayNs,
    soaTimeUs: input.quantities.soaShortCircuitTimeUs,
  });
  if (calc.status !== 'ok') {
    const failure = patternStateFromPhysics(calc);
    return finalizePattern({ id: 'BLDC.P016', name: '过流/短路保护响应时间 ↔ SOA', kind: 'FAILURE_MODE', ...failure, values: [], trace: [], measures: [BLDC_CONTENT.measures.scProtection(), BLDC_CONTENT.measures.scContainment()], verification: [BLDC_CONTENT.verification.shortCircuit] }, failure.riskLevel);
  }
  const soa = value(input, 'soaShortCircuitTimeUs')!;
  const margin = makeMargin(soa, calc.value.faultToOffUs, 'µs', 'MAX');
  const veto = calc.value.faultToOffUs >= soa; const triggered = veto;
  const node = makeNode({
    id: 'BLDC.P016.faultToOffUs', title: '保护链 Fault-to-Off 总时间',
    formula: 't_fault→off=t_sense+t_comp+t_filter+t_driver+t_gate+t_fall',
    standardRef: '实际器件 SOA / 保护链实测时序，以项目器件与标定为准',
    inputs: [traceInput('senseDelayNs', '电流检测延迟', input.quantities.senseDelayNs), traceInput('comparatorDelayNs', '比较器响应延迟', input.quantities.comparatorDelayNs), traceInput('digitalFilterDelayNs', '数字滤波延迟', input.quantities.digitalFilterDelayNs), traceInput('driverPropDelayNs', '预驱传播延迟', input.quantities.driverPropDelayNs), traceInput('gateTurnOffDelayNs', '门极关断延迟', input.quantities.gateTurnOffDelayNs), traceInput('currentFallDelayNs', '电流衰减延迟', input.quantities.currentFallDelayNs), traceInput('soaShortCircuitTimeUs', 'SOA 时间边界', input.quantities.soaShortCircuitTimeUs)],
    verdict: veto ? 'FAIL' : margin.verdict === 'WARN' ? 'WARN' : 'PASS',
  });
  return finalizePattern({
    id: 'BLDC.P016', name: '过流/短路保护响应时间 ↔ SOA', kind: 'FAILURE_MODE', triggered, veto: { triggered: veto, ...(veto ? { reason: '保护链总延迟达到/超过 SOA 时间边界' } : {}) },
    values: [{ key: 'faultToOffUs', label: 'Fault-to-Off 总时间', value: dq(calc.value.faultToOffUs, 'µs'), margin }], trace: [node], measures: [BLDC_CONTENT.measures.scProtection(), BLDC_CONTENT.measures.scContainment()], verification: [BLDC_CONTENT.verification.shortCircuit], unknowns: [],
  }, veto ? 'Critical' : (triggered ? 'High' : 'Low'));
}
