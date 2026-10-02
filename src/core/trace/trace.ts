import type { EvidenceKind, Margin, Quantity, TraceInput, TraceNode } from '../model/contracts.ts';

const EVIDENCE_PRIORITY: Record<EvidenceKind, number> = {
  MEASURED: 5, IMPORTED: 4, DATASHEET: 3, DERIVED: 2, TEXT_INFERRED: 1, ASSUMED: 0,
};

export function ok(value: number, unit: string, evidence: EvidenceKind, sourceLabel?: string, evidenceId?: string): Quantity {
  if (!Number.isFinite(value)) throw new Error(`Non-finite quantity is not allowed: ${value}`);
  return { status: 'ok', value, unit, evidence, sourceLabel, evidenceId, enteredAt: new Date().toISOString() };
}

export function missing(unit: string, need: string): Quantity { return { status: 'missing', unit, need }; }

export function isOk(q: Quantity | undefined): q is Extract<Quantity, { status: 'ok' }> { return q?.status === 'ok'; }
export function numberOf(q: Quantity | undefined): number | undefined { return isOk(q) ? q.value : undefined; }
export function priority(kind: EvidenceKind): number { return EVIDENCE_PRIORITY[kind]; }

export function preferEvidence(current: Quantity | undefined, candidate: Quantity): Quantity {
  if (!current || current.status === 'missing') return candidate;
  if (candidate.status === 'missing') return current;
  return priority(candidate.evidence) > priority(current.evidence) ? candidate : current;
}

export function traceInput(key: string, label: string, q: Quantity): TraceInput {
  return q.status === 'ok'
    ? { key, label, value: q.value, evidence: q.evidence, ...(q.evidenceId ? { evidenceId: q.evidenceId } : {}) }
    : { key, label, value: 'UNKNOWN', evidence: 'ASSUMED' };
}

export function makeNode(args: Omit<TraceNode, 'degraded'>): TraceNode {
  const degraded = args.inputs.some((i) => i.evidence === 'DATASHEET' || i.evidence === 'TEXT_INFERRED' || i.evidence === 'ASSUMED');
  return { ...args, degraded };
}

export function deriveConfidence(nodes: TraceNode[]): 'HIGH' | 'MEDIUM' | 'LOW' {
  const all = flatten(nodes);
  if (all.length === 0) return 'LOW';
  if (all.some((n) => n.degraded)) return all.some((n) => n.inputs.some((i) => i.evidence === 'TEXT_INFERRED' || i.evidence === 'ASSUMED')) ? 'LOW' : 'MEDIUM';
  return 'HIGH';
}

export function makeMargin(limit: number, actual: number, unit: string, direction: 'MAX' | 'MIN'): Margin {
  const ratio = direction === 'MAX' ? actual / limit : limit / actual;
  const verdict = direction === 'MAX' ? (actual > limit ? 'FAIL' : ratio >= 0.95 ? 'WARN' : 'PASS') : (actual < limit ? 'FAIL' : ratio >= 0.95 ? 'WARN' : 'PASS');
  return { limit, actual, unit, ratio, verdict };
}

export function flatten(nodes: TraceNode[]): TraceNode[] { return nodes.flatMap((n) => [n, ...flatten(n.children ?? [])]); }
