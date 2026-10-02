import { calculateThermalCascade } from '../src/core/physics/thermal.ts';
import { calculateBusPumping } from '../src/core/physics/busPumping.ts';
import { checkMillerRisk } from '../src/core/physics/miller.ts';
import { calculateProtectionTiming } from '../src/core/physics/shortCircuit.ts';
import { calculateDeadtimeDistortion } from '../src/core/physics/deadtime.ts';
import { calculateSnubberTarget } from '../src/core/physics/snubber.ts';
import { calculateBandwidthToResonanceRatio } from '../src/core/physics/controlBandwidth.ts';
import { calculateDualMassResonance } from '../src/core/physics/jointResonance.ts';
import { patternStateFromPhysics } from '../src/core/physics/result.ts';
import { evaluateP006 } from '../src/core/patterns/bldc/P006.ts';
import { deriveBldcEvaluationInput } from '../src/core/derive/bldc.ts';
import { BLDC_HEALTHY, BLDC_P006_OVER_TEMP_STABLE, BLDC_P006_RUNAWAY } from '../src/fixtures/bldc.ts';

function assert(condition: unknown, message: string): void { if (!condition) throw new Error(message); }

const healthy = calculateThermalCascade({ baseTemperatureC: 80, currentRmsA: 50, rdsOn25MilliOhm: 10, rthCPerW: 1, alphaPerC: 0.002, tjMaxC: 150 }, 1);
assert(healthy.status === 'ok' && healthy.value.steadyStateExists && healthy.value.feedbackGain < 1, 'safe thermal case must remain solvable with tiny fixed-point budget');

const runaway = calculateThermalCascade({ baseTemperatureC: 125, currentRmsA: 80, rdsOn25MilliOhm: 6, rthCPerW: 35, alphaPerC: 0.01, tjMaxC: 175 });
assert(runaway.status === 'diverged', 'true runaway fixture must be diverged');

const overTempStable = calculateThermalCascade({ baseTemperatureC: 80, currentRmsA: 50, rdsOn25MilliOhm: 10, rthCPerW: 1, alphaPerC: 0.002, tjMaxC: 110 });
assert(overTempStable.status === 'ok' && overTempStable.value.estimatedTjC > 110, 'stable but over-Tjmax case must remain a solvable physics result');
const overTempStablePattern = evaluateP006(deriveBldcEvaluationInput(BLDC_P006_OVER_TEMP_STABLE.issue));
assert(overTempStablePattern.triggered === true && overTempStablePattern.veto.triggered && overTempStablePattern.trace.some(n => n.id === 'BLDC.P006.estimatedTjC'), 'stable over-Tjmax P006 regression failed');

for (const bad of [
  calculateThermalCascade({ baseTemperatureC: 25, currentRmsA: -1, rdsOn25MilliOhm: 5, rthCPerW: 1, alphaPerC: 0.002, tjMaxC: 150 }),
  calculateBusPumping({ vbusNominalV: 0, cbusUf: 100, rotorInertiaKgM2: 1e-4, rpm: 1000, efficiency: 1, absorbedEnergyJ: 0 }),
  checkMillerRisk({ cgdPf: 20, rgOffOhm: 4.7, dvDtVns: -1, vbusV: 48 }),
  calculateProtectionTiming({ senseDelayNs: -1, comparatorDelayNs: 1, filterDelayNs: 1, driverDelayNs: 1, gateTurnOffDelayNs: 1, currentFallDelayNs: 1, soaTimeUs: 2 }),
  calculateDeadtimeDistortion({ vbusV: 0, deadtimeNs: 10, switchingPeriodNs: 100 }),
  calculateSnubberTarget({ inductanceNh: 0, capacitancePf: 100 }),
  calculateBandwidthToResonanceRatio({ resonanceHz: 0, loopBandwidthHz: 100 }),
  calculateDualMassResonance({ motorInertiaKgM2: 0, loadInertiaKgM2: 1, torsionalStiffnessNmPerRad: 100 }),
]) assert(bad.status === 'insufficient_input', `invalid physics input leaked into formula: ${bad.status}`);

const mappedMissing = patternStateFromPhysics({ status: 'insufficient_input', need: ['x'] });
assert(mappedMissing.triggered === 'insufficient_input' && !mappedMissing.veto.triggered, 'missing input mapping failed');
const mappedDiverged = patternStateFromPhysics({ status: 'diverged', reason: 'no steady state' });
assert(mappedDiverged.triggered === true && mappedDiverged.veto.triggered && mappedDiverged.riskLevel === 'Critical', 'diverged mapping failed');

const p = evaluateP006(deriveBldcEvaluationInput(BLDC_P006_RUNAWAY.issue));
assert(p.triggered === true && p.veto.triggered && p.riskLevel === 'Critical' && p.trace.some(n => n.id === 'BLDC.P006.thermalRunaway'), 'P006 runaway VETO regression failed');
const healthyP = evaluateP006(deriveBldcEvaluationInput(BLDC_HEALTHY.issue));
assert(healthyP.triggered === false && !healthyP.veto.triggered, 'healthy P006 regression failed');

console.log('AUTOHW CORE PHASE 10 PHYSICS SAFETY VERIFY PASS');
