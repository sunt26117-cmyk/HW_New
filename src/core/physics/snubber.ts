import type { Quantity } from '../model/contracts.ts';
import { requireInputs, validateNumericDomain, type PhysicsResult } from './result.ts';

export interface SnubberInput { inductanceNh: number | Quantity | undefined; capacitancePf: number | Quantity | undefined; }
export interface SnubberResult { resonantFrequencyHz: number; criticalDampingResistanceOhm: number; }

/** f0=1/(2π√LC); Rcrit=√(L/C). Actual damping target remains layout/measurement dependent. */
export function calculateSnubberTarget(input: SnubberInput): PhysicsResult<SnubberResult> {
  const r = requireInputs([['inductanceNh', input.inductanceNh], ['capacitancePf', input.capacitancePf]]);
  if (r.status !== 'ok') return r;
  const { inductanceNh, capacitancePf } = r.value;
  const domain = validateNumericDomain([{ name: 'inductanceNh', value: inductanceNh, minExclusive: 0 }, { name: 'capacitancePf', value: capacitancePf, minExclusive: 0 }]);
  if (domain.status !== 'ok') return domain;
  const L = inductanceNh * 1e-9;
  const C = capacitancePf * 1e-12;
  const resonantFrequencyHz = 1 / (2 * Math.PI * Math.sqrt(L * C));
  const criticalDampingResistanceOhm = Math.sqrt(L / C);
  return [resonantFrequencyHz, criticalDampingResistanceOhm].every(Number.isFinite) ? { status: 'ok', value: { resonantFrequencyHz, criticalDampingResistanceOhm } } : { status: 'insufficient_input', need: ['snubber result must be finite'] };
}
