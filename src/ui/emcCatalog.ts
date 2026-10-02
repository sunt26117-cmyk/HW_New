import { EMC_FIELD_CATALOG, unitForEmcKey, type EmcFieldDefinition, type EmcKey } from '../core/derive/emc.ts';

export type EmcInputGroup = {
  id: string;
  title: string;
  description: string;
  fields: Array<EmcFieldDefinition & { unit: string }>;
};

export const EMC_INPUT_GROUPS: readonly EmcInputGroup[] = [
  { id: 'BCI-TEST', title: 'BCI 试验边界', description: '记录实际扫频范围、注入电流与线束配置；这里是测试证据，不自动填入任何标准限值。', fields: EMC_FIELD_CATALOG.filter((field) => ['bciFrequencyStartMhz','bciFrequencyStopMhz','bciInjectionMa','harnessLengthM'].includes(field.key)).map((field) => ({ ...field, unit: unitForEmcKey(field.key) })) },
  { id: 'BCI-RESULT', title: 'BCI 功能结果', description: '把功能状态、敏感频点以及受扰节点/采样变化作为实测证据绑定到同一工况。', fields: EMC_FIELD_CATALOG.filter((field) => ['bciTestResultFlag','bciSensitiveFreqMhz','currentSenseErrorPct','recoveryTimeMs','bciNodeVoltageV','commonModeCurrentMa'].includes(field.key)).map((field) => ({ ...field, unit: unitForEmcKey(field.key) })) },
];

export const EMC_INPUT_KEYS = new Set<EmcKey>(EMC_FIELD_CATALOG.map((field) => field.key));
