import type { PatternOutput, Quantity } from '../../model/contracts.ts';
import type { BldcEvaluationInput } from '../../derive/bldc.ts';
import { value, missingFor } from '../../derive/bldc.ts';
import { calculateThermalCascade } from '../../physics/thermal.ts';
import { patternStateFromPhysics } from '../../physics/result.ts';
import { makeNode, makeMargin, traceInput, ok } from '../../trace/trace.ts';
import { finalizePattern } from '../finalize.ts';
import { BLDC_CONTENT } from '../../../content/bldc.ts';

const REQUIRED = ['ambientC', 'currentRmsA', 'rdsOnMilliOhm', 'rdsOnTempCoeff', 'rthJaCPerW', 'tjMaxC'] as const;
const dq = (v: number, unit: string): Quantity => ok(v, unit, 'DERIVED', 'core/physics/thermal');

export function evaluateP006(input: BldcEvaluationInput): PatternOutput {
  const unknowns = missingFor(input, REQUIRED);
  if (unknowns.length) return finalizePattern({
    id: 'BLDC.P006', name: '热-电级联：导通损耗 → 结温', kind: 'FAILURE_MODE', triggered: 'insufficient_input', veto: { triggered: false }, values: [], trace: [],
    measures: [BLDC_CONTENT.measures.thermalPath(), BLDC_CONTENT.measures.thermalContainment()], verification: [BLDC_CONTENT.verification.thermal], unknowns,
  }, 'Unknown');
  const calc = calculateThermalCascade({
    baseTemperatureC: input.quantities.ambientC,
    currentRmsA: input.quantities.currentRmsA,
    rdsOn25MilliOhm: input.quantities.rdsOnMilliOhm,
    rthCPerW: input.quantities.rthJaCPerW,
    alphaPerC: input.quantities.rdsOnTempCoeff,
    tjMaxC: input.quantities.tjMaxC,
  });
  // 只有“当前热模型有效域内不存在稳态根”才会进入 diverged；它是物理结论，不能当成缺输入。
  if (calc.status !== 'ok') {
    const failure = patternStateFromPhysics(calc);
    if (calc.status === 'diverged') {
      const node = makeNode({
        id: 'BLDC.P006.thermalRunaway', title: '热-电稳态存在性判定',
        formula: 'g(T)=Tbase+P(T)·Rθ−T；有效温度域内无低温稳态根 ⇒ 热失控判据',
        standardRef: '以实际 datasheet 与热设计条件复核；本节点只说明当前模型下不存在稳态解',
        inputs: [traceInput('ambientC', '基准温度', input.quantities.ambientC), traceInput('currentRmsA', 'RMS 电流', input.quantities.currentRmsA), traceInput('rdsOnMilliOhm', '25°C Rds(on)', input.quantities.rdsOnMilliOhm), traceInput('rdsOnTempCoeff', 'Rds 温度系数', input.quantities.rdsOnTempCoeff), traceInput('rthJaCPerW', '结到环境热阻', input.quantities.rthJaCPerW), traceInput('tjMaxC', '最大结温', input.quantities.tjMaxC)],
        verdict: 'FAIL',
      });
      return finalizePattern({ id: 'BLDC.P006', name: '热-电级联：导通损耗 → 结温', kind: 'FAILURE_MODE', ...failure, values: [], trace: [node], measures: [BLDC_CONTENT.measures.thermalPath(), BLDC_CONTENT.measures.thermalContainment()], verification: [BLDC_CONTENT.verification.thermal] }, failure.riskLevel);
    }
    return finalizePattern({ id: 'BLDC.P006', name: '热-电级联：导通损耗 → 结温', kind: 'FAILURE_MODE', ...failure, values: [], trace: [], measures: [BLDC_CONTENT.measures.thermalPath(), BLDC_CONTENT.measures.thermalContainment()], verification: [BLDC_CONTENT.verification.thermal] }, failure.riskLevel);
  }
  const tjMax = value(input, 'tjMaxC')!; const margin = makeMargin(tjMax, calc.value.estimatedTjC, '°C', 'MAX');
  const veto = calc.value.estimatedTjC >= tjMax; const triggered = veto;
  const node = makeNode({
    id: 'BLDC.P006.estimatedTjC', title: '热-电自洽结温迭代',
    formula: 'Rds(Tj)=Rds25·(1+α(Tj−25))^1.8；P=I²·Rds(Tj)；Tj=Tbase+P·Rθ；迭代至收敛',
    standardRef: '器件最大结温与热阻以实际 datasheet / 热设计条件为准',
    inputs: [traceInput('ambientC', '基准温度', input.quantities.ambientC), traceInput('currentRmsA', 'RMS 电流', input.quantities.currentRmsA), traceInput('rdsOnMilliOhm', '25°C Rds(on)', input.quantities.rdsOnMilliOhm), traceInput('rdsOnTempCoeff', 'Rds 温度系数', input.quantities.rdsOnTempCoeff), traceInput('rthJaCPerW', '结到环境热阻', input.quantities.rthJaCPerW), traceInput('tjMaxC', '最大结温', input.quantities.tjMaxC)],
    verdict: veto ? 'FAIL' : margin.verdict === 'WARN' ? 'WARN' : 'PASS',
  });
  return finalizePattern({
    id: 'BLDC.P006', name: '热-电级联：导通损耗 → 结温', kind: 'FAILURE_MODE', triggered, veto: { triggered: veto, ...(veto ? { reason: '计算结温达到/超过最大结温边界' } : {}) },
    values: [{ key: 'estimatedTjC', label: '计算结温', value: dq(calc.value.estimatedTjC, '°C'), margin }], trace: [node], measures: [BLDC_CONTENT.measures.thermalPath(), BLDC_CONTENT.measures.thermalContainment()], verification: [BLDC_CONTENT.verification.thermal], unknowns: [],
  }, veto ? 'Critical' : (triggered ? 'High' : 'Low'));
}
