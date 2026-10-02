import type { Quantity } from '../model/contracts.ts';
import { requireInputs, validateNumericDomain, type PhysicsResult } from './result.ts';

export interface ControlBandwidthInput { resonanceHz: number | Quantity | undefined; loopBandwidthHz: number | Quantity | undefined; }
export function calculateBandwidthToResonanceRatio(input: ControlBandwidthInput): PhysicsResult<number> {
  const r = requireInputs([['resonanceHz', input.resonanceHz], ['loopBandwidthHz', input.loopBandwidthHz]]);
  if (r.status !== 'ok') return r;
  const domain = validateNumericDomain([{ name: 'resonanceHz', value: r.value.resonanceHz, minExclusive: 0 }, { name: 'loopBandwidthHz', value: r.value.loopBandwidthHz, min: 0 }]);
  if (domain.status !== 'ok') return domain;
  const ratio = r.value.loopBandwidthHz / r.value.resonanceHz;
  return Number.isFinite(ratio) ? { status: 'ok', value: ratio } : { status: 'insufficient_input', need: ['bandwidth ratio must be finite'] };
}
