import type { EngineeringProject, EvidenceKind } from '../model/contracts.ts';
import type { ScopeMeasurementResult, WaveformMetrics } from './waveform.ts';

export interface WaveformBackfillCandidate {
  key: string;
  label: string;
  unit: string;
  value?: number;
  evidence: EvidenceKind;
  sourceLabel: string;
  evidenceId: string;
  confidencePct?: number;
  action: 'APPLY' | 'PROTECTED' | 'SKIP_NON_FINITE' | 'SKIP_NON_CANONICAL';
  reason: string;
}

export interface WaveformBackfillPlan {
  candidates: WaveformBackfillCandidate[];
  apply: Record<string, number>;
  provenance: ScopeMeasurementResult['provenance'];
  protectedKeys: string[];
  warnings: string[];
}

const PRIORITY: Record<EvidenceKind, number> = {
  MEASURED: 6,
  IMPORTED: 5,
  DATASHEET: 4,
  DERIVED: 3,
  TEXT_INFERRED: 2,
  ASSUMED: 1,
};

const LABELS: Record<string, { label: string; unit: string; canonical: boolean }> = {
  vbusMeasuredPeakV: { label: '台架实测母线峰值', unit: 'V', canonical: true },
  vbusNominalV: { label: '母线标称电压（触发前基线）', unit: 'V', canonical: true },
  gateSpikeMeasuredV: { label: 'Vgs 实测峰值', unit: 'V', canonical: true },
  vdsPeakV: { label: 'Vds 实测峰值', unit: 'V', canonical: false },
  dvDtVns: { label: '开关节点 dv/dt', unit: 'V/ns', canonical: true },
};

function finite(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function currentEvidence(project: EngineeringProject, key: string): EvidenceKind | undefined {
  const value = project.issue.quantities[key];
  return value?.status === 'ok' ? value.evidence : undefined;
}

export function buildWaveformBackfillPlan(
  project: EngineeringProject,
  measurements: ScopeMeasurementResult,
): WaveformBackfillPlan {
  const candidates: WaveformBackfillCandidate[] = [];
  const apply: Record<string, number> = {};
  const provenance: ScopeMeasurementResult['provenance'] = {};
  const protectedKeys: string[] = [];
  const warnings = [...measurements.warnings];

  for (const [key, raw] of Object.entries(measurements.values)) {
    if (!LABELS[key]) continue;
    const meta = measurements.provenance[key];
    if (!LABELS[key].canonical) {
      candidates.push({
        key, label: LABELS[key].label, unit: LABELS[key].unit, ...(finite(raw) ? { value: raw } : {}),
        evidence: 'IMPORTED', sourceLabel: meta?.sourceLabel || 'scope import', evidenceId: meta?.evidenceId || '',
        ...(meta?.confidencePct !== undefined ? { confidencePct: meta.confidencePct } : {}), action: 'SKIP_NON_CANONICAL',
        reason: '该波形指标尚未进入 canonical 工程输入；只保存/展示证据，不静默新增字段。',
      });
      continue;
    }
    if (!meta || !finite(raw) || meta.source !== 'IMPORTED') {
      candidates.push({
        key,
        label: LABELS[key].label,
        unit: LABELS[key].unit,
        ...(finite(raw) ? { value: raw } : {}),
        evidence: 'IMPORTED',
        sourceLabel: meta?.sourceLabel || 'scope import',
        evidenceId: meta?.evidenceId || '',
        ...(meta?.confidencePct !== undefined ? { confidencePct: meta.confidencePct } : {}),
        action: 'SKIP_NON_FINITE',
        reason: '导入指标不是有限数值，禁止进入工程输入。',
      });
      continue;
    }

    const existing = currentEvidence(project, key);
    const incomingPriority = PRIORITY.IMPORTED;
    const action: WaveformBackfillCandidate['action'] =
      existing === undefined || incomingPriority >= PRIORITY[existing] ? 'APPLY' : 'PROTECTED';
    const reason = existing === undefined
      ? '当前字段缺失，导入实测证据。'
      : existing === 'MEASURED'
        ? '已有实测值；默认保护，需工程师明确允许覆盖。'
        : `新的 IMPORTED 证据等级高于当前 ${existing}，允许提升证据等级。`;

    candidates.push({
      key,
      label: LABELS[key].label,
      unit: LABELS[key].unit,
      value: raw,
      evidence: 'IMPORTED',
      sourceLabel: meta.sourceLabel || 'scope import',
      evidenceId: meta.evidenceId,
      ...(meta.confidencePct !== undefined ? { confidencePct: meta.confidencePct } : {}),
      action,
      reason,
    });
    if (action === 'APPLY') {
      apply[key] = raw;
      provenance[key] = meta;
    } else if (action === 'PROTECTED') {
      protectedKeys.push(key);
    }
  }

  if (measurements.values.vdsPeakV !== undefined) {
    warnings.push('Vds 峰值仅作为独立波形证据展示；当前 canonical 工程输入未定义 vdsPeakV，因此不会写入 AnalysisResult。');
  }

  return { candidates, apply, provenance, protectedKeys, warnings };
}

export function allowMeasuredOverwrite(
  project: EngineeringProject,
  plan: WaveformBackfillPlan,
): WaveformBackfillPlan {
  const next: WaveformBackfillPlan = { ...plan, apply: { ...plan.apply }, provenance: { ...plan.provenance }, protectedKeys: [], candidates: plan.candidates.map((candidate) => ({ ...candidate })) };
  for (const candidate of next.candidates) {
    if (candidate.action !== 'PROTECTED') continue;
    const existing = project.issue.quantities[candidate.key];
    if (existing?.status !== 'ok' || existing.evidence !== 'MEASURED') continue;
    if (!finite(candidate.value) || !candidate.evidenceId) continue;
    next.apply[candidate.key] = candidate.value;
    next.provenance[candidate.key] = {
      source: 'IMPORTED',
      sourceLabel: candidate.sourceLabel,
      enteredAt: new Date().toISOString(),
      evidenceId: candidate.evidenceId,
      ...(candidate.confidencePct !== undefined ? { confidencePct: candidate.confidencePct } : {}),
      note: '工程师明确允许新示波器证据覆盖旧实测值。',
    };
    candidate.action = 'APPLY';
    candidate.reason = '工程师明确允许覆盖旧 MEASURED 值。';
  }
  return next;
}

// 保留指标类型引用，避免未来修改时把“波形指标”与“工程回填”分离成两套定义。
export type BackfillMetric = WaveformMetrics;
