import assert from 'node:assert/strict';
import { analyze } from '../src/app/analyze.ts';
import { buildDecisionPlan } from '../src/core/decision/index.ts';
import { evaluateBldcPatterns } from '../src/core/patterns/bldc/registry.ts';
import { BLDC_HEALTHY, BLDC_P001_FAULT } from '../src/fixtures/bldc.ts';

const healthy = analyze(BLDC_HEALTHY);
assert.deepEqual(healthy.action.options, []);
assert.deepEqual(healthy.action.timeline.containment, []);
assert.deepEqual(healthy.action.timeline.permanent, []);

const patterns = evaluateBldcPatterns(BLDC_P001_FAULT);
const plan = buildDecisionPlan(patterns, { phase: 'EVT', daysRemaining: 100 });
const tiers = new Set(plan.options.map((option) => option.tier));
assert.equal(tiers.has('ROOT_FIX'), true);
assert.equal(tiers.has('TEMPORARY'), true);
assert.equal(tiers.has('COMBINED'), true);
assert.ok(plan.options.every((option) => option.veto.triggered === true));
assert.ok(plan.options.flatMap((option) => option.veto.sourcePatternIds).includes('BLDC.P001'));
assert.ok(plan.timeline.containment.length > 0);
assert.ok(plan.timeline.containment.every((item) => !item.requiresBoardRespin));
assert.ok(plan.timeline.permanent.some((item) => item.requiresBoardRespin));
assert.ok(plan.timeline.permanent.some((item) => item.vetoed));

const early = buildDecisionPlan(patterns, { phase: 'SOP', daysRemaining: 300 });
const crunch = buildDecisionPlan(patterns, { phase: 'SOP', daysRemaining: 10 });
const earlyRespin = early.options.find((option) => option.requiresBoardRespin)!;
const crunchRespin = crunch.options.find((option) => option.requiresBoardRespin)!;
assert.ok(crunchRespin.scores.S < earlyRespin.scores.S);

const muted = patterns.map((pattern) => pattern.id === 'BLDC.P001'
  ? { ...pattern, triggered: false, veto: { triggered: false } }
  : pattern);
const changed = buildDecisionPlan(muted, { phase: 'EVT', daysRemaining: 100 });
assert.ok(plan.options.length > changed.options.length);
assert.equal(changed.options.flatMap((option) => option.sourcePatternIds).includes('BLDC.P001'), false);

console.log('✓ AUTOHW CORE PHASE 4 VERIFY PASS');
