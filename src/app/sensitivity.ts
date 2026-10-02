import type { AnalysisResult, EngineeringProject, EvidenceKind, Quantity } from '../core/model/contracts.ts';
import { analyze } from './analyze.ts';

type BldcSensitivityKey =
  | 'currentRmsA' | 'rthJaCPerW' | 'rdsOnMilliOhm'
  | 'rpm' | 'rotorInertiaKgM2' | 'cbusUf' | 'regenEfficiency'
  | 'dvDtVns' | 'cgdPf' | 'rgOffOhm' | 'vthMinV' | 'sourceInductanceNh' | 'diDtANs';

type SensitivityTarget = 'BLDC.P006' | 'BLDC.P001' | 'BLDC.P003';

export interface SensitivityCandidate {
  key: BldcSensitivityKey;
  label: string;
  unit: string;
  targetPatternId: SensitivityTarget;
}

export interface SensitivityRow {
  key: BldcSensitivityKey;
  label: string;
  unit: string;
  evidence: EvidenceKind;
  baselineInput: number;
  lowInput: number;
  highInput: number;
  targetPatternId: SensitivityTarget;
  metricLabel: string;
  baselineMetric: number;
  lowMetric: number;
  highMetric: number;
  lowDelta: number;
  highDelta: number;
  normalizedImpactPct: number;
  measurementPriorityPct: number;
}

export interface SensitivitySkipped {
  key: BldcSensitivityKey;
  label: string;
  reason: string;
}

export interface SensitivityReport {
  percent: number;
  baselineAnalysisId: string;
  rows: SensitivityRow[];
  skipped: SensitivitySkipped[];
}

export const BLDC_SENSITIVITY_CANDIDATES: readonly SensitivityCandidate[] = [
  { key: 'currentRmsA', label: 'RMS 电流', unit: 'A', targetPatternId: 'BLDC.P006' },
  { key: 'rthJaCPerW', label: '结到环境热阻', unit: '°C/W', targetPatternId: 'BLDC.P006' },
  { key: 'rdsOnMilliOhm', label: '25°C Rds(on)', unit: 'mΩ', targetPatternId: 'BLDC.P006' },
  { key: 'rpm', label: '转速', unit: 'rpm', targetPatternId: 'BLDC.P001' },
  { key: 'rotorInertiaKgM2', label: '转子等效惯量', unit: 'kg·m²', targetPatternId: 'BLDC.P001' },
  { key: 'cbusUf', label: '母线电容', unit: 'µF', targetPatternId: 'BLDC.P001' },
  { key: 'regenEfficiency', label: '再生效率', unit: 'ratio', targetPatternId: 'BLDC.P001' },
  { key: 'dvDtVns', label: '开关节点 dv/dt', unit: 'V/ns', targetPatternId: 'BLDC.P003' },
  { key: 'cgdPf', label: 'Cgd / Crss 取点值', unit: 'pF', targetPatternId: 'BLDC.P003' },
  { key: 'rgOffOhm', label: '关断下拉电阻总量', unit: 'Ω', targetPatternId: 'BLDC.P003' },
  { key: 'vthMinV', label: 'MOSFET 最低 Vth', unit: 'V', targetPatternId: 'BLDC.P003' },
  { key: 'sourceInductanceNh', label: '源极寄生电感', unit: 'nH', targetPatternId: 'BLDC.P003' },
  { key: 'diDtANs', label: '关断 di/dt', unit: 'A/ns', targetPatternId: 'BLDC.P003' },
];

function quantity(project: EngineeringProject, key: BldcSensitivityKey): Quantity | undefined {
  return project.issue.quantities[key];
}

function withValue(project: EngineeringProject, key: BldcSensitivityKey, value: number): EngineeringProject {
  const q = quantity(project, key);
  if (!q || q.status !== 'ok') throw new Error(`Sensitivity input is not available: ${key}`);
  return {
    ...project,
    issue: {
      ...project.issue,
      quantities: {
        ...project.issue.quantities,
        [key]: { ...q, value },
      },
    },
  };
}

