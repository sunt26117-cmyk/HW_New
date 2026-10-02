import { describe, expect, it } from 'vitest';
import { assertPatternOutput } from '../src/core/model/schema.ts';
import { patternStateFromPhysics } from '../src/core/physics/result.ts';
import { evaluateBldcPatterns } from '../src/core/patterns/bldc/registry.ts';
import { BLDC_HEALTHY, BLDC_MISSING, BLDC_P001_FAULT, BLDC_P003_FAULT, BLDC_P006_FAULT, BLDC_P006_OVER_TEMP_STABLE, BLDC_P006_RUNAWAY, BLDC_P016_FAULT } from '../src/fixtures/bldc.ts';
import { flatten } from '../src/core/trace/trace.ts';

const map = (project: typeof BLDC_HEALTHY) => new Map(evaluateBldcPatterns(project).map((p) => [p.id, p]));

describe('AutoHW Core Phase 3 Pattern contract', () => {
  it('healthy state triggers no failure mode', () => {
    expect([...map(BLDC_HEALTHY).values()].filter((p) => p.triggered === true)).toHaveLength(0);
  });
  for (const [name, fixture, id] of [
    ['P001', BLDC_P001_FAULT, 'BLDC.P001'], ['P003', BLDC_P003_FAULT, 'BLDC.P003'], ['P006', BLDC_P006_FAULT, 'BLDC.P006'], ['P016', BLDC_P016_FAULT, 'BLDC.P016'],
  ] as const) {
    it(`${name} fault state triggers, returns contract, and values are traceable`, () => {
      const p = map(fixture).get(id)!;
      expect(p.triggered).toBe(true);
      expect(p.trace.length).toBeGreaterThan(0);
      expect(p.values.length).toBeGreaterThan(0);
      expect(p.values.every((v) => p.trace.some((n) => n.id === `${p.id}.${v.key}`))).toBe(true);
      expect(flatten(p.trace).every((n) => n.inputs.every((i) => typeof i.value === 'number' || typeof i.value === 'string'))).toBe(true);
      expect(assertPatternOutput(p)).toBeDefined();
    });
  }
  it('P006 thermal runaway triggers a VETO instead of being reported as missing input', () => {
    const p = map(BLDC_P006_RUNAWAY).get('BLDC.P006')!;
    expect(p.triggered).toBe(true);
    expect(p.veto.triggered).toBe(true);
    expect(p.riskLevel).toBe('Critical');
    expect(p.trace.length).toBeGreaterThan(0);
    expect(assertPatternOutput(p)).toBeDefined();
  });
  it('missing state is insufficient_input for every Phase-3 Pattern', () => {
    const p = map(BLDC_MISSING);
    // P003/P006/P016 are all present but the missing fixture deliberately removes a P001 input.
    expect(p.get('BLDC.P001')!.triggered).toBe('insufficient_input');
    for (const [id, key] of [['BLDC.P003', 'vthMinV'], ['BLDC.P006', 'ambientC'], ['BLDC.P016', 'senseDelayNs']] as const) {
      const project = { ...BLDC_HEALTHY, issue: { ...BLDC_HEALTHY.issue, quantities: { ...BLDC_HEALTHY.issue.quantities, [key]: { status: 'missing', unit: '1', need: 'three-state test' } } } } as typeof BLDC_HEALTHY;
      expect(map(project).get(id)!.triggered).toBe('insufficient_input');
    }
  });
  it('measured evidence overrides theory for P001/P003', () => {
    const p1 = map(BLDC_P001_FAULT).get('BLDC.P001')!;
    const p3 = map(BLDC_P003_FAULT).get('BLDC.P003')!;
    expect((p1.values.find((v) => v.key === 'actualVbusPeakV')!.value as any).value).toBe(104);
    expect((p1.values.find((v) => v.key === 'actualVbusPeakV')!.value as any).evidence).toBe('MEASURED');
    expect((p3.values.find((v) => v.key === 'actualGateV')!.value as any).value).toBe(2.5);
    expect((p3.values.find((v) => v.key === 'actualGateV')!.value as any).evidence).toBe('MEASURED');
  });
  it('PhysicsResult mapping keeps diverged distinct from insufficient_input', () => {
    const missing = patternStateFromPhysics({ status: 'insufficient_input', need: ['x'] });
    expect(missing.triggered).toBe('insufficient_input');
    expect(missing.veto.triggered).toBe(false);
    const diverged = patternStateFromPhysics({ status: 'diverged', reason: 'no steady state' });
    expect(diverged.triggered).toBe(true);
    expect(diverged.veto.triggered).toBe(true);
    expect(diverged.riskLevel).toBe('Critical');
  });
  it('P006 over-temperature with a stable thermal solution is not mislabeled as runaway', () => {
    const p = map(BLDC_P006_OVER_TEMP_STABLE).get('BLDC.P006')!;
    expect(p.triggered).toBe(true);
    expect(p.veto.triggered).toBe(true);
    expect(p.trace[0]?.id).toBe('BLDC.P006.estimatedTjC');
    expect(p.values.find((v) => v.key === 'estimatedTjC')?.value.status).toBe('ok');
    expect((p.values.find((v) => v.key === 'estimatedTjC')?.value as any).value).toBeGreaterThan(110);
  });
  it('VETO origin exists only on Pattern output in Phase 3', () => {
    const p = map(BLDC_P001_FAULT).get('BLDC.P001')!;
    expect(p.veto.triggered).toBe(true);
    expect(typeof p.veto.reason).toBe('string');
  });
});
