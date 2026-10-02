import assert from 'node:assert/strict';
import { buildMeasurementsFromChannels, computeMetrics, resampleUniform } from '../src/core/evidence/waveform.ts';
import { buildWaveformBackfillPlan } from '../src/core/evidence/waveformBackfill.ts';
import type { EngineeringProject, Quantity } from '../src/core/model/contracts.ts';

const missing = (unit: string): Quantity => ({ status: 'missing', unit, need: 'test' });
const project: EngineeringProject = {
  meta: { projectId: 'phase14', projectName: 'phase14', domain: 'BLDC', phase: 'EVT', at: 'test' },
  issue: { title: 'waveform', quantities: {
    vbusNominalV: missing('V'), vbusMeasuredPeakV: missing('V'), gateSpikeMeasuredV: missing('V'), dvDtVns: missing('V/ns'),
    vdsRatingV: missing('V'),
  } },
};
const parsed = { time: [0, 1e-9, 2e-9, 3e-9, 4e-9, 5e-9], channels: [
  { name: 'Vbus', samples: [48,48,48,60,52,50] },
  { name: 'Vgs', samples: [0,0,4,8,10,9] },
  { name: 'Vds', samples: [48,48,95,60,52,50] },
], sampleRateHz: 1e9, rowCount: 6 };
const measurements = buildMeasurementsFromChannels(parsed, ['vbus','vgs','vds'], 'phase14.csv', '2026-10-02T00:00:00Z');
const plan = buildWaveformBackfillPlan(project, measurements);
assert.equal(plan.apply.vbusMeasuredPeakV, 60);
assert.equal(plan.apply.gateSpikeMeasuredV, 10);
assert.ok(Number.isFinite(plan.apply.dvDtVns));
assert.ok(plan.warnings.some((item) => item.includes('vdsPeakV')));
assert.equal(plan.candidates.find((item) => item.key === 'vdsPeakV')?.action, 'SKIP_NON_CANONICAL');
const protectedProject: EngineeringProject = { ...project, issue: { ...project.issue, quantities: { ...project.issue.quantities, gateSpikeMeasuredV: { status:'ok', value: 9, unit:'V', evidence:'MEASURED', enteredAt:'fixture' } } } };
const protectedPlan = buildWaveformBackfillPlan(protectedProject, measurements);
assert.ok(protectedPlan.protectedKeys.includes('gateSpikeMeasuredV'));
const jitterT = [0, .9e-9, 2.1e-9, 3e-9, 4.2e-9];
const uniform = resampleUniform(jitterT, jitterT.map((x) => x));
const diffs = uniform.time.slice(1).map((x, i) => x - uniform.time[i]);
assert.ok(Math.max(...diffs) - Math.min(...diffs) < 1e-18);
console.log('AUTOHW CORE PHASE 14 VERIFY PASS');
