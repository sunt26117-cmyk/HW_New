import type { IssueInput, Quantity } from '../model/contracts.ts';
import { missing, numberOf } from '../trace/trace.ts';

export type EmcKey =
  | 'bciInjectionMa'
  | 'bciSensitiveFreqMhz'
  | 'currentSenseErrorPct'
  | 'recoveryTimeMs'
  | 'harnessLengthM'
  | 'bciNodeVoltageV'
  | 'commonModeCurrentMa'
  | 'bciTestResultFlag'
  | 'bciFrequencyStartMhz'
  | 'bciFrequencyStopMhz';

const UNITS: Record<EmcKey, string> = {
  bciInjectionMa: 'mA',
  bciSensitiveFreqMhz: 'MHz',
  currentSenseErrorPct: '%',
  recoveryTimeMs: 'ms',
  harnessLengthM: 'm',
  bciNodeVoltageV: 'V',
  commonModeCurrentMa: 'mA',
  bciTestResultFlag: '0/1',
  bciFrequencyStartMhz: 'MHz',
  bciFrequencyStopMhz: 'MHz',
};

export interface EmcFieldDefinition {
  key: EmcKey;
  label: string;
  requiredBy: string[];
  description?: string;
}

export const EMC_FIELDS: readonly EmcFieldDefinition[] = [
  { key: 'bciFrequencyStartMhz', label: 'BCI 扫频起始频率', requiredBy: ['EMC.C001'], description: '本次实际试验覆盖的起始频率。' },
  { key: 'bciFrequencyStopMhz', label: 'BCI 扫频终止频率', requiredBy: ['EMC.C001'], description: '本次实际试验覆盖的终止频率。' },
  { key: 'bciInjectionMa', label: 'BCI 注入电流', requiredBy: ['EMC.C001', 'EMC.P001'], description: '异常点或代表性试验点的实际注入电流。' },
  { key: 'bciSensitiveFreqMhz', label: 'BCI 敏感频点', requiredBy: ['EMC.P001'], description: '出现功能异常/明显受扰的频点；无异常可保持 missing。' },
  { key: 'bciTestResultFlag', label: 'BCI 功能失效观察', requiredBy: ['EMC.P001'], description: '记录本次观察窗口是否发现定义的功能失效。' },
  { key: 'harnessLengthM', label: 'BCI 实际线束长度', requiredBy: ['EMC.C001'], description: '本次夹具/线束配置的实际长度。' },
  { key: 'currentSenseErrorPct', label: '电流采样误差变化', requiredBy: [], description: 'BCI 前后关键采样误差变化，用于定位受扰链路。' },
  { key: 'recoveryTimeMs', label: '撤除注入后的恢复时间', requiredBy: [], description: '用于功能异常后的恢复闭环。' },
  { key: 'bciNodeVoltageV', label: '受扰节点电压', requiredBy: [], description: '敏感节点在注入期间的实测扰动幅值。' },
  { key: 'commonModeCurrentMa', label: '共模电流', requiredBy: [], description: '用于源→路径→受扰体的耦合定位。' },
];

export const EMC_FIELD_CATALOG = EMC_FIELDS;

export interface EmcEvaluationInput { quantities: Record<EmcKey, Quantity>; }

export function deriveEmcEvaluationInput(issue: IssueInput): EmcEvaluationInput {
  const quantities = {} as Record<EmcKey, Quantity>;
  for (const field of EMC_FIELD_CATALOG) quantities[field.key] = issue.quantities[field.key] ?? missing(UNITS[field.key], `需要提供：${field.label}`);
  return { quantities };
}

export function value(input: EmcEvaluationInput, key: EmcKey): number | undefined {
  return numberOf(input.quantities[key]);
}

export function missingFor(input: EmcEvaluationInput, keys: readonly EmcKey[]): string[] {
  return keys.filter((k) => input.quantities[k]?.status !== 'ok')
    .map((k) => `${k}：${input.quantities[k]?.status === 'missing' ? input.quantities[k]?.need : '缺失'}`);
}

export function unitForEmcKey(key: EmcKey): string { return UNITS[key]; }
