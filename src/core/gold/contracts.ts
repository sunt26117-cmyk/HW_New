import type { EvidenceKind, EngineeringProject } from '../model/contracts.ts';

export interface GoldExpectedValue {
  key: string;
  unit: string;
  expected: number;
  toleranceAbsolute?: number;
  toleranceRelativePct?: number;
  source: EvidenceKind;
  rationale: string;
}

export interface GoldCase {
  id: string;
  name: string;
  domain: 'BLDC' | 'EMC';
  status: 'PENDING_REAL_BENCH_DATA' | 'READY_FOR_VALIDATION';
  description: string;
  project: EngineeringProject;
  measuredEvidenceIds: string[];
  expected: GoldExpectedValue[];
  notes?: string[];
}

export function withinGoldTolerance(actual: number, expected: GoldExpectedValue): boolean {
  if (!Number.isFinite(actual) || !Number.isFinite(expected.expected)) return false;
  const absTol = expected.toleranceAbsolute;
  const relTol = expected.toleranceRelativePct;
  if (absTol !== undefined && Math.abs(actual - expected.expected) <= absTol) return true;
  if (relTol !== undefined && expected.expected !== 0 && Math.abs((actual - expected.expected) / expected.expected) * 100 <= relTol) return true;
  return absTol === undefined && relTol === undefined ? actual === expected.expected : false;
}

export function assertGoldCaseReady(caseDef: GoldCase): void {
  if (caseDef.status !== 'READY_FOR_VALIDATION') throw new Error(`Gold case ${caseDef.id} 尚未有真实台架数据，禁止作为最终公式验收。`);
  if (caseDef.measuredEvidenceIds.length === 0) throw new Error(`Gold case ${caseDef.id} 缺少 measured/imported evidenceId。`);
  for (const expected of caseDef.expected) {
    if (expected.source !== 'MEASURED' && expected.source !== 'IMPORTED') {
      throw new Error(`Gold case ${caseDef.id} 的最终预期值必须绑定实测/导入证据：${expected.key}`);
    }
  }
}
