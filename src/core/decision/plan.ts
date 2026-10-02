import type { AnalysisResult, Measure, Option, PatternOutput, DualTimeline, TimelineItem } from '../model/contracts.ts';
import { scoreOption, sortOptions, type DecisionContext } from './scoring.ts';

const TIER_ORDER = { ROOT_FIX: 3, COMBINED: 2, TEMPORARY: 1 } as const;

function uniqueMeasures(patterns: PatternOutput[]): Array<{ measure: Measure; patternId: string }> {
  const out: Array<{ measure: Measure; patternId: string }> = [];
  const seen = new Set<string>();
  for (const pattern of patterns) {
    if (pattern.triggered !== true) continue;
    for (const measure of pattern.measures) {
      if (seen.has(measure.id)) continue;
      seen.add(measure.id);
      out.push({ measure, patternId: pattern.id });
    }
  }
  return out;
}

function aggregate(patterns: PatternOutput[], measureIds: string[]) {
  const measures = uniqueMeasures(patterns).filter(({ measure }) => measureIds.includes(measure.id));
  const sourcePatternIds = [...new Set(measures.flatMap(({ patternId }) => [patternId]))];
  const vetoPatterns = patterns.filter((pattern) => sourcePatternIds.includes(pattern.id) && pattern.veto.triggered);
  return {
    measures: measures.map(({ measure }) => measure),
    sourcePatternIds,
    veto: {
      triggered: vetoPatterns.length > 0,
      sourcePatternIds: vetoPatterns.map((pattern) => pattern.id),
      reasons: vetoPatterns.flatMap((pattern) => pattern.veto.reason ? [pattern.veto.reason] : []),
    },
  };
}

function makeOption(patterns: PatternOutput[], tier: Option['tier'], measures: Measure[], context: DecisionContext, sourcePatternIds: string[], veto: Option['veto']): Option {
  const ids = measures.map((measure) => measure.id);
  const scores = scoreOption(patterns.filter((pattern) => sourcePatternIds.includes(pattern.id)), measures, context);
  const titlePrefix = tier === 'ROOT_FIX' ? '根治方案' : tier === 'COMBINED' ? '联合方案' : '临时遏制';
  return {
    id: `OPTION.${tier}.${ids.join('+')}`,
    tier,
    title: `${titlePrefix}：${measures.map((m) => m.title).join(' + ')}`,
    sourcePatternIds,
    measureIds: ids,
    scores,
    veto,
    requiresBoardRespin: measures.some((measure) => measure.requiresBoardRespin),
    days: measures.reduce((sum, measure) => sum + measure.days, 0),
    cost: measures.some((measure) => measure.cost === 'H') ? 'H' : measures.some((measure) => measure.cost === 'M') ? 'M' : 'L',
    sideEffects: [...new Set(measures.flatMap((measure) => measure.sideEffects))],
    verification: [...new Set(patterns.filter((p) => sourcePatternIds.includes(p.id)).flatMap((p) => p.verification))],
  };
}

function buildTimeline(options: Option[]): DualTimeline {
  const toItem = (option: Option): TimelineItem => ({
    optionId: option.id, title: option.title, measureIds: option.measureIds, days: option.days, requiresBoardRespin: option.requiresBoardRespin, vetoed: option.veto.triggered,
  });
  return {
    containment: options.filter((option) => option.tier === 'TEMPORARY' && !option.requiresBoardRespin).map(toItem),
    permanent: options.filter((option) => option.veto.triggered || option.requiresBoardRespin).map(toItem),
  };
}

export interface DecisionPlan {
  options: Option[];
  recommended?: string;
  timeline: DualTimeline;
}

export function buildDecisionPlan(patterns: PatternOutput[], context: DecisionContext): DecisionPlan {
  const activePatterns = patterns.filter((pattern) => pattern.triggered === true);
  if (activePatterns.length === 0) return { options: [], timeline: { containment: [], permanent: [] } };

  const entries = uniqueMeasures(patterns);
  const rootMeasures = entries.filter(({ measure }) => measure.requiresBoardRespin).map(({ measure }) => measure);
  const temporaryMeasures = entries.filter(({ measure }) => !measure.requiresBoardRespin).map(({ measure }) => measure);

  const options: Option[] = [];

  for (const measure of [...rootMeasures, ...temporaryMeasures]) {
    const agg = aggregate(patterns, [measure.id]);
    options.push(makeOption(patterns, measure.requiresBoardRespin ? 'ROOT_FIX' : 'TEMPORARY', agg.measures, context, agg.sourcePatternIds, agg.veto));
  }

  if (rootMeasures.length + temporaryMeasures.length > 1) {
    const all = aggregate(patterns, entries.map(({ measure }) => measure.id));
    options.push(makeOption(patterns, 'COMBINED', all.measures, context, all.sourcePatternIds, all.veto));
  }

  const sorted = sortOptions(options.map((option) => ({ id: option.id, tier: option.tier, scores: option.scores })))
    .map((ref) => options.find((option) => option.id === ref.id)!);
  // VETO remains sourced from Pattern. Recommendation may still point to a corrective plan;
  // the active VETO is not cleared here and must be re-evaluated by the originating Pattern.
  const recommended = sorted[0]?.id;
  return { options: sorted, ...(recommended ? { recommended } : {}), timeline: buildTimeline(sorted) };
}

export function withDecision(result: AnalysisResult, patterns: PatternOutput[], context: DecisionContext): AnalysisResult {
  const plan = buildDecisionPlan(patterns, context);
  return { ...result, action: { ...result.action, options: plan.options, ...(plan.recommended ? { recommended: plan.recommended } : {}), timeline: plan.timeline } };
}

export { TIER_ORDER };
