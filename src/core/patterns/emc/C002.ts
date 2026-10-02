import type { PatternOutput } from '../../model/contracts.ts';
import type { EmcEvaluationInput } from '../../derive/emc.ts';
import { missingFor, value } from '../../derive/emc.ts';
import { makeNode, traceInput } from '../../trace/trace.ts';
import { finalizePattern } from '../finalize.ts';
import { EMC_CONTENT } from '../../../content/emc.ts';

const FAILURE_REQUIRED = ['bciTestResultFlag', 'bciNodeVoltageV', 'commonModeCurrentMa', 'currentSenseErrorPct', 'recoveryTimeMs'] as const;

/**
 * BCI 因果链证据完整性检查。
 * 不给 recovery/current error 设通用通过阈值，只要求异常发生时具备可追溯证据。
 */
export function evaluateEmcC002(input: EmcEvaluationInput): PatternOutput {
  const resultFlag = value(input, 'bciTestResultFlag');
  const baseMissing = missingFor(input, ['bciTestResultFlag'] as const);
  if (baseMissing.length) {
    return finalizePattern({
      id: 'EMC.C002', name: 'BCI 异常因果链证据检查', kind: 'CHECKLIST', triggered: 'insufficient_input',
      veto: { triggered: false }, values: [], trace: [], measures: [EMC_CONTENT.measures.testContainment()],
      verification: [EMC_CONTENT.verification.causality], unknowns: baseMissing,
    }, 'Unknown');
  }
  if (resultFlag !== 1) {
    const node = makeNode({
      id: 'EMC.C002.causality', title: 'BCI 未观察到功能失效：因果链不进入失败证据门禁',
      formula: '无功能失效时，不强制虚构“受扰源→路径→受扰体”的失败因果链',
      standardRef: '项目 EMC/BCI 试验记录与功能判据',
      inputs: [traceInput('bciTestResultFlag', '功能失效观察', input.quantities.bciTestResultFlag)],
      verdict: 'PASS',
    });
    return finalizePattern({
      id: 'EMC.C002', name: 'BCI 异常因果链证据检查', kind: 'CHECKLIST', triggered: false,
      veto: { triggered: false }, values: [{ key: 'bciTestResultFlag', label: '功能失效观察', value: input.quantities.bciTestResultFlag }],
      trace: [node], measures: [EMC_CONTENT.measures.pathIsolation()], verification: [EMC_CONTENT.verification.causality], unknowns: [],
    }, 'Low');
  }

  const unknowns = missingFor(input, FAILURE_REQUIRED);
  const values = FAILURE_REQUIRED.filter((key) => input.quantities[key]?.status === 'ok').map((key) => ({
    key, label: key, value: input.quantities[key],
  }));
  const node = makeNode({
    id: 'EMC.C002.causality', title: 'BCI 异常：注入 → 共模路径 → 敏感节点 → 功能后果/恢复',
    formula: '失败证据必须能沿实际试验数据形成同一条因果链；本检查不虚构阈值',
    standardRef: '项目 EMC/BCI 试验记录与功能判据',
    inputs: FAILURE_REQUIRED.filter((key) => input.quantities[key]).map((key) => traceInput(key, key, input.quantities[key])),
    verdict: unknowns.length ? 'WARN' : 'PASS',
  });
  if (unknowns.length) {
    return finalizePattern({
      id: 'EMC.C002', name: 'BCI 异常因果链证据检查', kind: 'CHECKLIST', triggered: 'insufficient_input',
      veto: { triggered: false }, values, trace: [node], measures: [EMC_CONTENT.measures.testContainment(), EMC_CONTENT.measures.pathIsolation()],
      verification: [EMC_CONTENT.verification.causality], unknowns,
    }, 'Unknown');
  }
  return finalizePattern({
    id: 'EMC.C002', name: 'BCI 异常因果链证据检查', kind: 'CHECKLIST', triggered: false,
    veto: { triggered: false }, values, trace: [node], measures: [EMC_CONTENT.measures.pathIsolation()],
    verification: [EMC_CONTENT.verification.causality], unknowns: [],
  }, 'Low');
}
