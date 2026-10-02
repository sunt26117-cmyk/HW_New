import type { PatternOutput } from '../../model/contracts.ts';
import type { EmcEvaluationInput } from '../../derive/emc.ts';
import { missingFor, value } from '../../derive/emc.ts';
import { makeNode, traceInput } from '../../trace/trace.ts';
import { finalizePattern } from '../finalize.ts';
import { EMC_CONTENT } from '../../../content/emc.ts';

const REQUIRED = ['bciFrequencyStartMhz', 'bciFrequencyStopMhz', 'bciInjectionMa', 'harnessLengthM'] as const;

export function evaluateEmcC001(input: EmcEvaluationInput): PatternOutput {
  const unknowns = missingFor(input, REQUIRED);
  if (unknowns.length) return finalizePattern({
    id: 'EMC.C001', name: 'BCI 试验可追溯性检查', kind: 'CHECKLIST', triggered: 'insufficient_input', veto: { triggered: false }, values: [], trace: [],
    measures: [EMC_CONTENT.measures.testContainment()], verification: [EMC_CONTENT.verification.bci], unknowns,
  }, 'Unknown');
  const start = value(input, 'bciFrequencyStartMhz');
  const stop = value(input, 'bciFrequencyStopMhz');
  const inj = value(input, 'bciInjectionMa');
  const harness = value(input, 'harnessLengthM');
  const valid = [start, stop, inj, harness].every(Number.isFinite) && start >= 0 && stop > start && inj > 0 && harness > 0;
  const node = makeNode({
    id: 'EMC.C001.bciCoverage', title: 'BCI 试验覆盖条件完整性',
    formula: '频率范围、注入电流与实际线束配置必须形成同一条证据记录；本检查不替代项目标准放行判据',
    standardRef: '项目 EMC/BCI 试验计划与实际夹具配置',
    inputs: [traceInput('bciFrequencyStartMhz', '起始频率', input.quantities.bciFrequencyStartMhz), traceInput('bciFrequencyStopMhz', '终止频率', input.quantities.bciFrequencyStopMhz), traceInput('bciInjectionMa', '注入电流', input.quantities.bciInjectionMa), traceInput('harnessLengthM', '线束长度', input.quantities.harnessLengthM)],
    verdict: valid ? 'PASS' : 'WARN',
  });
  if (!valid) return finalizePattern({
    id: 'EMC.C001', name: 'BCI 试验可追溯性检查', kind: 'CHECKLIST', triggered: 'insufficient_input', veto: { triggered: false }, values: [], trace: [node],
    measures: [EMC_CONTENT.measures.testContainment()], verification: [EMC_CONTENT.verification.bci], unknowns: [EMC_CONTENT.validation.c001Invalid],
  }, 'Unknown');
  return finalizePattern({
    id: 'EMC.C001', name: 'BCI 试验可追溯性检查', kind: 'CHECKLIST', triggered: false, veto: { triggered: false },
    values: [
      { key: 'bciFrequencyStartMhz', label: '扫频起点', value: input.quantities.bciFrequencyStartMhz },
      { key: 'bciFrequencyStopMhz', label: '扫频终点', value: input.quantities.bciFrequencyStopMhz },
      { key: 'bciInjectionMa', label: '代表性注入电流', value: input.quantities.bciInjectionMa },
      { key: 'harnessLengthM', label: '线束长度', value: input.quantities.harnessLengthM },
    ], trace: [node], measures: [EMC_CONTENT.measures.testContainment()], verification: [EMC_CONTENT.verification.bci], unknowns: [],
  }, 'Low');
}
