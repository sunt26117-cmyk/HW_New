import type { Quantity } from '../model/contracts.ts';
import { calculateThermalCascade, calculateVthAtTemperature, type ThermalInput, type ThermalResult } from './thermal.ts';
import { checkMillerRisk, type MillerInput, type MillerResult } from './miller.ts';
import { type PhysicsResult } from './result.ts';

export interface ThermalMillerInput {
  thermal: ThermalInput;
  miller: Omit<MillerInput, 'vbusV'>;
  vbusV: number | Quantity | undefined;
  vth25V: number | Quantity | undefined;
  vthTempcoVPerC: number | Quantity | undefined;
}
export interface ThermalMillerResult { thermal: ThermalResult; vthAtTjV: number; miller: MillerResult; marginV: number; }

/** Thermal → Vth(Tj) → Miller induced Vgs. The returned margin is Vth(Tj)-Vgs_ind. */
export function calculateThermalMillerCascade(input: ThermalMillerInput): PhysicsResult<ThermalMillerResult> {
  const thermal = calculateThermalCascade(input.thermal);
  if (thermal.status !== 'ok') return thermal;
  const vth = calculateVthAtTemperature(input.vth25V, input.vthTempcoVPerC, thermal.value.estimatedTjC);
  if (vth.status !== 'ok') return vth;
  const miller = checkMillerRisk({ ...input.miller, vbusV: input.vbusV });
  if (miller.status !== 'ok') return miller;
  return { status: 'ok', value: { thermal: thermal.value, vthAtTjV: vth.value, miller: miller.value, marginV: vth.value - miller.value.theoreticalGateV } };
}
