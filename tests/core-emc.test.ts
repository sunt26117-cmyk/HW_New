import { describe, expect, it } from 'vitest';
import { evaluateEmcPatterns } from '../src/core/patterns/emc/registry.ts';
import { EMC_BCI_MISSING, EMC_BCI_PASS, EMC_BCI_FAIL } from '../src/fixtures/emc.ts';

describe('EMC/BCI Pattern cluster', () => {
  const pick = (project: typeof EMC_BCI_PASS, id: string) => evaluateEmcPatterns(project.issue).find((pattern) => pattern.id === id);
  it('missing evidence stays insufficient_input', () => {
    expect(pick(EMC_BCI_MISSING, 'EMC.P001')?.triggered).toBe('insufficient_input');
    expect(pick(EMC_BCI_MISSING, 'EMC.C001')?.triggered).toBe('insufficient_input');
    expect(pick(EMC_BCI_MISSING, 'EMC.C002')?.triggered).toBe('insufficient_input');
  });
  it('complete BCI evidence without functional failure does not trigger the failure mode', () => {
    expect(pick(EMC_BCI_PASS, 'EMC.P001')?.triggered).toBe(false);
    expect(pick(EMC_BCI_PASS, 'EMC.P001')?.veto.triggered).toBe(false);
    expect(pick(EMC_BCI_PASS, 'EMC.C001')?.triggered).toBe(false);
    expect(pick(EMC_BCI_PASS, 'EMC.C002')?.triggered).toBe(false);
  });
  it('observed functional failure triggers High risk but does not invent a VETO', () => {
    expect(pick(EMC_BCI_FAIL, 'EMC.P001')?.triggered).toBe(true);
    expect(pick(EMC_BCI_FAIL, 'EMC.P001')?.riskLevel).toBe('High');
    expect(pick(EMC_BCI_FAIL, 'EMC.P001')?.veto.triggered).toBe(false);
  });
});
