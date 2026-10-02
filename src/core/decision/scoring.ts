import type { PatternOutput, TscqlScores, Measure } from '../model/contracts.ts';
import { STANDARD_TSCQL_WEIGHTS } from './scoringWeights.ts';

export { STANDARD_TSCQL_WEIGHTS };

export interface DecisionContext {
  phase: string;
  daysRemaining?: number;
}

const RISK_TECHNICAL_SCORE: Record<PatternOutput['riskLevel'], number> = {
  Low: 55,
  Medium: 70,
  High: 85,
  Critical: 100,
  Unknown: 40,
};

const COST_SCORE: Record<Measure['cost'], number> = { L: 90, M: 60, H: 30 };

const clamp = (n: number): number => Math.max(0, Math.min(100, n));

/**
 * Decision-layer policy only. This is not a physics calculation.
 * Technical effectiveness is anchored to the triggered Pattern risk level;
 * other dimensions use explicit Measure metadata (days/cost/side effects).
 */
export function scoreOption(sourcePatterns: PatternOutput[], measures: Measure[], context: DecisionContext): TscqlScores {
  const activeSourcePatterns = sourcePatterns.filter((pattern) => pattern.triggered === true);
  const technicalBase = activeSourcePatterns.length
    ? activeSourcePatterns.reduce((sum, pattern) => sum + RISK_TECHNICAL_SCORE[pattern.riskLevel], 0) / activeSourcePatterns.length
    : 40;

  const averageDays = measures.length ? measures.reduce((sum, measure) => sum + measure.days, 0) / measures.length : 0;
  const averageCostScore = measures.length
    ? measures.reduce((sum, measure) => sum + COST_SCORE[measure.cost], 0) / measures.length
    : 0;
  const sideEffectCount = measures.reduce((sum, measure) => sum + measure.sideEffects.length, 0);
  const respinPenalty = measures.some((measure) => measure.requiresBoardRespin) ? 10 : 0;

  let schedule = clamp(100 - averageDays * 5 - respinPenalty);
  if (context.phase === 'SOP' && typeof context.daysRemaining === 'number' && context.daysRemaining >= 0 && context.daysRemaining <= 21 && measures.some((m) => m.requiresBoardRespin)) {
    const decayFactor = Math.max(0.2, context.daysRemaining / 21);
    schedule = Number((schedule * decayFactor).toFixed(1));
  }

  const T = clamp(technicalBase - sideEffectCount * 3);
  const S = clamp(schedule);
  const C = clamp(averageCostScore);
  const Q = clamp(100 - sideEffectCount * 10 - respinPenalty * 0.5);
  const L = clamp(100 - sideEffectCount * 8 - respinPenalty);
  const total = Math.round(((T * STANDARD_TSCQL_WEIGHTS.T + S * STANDARD_TSCQL_WEIGHTS.S + C * STANDARD_TSCQL_WEIGHTS.C + Q * STANDARD_TSCQL_WEIGHTS.Q + L * STANDARD_TSCQL_WEIGHTS.L) / 100) * 10) / 10;
  return { T: Number(T.toFixed(1)), S: Number(S.toFixed(1)), C: Number(C.toFixed(1)), Q: Number(Q.toFixed(1)), L: Number(L.toFixed(1)), total };
}

export function sortOptions(options: Array<{ scores: TscqlScores; tier: 'ROOT_FIX'|'COMBINED'|'TEMPORARY'; id: string }>) {
  const tierRank = { ROOT_FIX: 3, COMBINED: 2, TEMPORARY: 1 } as const;
  return [...options].sort((a, b) => b.scores.total - a.scores.total || tierRank[b.tier] - tierRank[a.tier] || a.id.localeCompare(b.id));
}
