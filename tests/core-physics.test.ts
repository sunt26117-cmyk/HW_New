import { describe, expect, it } from 'vitest';
import { calculateBusPumping, calculateDeadtimeDistortion, calculateDualMassResonance, calculateBandwidthToResonanceRatio, calculateSnubberTarget, calculateThermalCascade, calculateThermalMillerCascade, checkMillerRisk, calculateProtectionTiming } from '../src/core/physics/index.ts';

describe('AutoHW Core Phase 2 physics', () => {
  it('bus pumping returns insufficient_input instead of defaults', () => {
    expect(calculateBusPumping({ vbusNominalV: undefined, cbusUf: 100, rotorInertiaKgM2: 1e-4, rpm: 1000, efficiency: 1, absorbedEnergyJ: 0 })).toEqual({ status: 'insufficient_input', need: ['vbusNominalV'] });
  });
  it('bus pumping rejects non-positive capacitor', () => {
    expect(calculateBusPumping({ vbusNominalV: 48, cbusUf: 0, rotorInertiaKgM2: 1e-4, rpm: 1000, efficiency: 1, absorbedEnergyJ: 0 }).status).toBe('insufficient_input');
  });
  it('miller returns insufficient_input for missing required quantity', () => {
    expect(checkMillerRisk({ cgdPf: 20, rgOffOhm: 4.7, dvDtVns: 5, vbusV: undefined })).toEqual({ status: 'insufficient_input', need: ['vbusV'] });
  });
  it('thermal cascade converges for a bounded case', () => {
    const r = calculateThermalCascade({ baseTemperatureC: 80, currentRmsA: 50, rdsOn25MilliOhm: 10, rthCPerW: 1, alphaPerC: 0.002, tjMaxC: 150 });
    expect(r.status).toBe('ok');
    if (r.status === 'ok') expect(r.value.converged).toBe(true);
  });
  it('thermal cascade does not confuse a small solver budget with runaway', () => {
    const r = calculateThermalCascade({ baseTemperatureC: 80, currentRmsA: 50, rdsOn25MilliOhm: 10, rthCPerW: 1, alphaPerC: 0.002, tjMaxC: 150 }, 1);
    expect(r.status).toBe('ok');
    if (r.status === 'ok') {
      expect(r.value.steadyStateExists).toBe(true);
      expect(r.value.feedbackGain).toBeLessThan(1);
    }
  });
  it('thermal runaway remains diverged when no steady state exists', () => {
    const r = calculateThermalCascade({ baseTemperatureC: 100, currentRmsA: 100, rdsOn25MilliOhm: 20, rthCPerW: 8, alphaPerC: 0.002, tjMaxC: 150 }, 3);
    expect(r.status).toBe('diverged');
  });
  it('thermal runaway is diverged (a finding), while a missing input stays insufficient_input', () => {
    const run = { baseTemperatureC: 125, currentRmsA: 80, rdsOn25MilliOhm: 6, rthCPerW: 35, alphaPerC: 0.01, tjMaxC: 175 };
    expect(calculateThermalCascade(run).status).toBe('diverged');
    expect(calculateThermalCascade({ ...run, rthCPerW: undefined }).status).toBe('insufficient_input');
  });
  it('Vth(Tj) + Miller cascade is composable as one pure function', () => {
    const r = calculateThermalMillerCascade({
      thermal: { baseTemperatureC: 25, currentRmsA: 10, rdsOn25MilliOhm: 5, rthCPerW: 1, alphaPerC: 0.002, tjMaxC: 150 },
      miller: { cgdPf: 20, rgOffOhm: 4.7, dvDtVns: 2 },
      vbusV: 48, vth25V: 2.2, vthTempcoVPerC: -0.002,
    });
    expect(r.status).toBe('ok');
  });
  it('thermal input-domain violations are rejected before formula evaluation', () => {
    const base = { baseTemperatureC: 25, currentRmsA: 10, rdsOn25MilliOhm: 5, rthCPerW: 1, alphaPerC: 0.002, tjMaxC: 150 };
    expect(calculateThermalCascade({ ...base, currentRmsA: -1 }).status).toBe('insufficient_input');
    expect(calculateThermalCascade({ ...base, alphaPerC: -0.001 }).status).toBe('insufficient_input');
    expect(calculateThermalCascade({ ...base, tjMaxC: 0 }).status).toBe('insufficient_input');
    expect(calculateThermalCascade({ ...base, currentRmsA: Number.NaN }).status).toBe('insufficient_input');
  });
  it('deadtime, snubber, bandwidth, dual-mass functions reject invalid inputs', () => {
    expect(calculateDeadtimeDistortion({ vbusV: 48, deadtimeNs: 50, switchingPeriodNs: 0 }).status).toBe('insufficient_input');
    expect(calculateSnubberTarget({ inductanceNh: 0, capacitancePf: 100 }).status).toBe('insufficient_input');
    expect(calculateBandwidthToResonanceRatio({ resonanceHz: 0, loopBandwidthHz: 100 }).status).toBe('insufficient_input');
    expect(calculateDualMassResonance({ motorInertiaKgM2: 0, loadInertiaKgM2: 1, torsionalStiffnessNmPerRad: 100 }).status).toBe('insufficient_input');
  });
  it('protection timing sums six explicit delays without hidden fallback', () => {
    const r = calculateProtectionTiming({ senseDelayNs: 80, comparatorDelayNs: 60, filterDelayNs: 40, driverDelayNs: 50, gateTurnOffDelayNs: 80, currentFallDelayNs: 60, soaTimeUs: 2 });
    expect(r.status).toBe('ok');
    if (r.status === 'ok') expect(r.value.faultToOffNs).toBe(370);
  });
});
