import type { Quantity } from '../model/contracts.ts';
import { requireInputs, validateNumericDomain, type PhysicsResult } from './result.ts';

export interface MillerInput {
  cgdPf: number | Quantity | undefined;
  rgOffOhm: number | Quantity | undefined;
  dvDtVns: number | Quantity | undefined;
  vbusV: number | Quantity | undefined;
  cgsPf?: number | Quantity;
  sourceInductanceNh?: number | Quantity;
  diDtANs?: number | Quantity;
}

export interface MillerResult { millerCurrentA: number; resistiveBoundV: number; capacitiveBoundV?: number; inductiveOvershootV?: number; theoreticalGateV: number; }

export function checkMillerRisk(input: MillerInput): PhysicsResult<MillerResult> {
  const r = requireInputs([['cgdPf', input.cgdPf], ['rgOffOhm', input.rgOffOhm], ['dvDtVns', input.dvDtVns], ['vbusV', input.vbusV]]);
  if (r.status !== 'ok') return r;
  const { cgdPf, rgOffOhm, dvDtVns, vbusV } = r.value;
  const domain = validateNumericDomain([
    { name: 'cgdPf', value: cgdPf, min: 0 },
    { name: 'rgOffOhm', value: rgOffOhm, min: 0 },
    { name: 'dvDtVns', value: dvDtVns, min: 0 },
    { name: 'vbusV', value: vbusV, minExclusive: 0 },
  ]);
  if (domain.status !== 'ok') return domain;
  const millerCurrentA = cgdPf * 1e-12 * (dvDtVns * 1e9);
  const resistiveBoundV = millerCurrentA * rgOffOhm;
  const cgs = input.cgsPf === undefined ? undefined : (typeof input.cgsPf === 'number' ? input.cgsPf : input.cgsPf.status === 'ok' ? input.cgsPf.value : undefined);
  const capacitiveBoundV = cgs !== undefined && cgs > 0 ? (cgdPf / cgs) * vbusV : undefined;
  const l = input.sourceInductanceNh === undefined ? undefined : (typeof input.sourceInductanceNh === 'number' ? input.sourceInductanceNh : input.sourceInductanceNh.status === 'ok' ? input.sourceInductanceNh.value : undefined);
  const didt = input.diDtANs === undefined ? undefined : (typeof input.diDtANs === 'number' ? input.diDtANs : input.diDtANs.status === 'ok' ? input.diDtANs.value : undefined);
  const inductiveOvershootV = l !== undefined && didt !== undefined ? l * didt : undefined;
  const coupling = capacitiveBoundV === undefined ? resistiveBoundV : Math.min(resistiveBoundV, capacitiveBoundV);
  const theoreticalGateV = coupling + (inductiveOvershootV === undefined ? 0 : inductiveOvershootV);
  if (!Number.isFinite(theoreticalGateV)) return { status: 'insufficient_input', need: ['Miller result must be finite'] };
  return { status: 'ok', value: { millerCurrentA, resistiveBoundV, capacitiveBoundV, inductiveOvershootV, theoreticalGateV } };
}
