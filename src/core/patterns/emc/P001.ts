import type { PatternOutput } from '../../model/contracts.ts';
import type { EmcEvaluationInput } from '../../derive/emc.ts';
import { value, missingFor } from '../../derive/emc.ts';
import { makeNode, traceInput } from '../../trace/trace.ts';
import { finalizePattern } from '../finalize.ts';
import { EMC_CONTENT } from '../../../content/emc.ts';

const REQUIRED = ['bciInjectionMa', 'bciSensitiveFreqMhz', 'bciTestResultFlag'] as const;

export function evaluateEmcP001(input: EmcEvaluationInput): PatternOutput {
  const unknowns = missingFor(input, REQUIRED);
  if (unknowns.length) return finalizePattern({
    id: 'EMC.P001', name: 'BCI 功能抗扰异常', kind: 'FAILURE_MODE', triggered: 'insufficient_input',
    veto: { triggered: false }, values: [], trace: [], measures: [EMC_CONTENT.measures.pathIsolation(), EMC_CONTENT.measures.testContainment()],
    verification: [EMC_CONTENT.verification.bci, EMC_CONTENT.verification.path], unknowns,
  }, 'Unknown');

  const injection = value(input, 'bciInjectionMa')!;
  const freq = value(input, 'bciSensitiveFreqMhz')!;
  const resultFlag = value(input, 'bciTestResultFlag')!;
  if (!(Number.isFinite(injection) && injection > 0 && Number.isFinite(freq) && freq >= 0 && (resultFlag === 0 || resultFlag === 1))) {
    return finalizePattern({
      id: 'EMC.P001', name: 'BCI 功能抗扰异常', kind: 'FAILURE_MODE', triggered: 'insufficient_input',
      veto: { triggered: false }, values: [], trace: [], measures: [EMC_CONTENT.measures.pathIsolation(), EMC_CONTENT.measures.testContainment()],
      verification: [EMC_CONTENT.verification.bci, EMC_CONTENT.verification.path], unknowns: [EMC_CONTENT.validation.p001Invalid],
    }, 'Unknown');
  }

  const failed = resultFlag === 1;
  const node = makeNode({
    id: 'EMC.P001.bciFunctionGate',
    title: 'BCI 注入 → 功能状态门禁',
    formula: '功能状态是抗扰判定门禁；注入电流、敏感频点与异常证据只用于描述当前试验事实，不在本 Pattern 中虚构标准限值',
    standardRef: '放行等级与检波/功能判据由项目 EMC 规范确认',
    inputs: [traceInput('bciInjectionMa', 'BCI 注入电流', input.quantities.bciInjectionMa), traceInput('bciSensitiveFreqMhz', '敏感频点', input.quantities.bciSensitiveFreqMhz), traceInput('bciTestResultFlag', '功能失效观察', input.quantities.bciTestResultFlag)],
    verdict: failed ? 'FAIL' : 'PASS',
  });

  const values = [
    { key: 'bciInjectionMa', label: 'BCI 注入电流', value: input.quantities.bciInjectionMa },
    { key: 'bciSensitiveFreqMhz', label: '敏感频点', value: input.quantities.bciSensitiveFreqMhz },
    { key: 'bciTestResultFlag', label: '功能失效观察', value: input.quantities.bciTestResultFlag },
  ];
  return finalizePattern({
    id: 'EMC.P001', name: 'BCI 功能抗扰异常', kind: 'FAILURE_MODE', triggered: failed, riskLevel: failed ? 'High' : 'Low',
    veto: { triggered: false }, values, trace: [node], measures: failed ? [EMC_CONTENT.measures.pathIsolation(), EMC_CONTENT.measures.testContainment()] : [EMC_CONTENT.measures.pathIsolation()],
    verification: [EMC_CONTENT.verification.bci, EMC_CONTENT.verification.path], unknowns: [],
  }, failed ? 'High' : 'Low');
}
