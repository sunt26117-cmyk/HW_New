import { BLDC_FIELDS, type BldcKey } from '../core/derive/bldc.ts';
import { unitForBldcKey } from '../core/derive/bldc.ts';

export type InputGroup = { id: string; title: string; fields: Array<{ key: BldcKey; label: string; unit: string; requiredBy: string[] }> };

export const INPUT_GROUPS: InputGroup[] = [
  { id: 'P001', title: '母线泵升', fields: BLDC_FIELDS.filter((f) => f.requiredBy.includes('P001') || f.key === 'vbusMeasuredPeakV').map((f) => ({ ...f, unit: unitForBldcKey(f.key) })) },
  { id: 'P003', title: '米勒误导通', fields: BLDC_FIELDS.filter((f) => f.requiredBy.includes('P003') || ['gateSpikeMeasuredV', 'cgsPf', 'sourceInductanceNh', 'diDtANs'].includes(f.key)).map((f) => ({ ...f, unit: unitForBldcKey(f.key) })) },
  { id: 'P006', title: '热-电级联', fields: BLDC_FIELDS.filter((f) => f.requiredBy.includes('P006')).map((f) => ({ ...f, unit: unitForBldcKey(f.key) })) },
  { id: 'P016', title: '保护链 ↔ SOA', fields: BLDC_FIELDS.filter((f) => f.requiredBy.includes('P016')).map((f) => ({ ...f, unit: unitForBldcKey(f.key) })) },
];
