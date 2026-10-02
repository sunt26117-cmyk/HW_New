import type { Quantity } from '../model/contracts.ts';
import { requireInputs, validateNumericDomain, type PhysicsResult } from './result.ts';

export interface ProtectionTimingInput { senseDelayNs: number | Quantity | undefined; comparatorDelayNs: number | Quantity | undefined; filterDelayNs: number | Quantity | undefined; driverDelayNs: number | Quantity | undefined; gateTurnOffDelayNs: number | Quantity | undefined; currentFallDelayNs: number | Quantity | undefined; soaTimeUs: number | Quantity | undefined; }
export interface ProtectionTimingResult { faultToOffNs: number; faultToOffUs: number; marginUs: number; }

export function calculateProtectionTiming(input: ProtectionTimingInput): PhysicsResult<ProtectionTimingResult> {
  const r = requireInputs([
    ['senseDelayNs', input.senseDelayNs], ['comparatorDelayNs', input.comparatorDelayNs], ['filterDelayNs', input.filterDelayNs],
    ['driverDelayNs', input.driverDelayNs], ['gateTurnOffDelayNs', input.gateTurnOffDelayNs], ['currentFallDelayNs', input.currentFallDelayNs], ['soaTimeUs', input.soaTimeUs],
  ]);
  if (r.status !== 'ok') return r;
  const { senseDelayNs, comparatorDelayNs, filterDelayNs, driverDelayNs, gateTurnOffDelayNs, currentFallDelayNs, soaTimeUs } = r.value;
  const domain = validateNumericDomain([
    { name: 'senseDelayNs', value: senseDelayNs, min: 0 }, { name: 'comparatorDelayNs', value: comparatorDelayNs, min: 0 },
    { name: 'filterDelayNs', value: filterDelayNs, min: 0 }, { name: 'driverDelayNs', value: driverDelayNs, min: 0 },
    { name: 'gateTurnOffDelayNs', value: gateTurnOffDelayNs, min: 0 }, { name: 'currentFallDelayNs', value: currentFallDelayNs, min: 0 },
    { name: 'soaTimeUs', value: soaTimeUs, minExclusive: 0 },
  ]);
  if (domain.status !== 'ok') return domain;
  const faultToOffNs = senseDelayNs + comparatorDelayNs + filterDelayNs + driverDelayNs + gateTurnOffDelayNs + currentFallDelayNs;
  const faultToOffUs = faultToOffNs / 1000;
  const marginUs = soaTimeUs - faultToOffUs;
  if (![faultToOffNs, faultToOffUs, marginUs].every(Number.isFinite)) return { status: 'insufficient_input', need: ['protection timing result must be finite'] };
  return { status: 'ok', value: { faultToOffNs, faultToOffUs, marginUs } };
}

export interface ShortCircuitEnergyInput { vdsV: number | Quantity | undefined; currentA: number | Quantity | undefined; durationUs: number | Quantity | undefined; }
export function calculateShortCircuitEnergy(input: ShortCircuitEnergyInput): PhysicsResult<number> {
  const r = requireInputs([['vdsV', input.vdsV], ['currentA', input.currentA], ['durationUs', input.durationUs]]);
  if (r.status !== 'ok') return r;
  const domain = validateNumericDomain([
    { name: 'vdsV', value: r.value.vdsV, min: 0 }, { name: 'currentA', value: r.value.currentA, min: 0 }, { name: 'durationUs', value: r.value.durationUs, min: 0 },
  ]);
  if (domain.status !== 'ok') return domain;
  const energyJ = r.value.vdsV * r.value.currentA * r.value.durationUs * 1e-3;
  return Number.isFinite(energyJ) ? { status: 'ok', value: energyJ } : { status: 'insufficient_input', need: ['short-circuit energy result must be finite'] };
}
