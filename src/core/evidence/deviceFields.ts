import { BLDC_FIELDS, unitForBldcKey, type BldcKey } from '../derive/bldc.ts';
export interface DomainMeasurementField { key: string; label: string; unit: string; }
export function getAllEngineeringMeasurementFields(): DomainMeasurementField[] {
  return BLDC_FIELDS.map((f) => ({ key: f.key, label: f.label, unit: unitForBldcKey(f.key) }));
}
export function getBldcEngineeringFieldKeys(): ReadonlySet<BldcKey> { return new Set(BLDC_FIELDS.map((f) => f.key)); }