function metric(result: AnalysisResult, patternId: SensitivityTarget): { label: string; value: number; scale: number } | undefined {
  const pattern = result.judgment.patterns.find((p) => p.id === patternId);
  if (!pattern || pattern.triggered === 'insufficient_input' || pattern.values.length === 0) return undefined;
  const first = pattern.values[0];
  if (first.value.status !== 'ok') return undefined;
  if (patternId === 'BLDC.P003' && first.margin) {
    const margin = first.margin.limit - first.margin.actual;
    return { label: '米勒裕量', value: margin, scale: Math.max(Math.abs(first.margin.limit), 1) };
  }
  const scale = first.margin ? Math.max(Math.abs(first.margin.limit), 1) : Math.max(Math.abs(first.value.value), 1);
  return { label: first.label, value: first.value.value, scale };
}

function measurementConfidence(evidence: EvidenceKind): number {
  switch (evidence) {
    case 'MEASURED':
    case 'IMPORTED': return 0;
    case 'DATASHEET': return 0.5;
    case 'DERIVED': return 0.7;
    case 'TEXT_INFERRED': return 0.9;
    case 'ASSUMED': return 1;
  }
}

export function runBldcSensitivity(project: EngineeringProject, percent = 20): SensitivityReport {
  if (project.meta.domain !== 'BLDC') return { percent, baselineAnalysisId: '', rows: [], skipped: [] };
  if (!Number.isFinite(percent) || percent <= 0 || percent >= 100) throw new Error('Sensitivity percent must be within (0, 100).');
  const baseline = analyze(project);
  const rows: SensitivityRow[] = [];
  const skipped: SensitivitySkipped[] = [];
  const lowFactor = 1 - percent / 100;
  const highFactor = 1 + percent / 100;

  for (const candidate of BLDC_SENSITIVITY_CANDIDATES) {
    const q = quantity(project, candidate.key);
    if (!q || q.status !== 'ok') {
      skipped.push({ key: candidate.key, label: candidate.label, reason: '当前工程没有可用于单参扫描的数值证据' });
      continue;
    }
    if (!Number.isFinite(q.value) || q.value <= 0) {
      skipped.push({ key: candidate.key, label: candidate.label, reason: '当前值必须为有限正数，才能进行比例扫描' });
      continue;
    }
    const baseMetric = metric(baseline, candidate.targetPatternId);
    if (!baseMetric) {
      skipped.push({ key: candidate.key, label: candidate.label, reason: `当前 ${candidate.targetPatternId} 没有可比较的确定性输出` });
      continue;
    }
    const low = analyze(withValue(project, candidate.key, q.value * lowFactor));
    const high = analyze(withValue(project, candidate.key, q.value * highFactor));
    const lowMetric = metric(low, candidate.targetPatternId);
    const highMetric = metric(high, candidate.targetPatternId);
    if (!lowMetric || !highMetric) {
      skipped.push({ key: candidate.key, label: candidate.label, reason: `${candidate.targetPatternId} 在扫描端点没有可比较的输出` });
      continue;
    }
    const lowDelta = lowMetric.value - baseMetric.value;
    const highDelta = highMetric.value - baseMetric.value;
    const normalizedImpactPct = Math.max(Math.abs(lowDelta), Math.abs(highDelta)) / baseMetric.scale * 100;
    const measurementPriorityPct = normalizedImpactPct * measurementConfidence(q.evidence);
    rows.push({
      key: candidate.key,
      label: candidate.label,
      unit: candidate.unit,
      evidence: q.evidence,
      baselineInput: q.value,
      lowInput: q.value * lowFactor,
      highInput: q.value * highFactor,
      targetPatternId: candidate.targetPatternId,
      metricLabel: baseMetric.label,
      baselineMetric: baseMetric.value,
      lowMetric: lowMetric.value,
      highMetric: highMetric.value,
      lowDelta,
      highDelta,
      normalizedImpactPct,
      measurementPriorityPct,
    });
  }

  rows.sort((a, b) => b.normalizedImpactPct - a.normalizedImpactPct);
  return { percent, baselineAnalysisId: baseline.meta.analysisId, rows, skipped };
}
