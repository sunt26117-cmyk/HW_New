import { describe, expect, it } from 'vitest';
import { GOLD_CASES } from '../src/fixtures/gold/index.ts';
import { assertGoldCaseReady, withinGoldTolerance } from '../src/core/gold/contracts.ts';

describe('gold case governance', () => {
  it('keeps the registry empty until real bench data exists', () => {
    expect(GOLD_CASES).toHaveLength(0);
  });
  it('validates explicit tolerance without inventing a result', () => {
    expect(withinGoldTolerance(10.2, { key:'x', unit:'V', expected:10, toleranceAbsolute:0.25, source:'MEASURED', rationale:'bench' })).toBe(true);
    expect(withinGoldTolerance(10.4, { key:'x', unit:'V', expected:10, toleranceAbsolute:0.25, source:'MEASURED', rationale:'bench' })).toBe(false);
  });
  it('rejects non-ready gold cases', () => {
    const pending = { id:'pending', name:'pending', domain:'BLDC' as const, status:'PENDING_REAL_BENCH_DATA' as const, description:'', project:{} as any, measuredEvidenceIds:[], expected:[] };
    expect(() => assertGoldCaseReady(pending)).toThrow('尚未有真实台架数据');
  });
});
