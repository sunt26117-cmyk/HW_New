import type { Quantity } from '../model/contracts.ts';
import { requireInputs, validateNumericDomain, type PhysicsResult } from './result.ts';

export interface DualMassResonanceInput { motorInertiaKgM2: number | Quantity | undefined; loadInertiaKgM2: number | Quantity | undefined; torsionalStiffnessNmPerRad: number | Quantity | undefined; }
export function calculateDualMassResonance(input: DualMassResonanceInput): PhysicsResult<number> {
  const r = requireInputs([['motorInertiaKgM2', input.motorInertiaKgM2], ['loadInertiaKgM2', input.loadInertiaKgM2], ['torsionalStiffnessNmPerRad', input.torsionalStiffnessNmPerRad]]);
  if (r.status !== 'ok') return r;
  const { motorInertiaKgM2: Jm, loadInertiaKgM2: Jl, torsionalStiffnessNmPerRad: Kt } = r.value;
  const domain = validateNumericDomain([{ name: 'motorInertiaKgM2', value: Jm, minExclusive: 0 }, { name: 'loadInertiaKgM2', value: Jl, minExclusive: 0 }, { name: 'torsionalStiffnessNmPerRad', value: Kt, minExclusive: 0 }]);
  if (domain.status !== 'ok') return domain;
  const Jeq = (Jm * Jl) / (Jm + Jl);
  const frequencyHz = Math.sqrt(Kt / Jeq) / (2 * Math.PI);
  return Number.isFinite(frequencyHz) ? { status: 'ok', value: frequencyHz } : { status: 'insufficient_input', need: ['resonance frequency result must be finite'] };
}
