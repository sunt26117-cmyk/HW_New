import { calculateBusPumping } from '../../core/physics/busPumping.ts';
import { checkMillerRisk } from '../../core/physics/miller.ts';
import { calculateThermalCascade } from '../../core/physics/thermal.ts';
import { calculateProtectionTiming } from '../../core/physics/shortCircuit.ts';
import { calculateSnubberTarget } from '../../core/physics/snubber.ts';
import { calculateDeadtimeDistortion } from '../../core/physics/deadtime.ts';
import { calculateBandwidthToResonanceRatio } from '../../core/physics/controlBandwidth.ts';

export const calculatorApi = {
  bus: (vbusNominalV:number, cbusUf:number, inertia:number, rpm:number, efficiency:number, absorbedJ:number) => calculateBusPumping({vbusNominalV, cbusUf, rotorInertiaKgM2:inertia, rpm, efficiency, absorbedEnergyJ:absorbedJ}),
  miller: (vbusV:number, dvDtVns:number, cgdPf:number, rgOffOhm:number, vthMinV:number, sourceInductanceNh?:number, diDtANs?:number, cgsPf?:number) => {
    const result = checkMillerRisk({vbusV, dvDtVns, cgdPf, rgOffOhm, sourceInductanceNh, diDtANs, cgsPf});
    if (result.status !== 'ok') return result;
    return { ...result, value: { ...result.value, vthMinV, thresholdMarginV: vthMinV - result.value.theoreticalGateV } };
  },
  thermal: (ambientC:number, currentRmsA:number, rdsOnMilliOhm:number, alphaPerC:number, rthCPerW:number, tjMaxC:number) => calculateThermalCascade({baseTemperatureC:ambientC, currentRmsA, rdsOn25MilliOhm:rdsOnMilliOhm, alphaPerC, rthCPerW, tjMaxC}),
  protection: (senseDelayNs:number, comparatorDelayNs:number, filterDelayNs:number, driverDelayNs:number, gateTurnOffDelayNs:number, currentFallDelayNs:number, soaTimeUs:number) => calculateProtectionTiming({senseDelayNs, comparatorDelayNs, filterDelayNs, driverDelayNs, gateTurnOffDelayNs, currentFallDelayNs, soaTimeUs}),
  snubber: (inductanceNh:number, capacitancePf:number) => calculateSnubberTarget({inductanceNh, capacitancePf}),
  deadtime: (vbusV:number, deadtimeNs:number, switchingPeriodNs:number) => calculateDeadtimeDistortion({vbusV, deadtimeNs, switchingPeriodNs}),
  bandwidth: (resonanceHz:number, loopBandwidthHz:number) => calculateBandwidthToResonanceRatio({resonanceHz, loopBandwidthHz}),
};
