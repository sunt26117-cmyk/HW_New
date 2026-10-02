import type { EvidenceKind, EngineeringProject, Quantity } from '../core/model/contracts.ts';

const q = (value: number, unit: string, evidence: EvidenceKind): Quantity => ({ status: 'ok', value, unit, evidence, enteredAt: 'fixture' });
const m = (unit: string, need: string): Quantity => ({ status: 'missing', unit, need });

const base: Record<string, Quantity> = {
  bciFrequencyStartMhz: q(1, 'MHz', 'IMPORTED'),
  bciFrequencyStopMhz: q(400, 'MHz', 'IMPORTED'),
  bciInjectionMa: q(100, 'mA', 'MEASURED'),
  harnessLengthM: q(1.5, 'm', 'MEASURED'),
  bciTestResultFlag: q(0, '0/1', 'MEASURED'),
};

export const EMC_BCI_MISSING: EngineeringProject = { meta: { projectId: 'fixture-emc-missing', projectName: 'EMC BCI evidence missing', domain: 'EMC', phase: 'EVT', at: 'fixture' }, issue: { title: 'BCI 测试证据不完整', phenomenon: '', requirement: '', testCondition: '', quantities: { ...base, bciInjectionMa: m('mA', '需要实际 BCI 注入电流'), bciSensitiveFreqMhz: m('MHz', '需要敏感频点'), bciTestResultFlag: m('0/1', '需要明确记录功能失效观察结果') } } };
export const EMC_BCI_PASS: EngineeringProject = { meta: { projectId: 'fixture-emc-pass', projectName: 'EMC BCI complete', domain: 'EMC', phase: 'EVT', at: 'fixture' }, issue: { title: 'BCI 试验完成且功能保持', phenomenon: '', requirement: '', testCondition: '', quantities: { ...base, bciSensitiveFreqMhz: q(90, 'MHz', 'IMPORTED') } } };
export const EMC_BCI_FAIL: EngineeringProject = { meta: { projectId: 'fixture-emc-fail', projectName: 'EMC BCI functional anomaly', domain: 'EMC', phase: 'EVT', at: 'fixture' }, issue: { title: 'BCI 注入时出现可重复功能异常', phenomenon: '', requirement: '', testCondition: '', quantities: { ...base, bciInjectionMa: q(160, 'mA', 'MEASURED'), bciSensitiveFreqMhz: q(72, 'MHz', 'MEASURED'), bciTestResultFlag: q(1, '0/1', 'MEASURED'), currentSenseErrorPct: q(6, '%', 'MEASURED'), recoveryTimeMs: q(12, 'ms', 'MEASURED'), bciNodeVoltageV: q(0.8, 'V', 'MEASURED'), commonModeCurrentMa: q(90, 'mA', 'MEASURED') } } };
