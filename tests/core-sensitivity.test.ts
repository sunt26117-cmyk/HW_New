import { describe, expect, it } from 'vitest';
import { runBldcSensitivity } from '../src/app/sensitivity.ts';
import { BLDC_HEALTHY } from '../src/fixtures/bldc.ts';

describe('BLDC sensitivity', () => {
  it('reruns deterministic analysis for single parameter scan', () => {
    const report = runBldcSensitivity(BLDC_HEALTHY, 20);
    expect(report.rows.length).toBeGreaterThan(0);
    expect(report.rows.some((row) => row.key === 'currentRmsA')).toBe(true);
    expect(report.rows.every((row) => Number.isFinite(row.normalizedImpactPct))).toBe(true);
  });

  it('does not fabricate missing inputs', () => {
    const project = { ...BLDC_HEALTHY, issue: { ...BLDC_HEALTHY.issue, quantities: { ...BLDC_HEALTHY.issue.quantities, currentRmsA: { status: 'missing' as const, unit: 'A', need: '需要实测 RMS 电流' } } } };
    const report = runBldcSensitivity(project, 20);
    expect(report.skipped.some((item) => item.key === 'currentRmsA')).toBe(true);
    expect(report.rows.some((row) => row.key === 'currentRmsA')).toBe(false);
  });

  it('measured evidence reduces measurement-priority multiplier without changing physical sensitivity', () => {
    const report = runBldcSensitivity(BLDC_HEALTHY, 20);
    const row = report.rows.find((item) => item.key === 'currentRmsA');
    expect(row).toBeDefined();
    expect(row?.evidence).toBe('MEASURED');
    expect(row?.measurementPriorityPct).toBe(0);
  });
});
