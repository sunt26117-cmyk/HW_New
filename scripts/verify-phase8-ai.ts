import assert from 'node:assert/strict';
import { analyze } from '../src/app/analyze.ts';
import { applyAiNarrative, auditAiNarrative } from '../src/core/ai/audit.ts';
import { BLDC_P001_FAULT } from '../src/fixtures/bldc.ts';

const baseline = analyze(BLDC_P001_FAULT);
const p = baseline.judgment.patterns.find((pattern) => pattern.id === 'BLDC.P001')!;
const traceId = p.trace[0].id;
const rejected = auditAiNarrative({ text: '当前峰值为 999 V。', citedTraceIds: [traceId] }, baseline);
assert.equal(rejected.passed, false);
assert.ok(rejected.rejectedNumbers.includes('999 V'));
assert.deepEqual(applyAiNarrative(baseline, { text: '当前峰值为 999 V。', citedTraceIds: [traceId] }), baseline);
const value = p.values.find((item) => item.value.status === 'ok')!.value;
assert.equal(value.status, 'ok');
const accepted = applyAiNarrative(baseline, { text: `当前用于判定的母线峰值为 ${value.value} ${value.unit}。`, citedTraceIds: [traceId] });
assert.equal(accepted.meta.source, 'AI_ENHANCED');
assert.equal(accepted.narrative?.auditReport.passed, true);
assert.equal(auditAiNarrative({ text: '没有数值。', citedTraceIds: ['bad-trace-id'] }, baseline).passed, false);
console.log('✓ AUTOHW CORE PHASE 8 AI VERIFY PASS');
