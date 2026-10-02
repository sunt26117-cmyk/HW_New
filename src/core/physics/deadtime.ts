import type { Quantity } from '../model/contracts.ts';
import { requireInputs, validateNumericDomain, type PhysicsResult } from './result.ts';

export interface DeadtimeInput { vbusV: number | Quantity | undefined; deadtimeNs: number | Quantity | undefined; switchingPeriodNs: number | Quantity | undefined; }
export interface DeadtimeResult { dutyDistortionFraction: number; approximatePhaseVoltageErrorV: number; }

/** ΔD≈t_dead/Tsw；|ΔV_phase|≈Vbus·ΔD. The sign depends on current direction and device conduction path. */
export function calculateDeadtimeDistortion(input: DeadtimeInput): PhysicsResult<DeadtimeResult> {
  const r = requireInputs([['vbusV', input.vbusV], ['deadtimeNs', input.deadtimeNs], ['switchingPeriodNs', input.switchingPeriodNs]]);
  if (r.status !== 'ok') return r;
  const { vbusV, deadtimeNs, switchingPeriodNs } = r.value;
  const domain = validateNumericDomain([
    { name: 'vbusV', value: vbusV, minExclusive: 0 }, { name: 'deadtimeNs', value: deadtimeNs, min: 0 }, { name: 'switchingPeriodNs', value: switchingPeriodNs, minExclusive: 0 },
  ]);
  if (domain.status !== 'ok') return domain;
  const dutyDistortionFraction = deadtimeNs / switchingPeriodNs;
  const approximatePhaseVoltageErrorV = vbusV * dutyDistortionFraction;
  return Number.isFinite(approximatePhaseVoltageErrorV) ? { status: 'ok', value: { dutyDistortionFraction, approximatePhaseVoltageErrorV } } : { status: 'insufficient_input', need: ['deadtime result must be finite'] };
}
