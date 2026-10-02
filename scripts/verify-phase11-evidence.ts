import { parseScopeCsv, resampleUniform, buildMeasurementsFromChannels, fftMagnitude } from '../src/core/evidence/waveform.ts';
import { runWcca } from '../src/core/tools/wcca.ts';
import { calculateShortCircuitEnergy } from '../src/core/physics/shortCircuit.ts';
import { buildWorkspaceBackup } from '../src/app/workspaceBackup.ts';

function assert(condition: unknown, message: string): asserts condition { if (!condition) throw new Error(message); }

const csv = 'Time\tVgs\tVds\n0\t0\t48\n1e-9\t2\t55\n2e-9\t4\t50';
const parsed = parseScopeCsv(csv);
assert(parsed.ok && parsed.data, 'tab scope parse failed');
assert(Math.abs((parsed.data?.sampleRateHz ?? 0) - 1e9) < 1, 'scope sample rate precision regression');
const measurement = buildMeasurementsFromChannels(parsed.data, ['vgs','vds'], 'scope.txt', '2026-10-02T00:00:00Z');
assert(measurement.values.gateSpikeMeasuredV === 4, 'Vgs measurement mapping failed');
assert(measurement.values.vdsPeakV === 55, 'Vds measurement mapping failed');
assert(measurement.values.vbusMeasuredPeakV === undefined, 'Vds was incorrectly mapped to Vbus');
const uniform = resampleUniform([0, 0.9, 2.1, 3.0], [0, 1, 0, -1]);
assert(uniform.resampled, 'uniform resample did not activate');
const diffs = uniform.time.slice(1).map((x, i) => x - uniform.time[i]);
assert(Math.max(...diffs) - Math.min(...diffs) < 1e-12, 'resampled time is not uniform');
const fft = fftMagnitude([3,4,3,2,3,4], 8);
assert(Math.max(...fft.magnitude) > 0.5, 'non-power-of-two FFT amplitude regression');
const wccaInput = { components:[{id:'x',name:'R',nominal:10,initTolPercent:1,tempDriftPercent:1,agingPercent:1,distribution:'gaussian' as const}], targetErrorLimitPercent:5, iterations:100, seed:11 };
assert(JSON.stringify(runWcca(wccaInput)) === JSON.stringify(runWcca(wccaInput)), 'WCCA is not deterministic');
const energy = calculateShortCircuitEnergy({vdsV:100,currentA:10,durationUs:100});
assert(energy.status === 'ok' && Math.abs(energy.value - 0.1) < 1e-12, 'short-circuit energy unit regression');
const backup = buildWorkspaceBackup({meta:{projectId:'p',projectName:'',domain:'BLDC',phase:'EVT',at:'x'},issue:{title:'',phenomenon:'',requirement:'',testCondition:'',quantities:{}}}, '2026-10-02T00:00:00Z');
assert(backup.app === 'AutoHW Core' && backup.backupVersion === 'autohw-workspace-v2', 'workspace backup contract failed');
console.log('AUTOHW CORE PHASE 11 EVIDENCE VERIFY PASS');
