import { describe, expect, it } from 'vitest';
import { auditAiNarrative, applyAiNarrative } from '../src/core/ai/audit.ts';
import { BLDC_P001_FAULT } from '../src/fixtures/bldc.ts';
import { analyze } from '../src/app/analyze.ts';

describe('AutoHW Core Phase 8 AI audit', () => {
  it('rejects a hallucinated numeric value and preserves deterministic result', () => {
    const baseline = analyze(BLDC_P001_FAULT);
    const traceId = baseline.judgment.patterns.flatMap((p) => p.trace)[0]?.id ?? '';
    const report = auditAiNarrative({ text: '当前峰值为 999 V。', citedTraceIds: [traceId] }, baseline);
    expect(report.passed).toBe(false);
    expect(report.rejectedNumbers).toContain('999 V');
    expect(applyAiNarrative(baseline, { text: '当前峰值为 999 V。', citedTraceIds: [traceId] })).toEqual(baseline);
  });

  it('accepts compliant numeric narrative cited to a real Trace', () => {
    const baseline = analyze(BLDC_P001_FAULT);
    const pattern = baseline.judgment.patterns.find((p) => p.id === 'BLDC.P001')!;
    const value = pattern.values.find((v) => v.value.status === 'ok')!.value as Extract<typeof pattern.values[number]['value'], {status:'ok'}>;
    const traceId = pattern.trace[0].id;
    const out = applyAiNarrative(baseline, { text: `用于判定的母线峰值为 ${value.value} ${value.unit}。`, citedTraceIds: [traceId] });
    expect(out.meta.source).toBe('AI_ENHANCED');
    expect(out.narrative?.auditReport.passed).toBe(true);
  });
});
