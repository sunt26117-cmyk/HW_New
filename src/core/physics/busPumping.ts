import type { Quantity } from '../model/contracts.ts';
import { requireInputs, resolveInput, validateNumericDomain, type PhysicsResult } from './result.ts';

export interface BusPumpingInput {
  vbusNominalV: number | Quantity | undefined;
  cbusUf: number | Quantity | undefined;
  rotorInertiaKgM2: number | Quantity | undefined;
  rpm: number | Quantity | undefined;
  efficiency: number | Quantity | undefined;
  absorbedEnergyJ: number | Quantity | undefined;
}

export interface BusPumpingResult { kineticEnergyJ: number; recoverableEnergyJ: number; vbusPeakV: number; deltaV: number; }

/** E=1/2·J·ω²·η; 1/2·C·(Vpk²−V0²)=E. Efficiency is explicit, never hidden. */
export function calculateBusPumping(input: BusPumpingInput): PhysicsResult<BusPumpingResult> {
  const r = requireInputs([
    ['vbusNominalV', input.vbusNominalV], ['cbusUf', input.cbusUf], ['rotorInertiaKgM2', input.rotorInertiaKgM2], ['rpm', input.rpm], ['efficiency', input.efficiency], ['absorbedEnergyJ', input.absorbedEnergyJ],
  ]);
  if (r.status !== 'ok') return r;
  const etaResult = resolveInput('efficiency', input.efficiency);
  const absorbedResult = resolveInput('absorbedEnergyJ', input.absorbedEnergyJ);
  if (etaResult.status !== 'ok' || etaResult.value < 0 || etaResult.value > 1) return { status: 'insufficient_input', need: ['efficiency (0..1)'] };
  if (absorbedResult.status !== 'ok' || absorbedResult.value < 0) return { status: 'insufficient_input', need: ['absorbedEnergyJ >= 0'] };
  const eta = etaResult.value; const absorbedEnergyJ = absorbedResult.value;
  const { vbusNominalV, cbusUf, rotorInertiaKgM2, rpm } = r.value;
  const domain = validateNumericDomain([
    { name: 'vbusNominalV', value: vbusNominalV, minExclusive: 0 },
    { name: 'cbusUf', value: cbusUf, minExclusive: 0 },
    { name: 'rotorInertiaKgM2', value: rotorInertiaKgM2, min: 0 },
    { name: 'rpm', value: rpm, min: 0 },
  ]);
  if (domain.status !== 'ok') return domain;
  const omega = rpm * (2 * Math.PI / 60);
  const kineticEnergyJ = 0.5 * rotorInertiaKgM2 * omega * omega;
  const recoverableEnergyJ = Math.max(0, kineticEnergyJ * eta - absorbedEnergyJ);
  const cF = cbusUf * 1e-6;
  const vbusPeakV = Math.sqrt(Math.max(0, vbusNominalV ** 2 + (2 * recoverableEnergyJ) / cF));
  if (!Number.isFinite(vbusPeakV)) return { status: 'insufficient_input', need: ['bus pumping result must be finite'] };
  return { status: 'ok', value: { kineticEnergyJ, recoverableEnergyJ, vbusPeakV, deltaV: vbusPeakV - vbusNominalV } };
}
