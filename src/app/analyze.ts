import type { AnalysisResult, EngineeringProject, PatternOutput } from '../core/model/contracts.ts';
import { evaluateBldcPatterns } from '../core/patterns/index.ts';
import { buildDecisionPlan } from '../core/decision/index.ts';
import { DELIVERY_DOCS } from '../content/delivery.ts';

export const ENGINE_VERSION = 'autohw-core-p4.1';

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(stableStringify).join(',') + ']';
  const record = value as Record<string, unknown>;
  return '{' + Object.keys(record).sort().map((k) => JSON.stringify(k) + ':' + stableStringify(record[k])).join(',') + '}';
}

function hash(input: string): string {
  let h1 = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) { h1 ^= input.charCodeAt(i); h1 = Math.imul(h1, 0x01000193); }
  return (h1 >>> 0).toString(16).padStart(8, '0');
}

export function analyze(project: EngineeringProject): AnalysisResult {
  const inputHash = hash(stableStringify(project));
  const at = new Date().toISOString();
  const patterns = [...evaluateBldcPatterns(project)].sort((a, b) => riskRank(b.riskLevel) - riskRank(a.riskLevel));
  const missing = Object.entries(project.issue.quantities).filter(([, q]) => q.status === 'missing').map(([k, q]) => `${k}：${q.status === 'missing' ? q.need : ''}`);
  const assumptions = Object.entries(project.issue.quantities).filter(([, q]) => q.status === 'ok' && q.evidence === 'ASSUMED').map(([k]) => k);
  const vetoes = patterns.filter((p) => p.veto.triggered).map((p) => ({ patternId: p.id, reason: p.veto.reason }));
  const triggered = patterns.filter((p) => p.triggered === true);
  const dominant = [...triggered].sort((a, b) => riskRank(b.riskLevel) - riskRank(a.riskLevel))[0]?.id;
  return {
    meta: { analysisId: `${project.meta.projectId}:${inputHash}`, inputHash, engineVersion: ENGINE_VERSION, at, domain: project.meta.domain, source: 'DETERMINISTIC' },
    facts: { quantities: Object.values(project.issue.quantities), missing, assumptions },
    judgment: { patterns, ...(dominant ? { dominant } : {}), vetoes },
    action: { ...buildDecisionPlan(patterns, { phase: project.meta.phase, daysRemaining: project.meta.daysRemaining }), docs: [DELIVERY_DOCS.RACI, DELIVERY_DOCS.EDR, DELIVERY_DOCS['8D'], DELIVERY_DOCS.CONTROLLED] },
  };
}

function riskRank(level: PatternOutput['riskLevel']): number { return ({ Low: 1, Medium: 2, High: 3, Critical: 4, Unknown: 0 } as const)[level]; }
