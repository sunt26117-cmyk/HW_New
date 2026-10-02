import type { AnalysisResult, EngineeringProject } from '../core/model/contracts.ts';

export interface AnalysisSnapshot {
  analysisId: string;
  savedAt: string;
  project: EngineeringProject;
  result: AnalysisResult;
}

export interface AnalysisDiff {
  analysisA: string;
  analysisB: string;
  changedInputs: string[];
  changedPatterns: string[];
  changedOptions: string[];
  vetoChanges: string[];
}

const KEY = 'autohw-core.analysis-versions.v1';

function read(): AnalysisSnapshot[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed as AnalysisSnapshot[] : [];
  } catch { return []; }
}

function write(items: AnalysisSnapshot[]) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(KEY, JSON.stringify(items));
}

export function saveAnalysisVersion(project: EngineeringProject, result: AnalysisResult): AnalysisSnapshot {
  const snapshot: AnalysisSnapshot = { analysisId: result.meta.analysisId, savedAt: new Date().toISOString(), project, result };
  const next = [snapshot, ...read().filter((item) => item.analysisId !== snapshot.analysisId)];
  write(next.slice(0, 50));
  return snapshot;
}

export function listAnalysisVersions(): AnalysisSnapshot[] { return read(); }

export function clearAnalysisVersions(): void { if (typeof window !== 'undefined') window.localStorage.removeItem(KEY); }

function qtySignature(value: unknown): string {
  const q = value as any;
  if (!q || typeof q !== 'object') return 'missing-object';
  return q.status === 'ok' ? `ok|${q.value}|${q.unit}|${q.evidence}|${q.sourceLabel ?? ''}` : `missing|${q.unit}|${q.need}`;
}

export function diffAnalysis(a: AnalysisSnapshot, b: AnalysisSnapshot): AnalysisDiff {
  const changedInputs: string[] = [];
  const keys = [...new Set([...Object.keys(a.project.issue.quantities), ...Object.keys(b.project.issue.quantities)])].sort();
  for (const key of keys) {
    if (qtySignature(a.project.issue.quantities[key]) !== qtySignature(b.project.issue.quantities[key])) changedInputs.push(key);
  }

  const changedPatterns: string[] = [];
  const aPatterns = new Map(a.result.judgment.patterns.map((p) => [p.id, p]));
  const bPatterns = new Map(b.result.judgment.patterns.map((p) => [p.id, p]));
  for (const id of [...new Set([...aPatterns.keys(), ...bPatterns.keys()])].sort()) {
    const x=aPatterns.get(id), y=bPatterns.get(id);
    const sx=x ? `${x.triggered}|${x.riskLevel}|${x.veto.triggered}` : 'absent';
    const sy=y ? `${y.triggered}|${y.riskLevel}|${y.veto.triggered}` : 'absent';
    if(sx!==sy) changedPatterns.push(id);
  }

  const changedOptions: string[] = [];
  const aOptions = new Map(a.result.action.options.map((o) => [o.id,o]));
  const bOptions = new Map(b.result.action.options.map((o) => [o.id,o]));
  for (const id of [...new Set([...aOptions.keys(), ...bOptions.keys()])].sort()) {
    const x=aOptions.get(id), y=bOptions.get(id);
    const sx=x ? `${x.scores.total}|${x.veto.triggered}|${x.tier}` : 'absent';
    const sy=y ? `${y.scores.total}|${y.veto.triggered}|${y.tier}` : 'absent';
    if(sx!==sy) changedOptions.push(id);
  }

  const vetoChanges: string[] = [];
  const av=a.result.judgment.vetoes.map((v)=>`${v.patternId}|${v.reason??''}`).sort().join(';;');
  const bv=b.result.judgment.vetoes.map((v)=>`${v.patternId}|${v.reason??''}`).sort().join(';;');
  if(av!==bv) vetoChanges.push(`VETO: ${av || 'none'} → ${bv || 'none'}`);

  return { analysisA:a.analysisId, analysisB:b.analysisId, changedInputs, changedPatterns, changedOptions, vetoChanges };
}
