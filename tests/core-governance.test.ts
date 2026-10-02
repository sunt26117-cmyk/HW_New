import { describe, expect, it } from 'vitest';
import { analyze } from '../src/app/analyze.ts';
import { BLDC_P001_FAULT } from '../src/fixtures/bldc.ts';

describe('AutoHW Core governance', () => {
  it('analysis is versioned by inputHash + analysisId', () => {
    const a = analyze(BLDC_P001_FAULT);
    const b = analyze({ ...BLDC_P001_FAULT, issue: { ...BLDC_P001_FAULT.issue, quantities: { ...BLDC_P001_FAULT.issue.quantities, rpm: { status: 'ok', value: 3600, unit: 'rpm', evidence: 'MEASURED', enteredAt: 'fixture' } } } });
    expect(a.meta.inputHash).not.toBe(b.meta.inputHash);
    expect(a.meta.analysisId).not.toBe(b.meta.analysisId);
  });
});
