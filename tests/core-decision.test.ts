import { describe, expect, it } from 'vitest';
import { analyze } from '../src/app/analyze.ts';
import { BLDC_HEALTHY, BLDC_P001_FAULT } from '../src/fixtures/bldc.ts';
import { buildDecisionPlan, STANDARD_TSCQL_WEIGHTS } from '../src/core/decision/index.ts';
import { DecisionPlanSchema } from '../src/core/model/schema.ts';
import { evaluateBldcPatterns } from '../src/core/patterns/bldc/registry.ts';

describe('AutoHW Core Phase 4 decision layer', () => {
  it('healthy project yields no decision options', () => {
    const result = analyze(BLDC_HEALTHY);
    expect(result.action.options).toEqual([]);
    expect(result.action.timeline.containment).toEqual([]);
    expect(result.action.timeline.permanent).toEqual([]);
  });

  it('active Pattern measures generate three candidate tiers when both respin and containment measures exist', () => {
    const patterns = evaluateBldcPatterns(BLDC_P001_FAULT);
    const plan = buildDecisionPlan(patterns, { phase: 'EVT', daysRemaining: 100 });
    expect(plan.options.some((o) => o.tier === 'ROOT_FIX')).toBe(true);
    expect(plan.options.some((o) => o.tier === 'TEMPORARY')).toBe(true);
    expect(plan.options.some((o) => o.tier === 'COMBINED')).toBe(true);
    expect(DecisionPlanSchema.parse(plan)).toBeDefined();
  });

  it('option VETO is copied from Pattern and never recalculated from option scores', () => {
    const result = analyze(BLDC_P001_FAULT);
    const p = result.judgment.patterns.find((pattern) => pattern.id === 'BLDC.P001')!;
    expect(p.veto.triggered).toBe(true);
    expect(result.action.options.every((option) => option.veto.triggered === true)).toBe(true);
    expect(result.action.options.flatMap((option) => option.veto.sourcePatternIds)).toContain('BLDC.P001');
  });

  it('T+24h containment is derived only from non-respin candidate measures', () => {
    const result = analyze(BLDC_P001_FAULT);
    expect(result.action.timeline.containment.length).toBeGreaterThan(0);
    expect(result.action.timeline.containment.every((item) => item.requiresBoardRespin === false)).toBe(true);
  });

  it('permanent timeline contains root/combined or respin options and carries Pattern VETO state', () => {
    const result = analyze(BLDC_P001_FAULT);
    expect(result.action.timeline.permanent.length).toBeGreaterThan(0);
    expect(result.action.timeline.permanent.some((item) => item.requiresBoardRespin)).toBe(true);
    expect(result.action.timeline.permanent.some((item) => item.vetoed)).toBe(true);
    expect(result.action.timeline.permanent.some((item) => item.requiresBoardRespin === false && item.vetoed)).toBe(true);
  });

  it('SOP time decay is pure and applies only to respin options inside the 21-day window', () => {
    const patterns = evaluateBldcPatterns(BLDC_P001_FAULT);
    const early = buildDecisionPlan(patterns, { phase: 'SOP', daysRemaining: 300 });
    const crunch = buildDecisionPlan(patterns, { phase: 'SOP', daysRemaining: 10 });
    const earlyRespin = early.options.find((o) => o.requiresBoardRespin)!;
    const crunchRespin = crunch.options.find((o) => o.requiresBoardRespin)!;
    expect(crunchRespin.scores.S).toBeLessThan(earlyRespin.scores.S);
  });

  it('standard weights sum to 100', () => {
    expect(STANDARD_TSCQL_WEIGHTS.T + STANDARD_TSCQL_WEIGHTS.S + STANDARD_TSCQL_WEIGHTS.C + STANDARD_TSCQL_WEIGHTS.Q + STANDARD_TSCQL_WEIGHTS.L).toBe(100);
  });

  it('changing Pattern trigger state removes its candidate measures from decision plan', () => {
    const patterns = evaluateBldcPatterns(BLDC_P001_FAULT);
    const planA = buildDecisionPlan(patterns, { phase: 'EVT', daysRemaining: 100 });
    const muted = patterns.map((p) => p.id === 'BLDC.P001' ? { ...p, triggered: false, veto: { triggered: false } } : p);
    const planB = buildDecisionPlan(muted, { phase: 'EVT', daysRemaining: 100 });
    expect(planA.options.length).toBeGreaterThan(planB.options.length);
    expect(planB.options.flatMap((option) => option.sourcePatternIds)).not.toContain('BLDC.P001');
  });
});
