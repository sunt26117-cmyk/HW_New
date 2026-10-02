import { describe, expect, it } from 'vitest';
import { buildMarkers, computeMetrics, parseScopeCsv, resampleUniform, fftMagnitude, buildMeasurementsFromChannels } from '../src/core/evidence/waveform.ts';
import { buildWaveformBackfillPlan, allowMeasuredOverwrite } from '../src/core/evidence/waveformBackfill.ts';
import { compareDevices } from '../src/core/evidence/deviceCompare.ts';
import { buildDeviceCandidateImportPayload, getAutoImportCandidateIds } from '../src/core/evidence/deviceCandidateImport.ts';
import { runWcca } from '../src/core/tools/wcca.ts';
import { calculateTransientThermal } from '../src/core/tools/transientThermal.ts';
import { calculateVoltageMargin } from '../src/core/tools/voltageMargin.ts';
import { calculateCommutationRisk, calculateSafetyChain } from '../src/core/tools/motorDrive.ts';
import { calculateShortCircuitEnergy } from '../src/core/physics/shortCircuit.ts';

describe('waveform evidence', () => {
  it('parses comma and tab-delimited scope exports', () => {
    const csv = 'Time,CH1,CH2\n0,0,1\n1e-9,2,3\n2e-9,4,5';
    const tab = 'Time\tVgs\tVds\n0\t0\t1\n1e-9\t2\t3\n2e-9\t4\t5';
    expect(parseScopeCsv(csv).data?.channels.map((c) => c.name)).toEqual(['CH1', 'CH2']);
    expect(parseScopeCsv(csv).data?.sampleRateHz).toBeCloseTo(1e9, 6);
    expect(parseScopeCsv(tab).data?.channels.map((c) => c.name)).toEqual(['Vgs', 'Vds']);
    expect(parseScopeCsv('Time,V\n0,1\n0,2').ok).toBe(false);
  });

  it('uses 20-80 edge dv/dt and pre-trigger baseline, with ringing only when measurable', () => {
    const t = Array.from({ length: 401 }, (_, i) => i * 1e-9);
    const v = t.map((_, i) => i < 100 ? 48 : i < 120 ? 48 + (i - 100) * 0.8 : 64 + 3 * Math.exp(-(i - 120) / 45) * Math.cos((i - 120) * 0.55));
    const m = computeMetrics(t, v);
    expect(m.baselineLevel).toBe(48);
    expect(m.dvDtMethod).toBe('EDGE_20_80');
    expect(m.dvDtMaxVns).toBeGreaterThan(0.5);
    expect(m.ringingHz).not.toBeNull();
    expect(buildMarkers(t, v, m).length).toBeGreaterThan(0);
  });

  it('uniformly resamples jittered time before FFT', () => {
    const t = [0, 0.9e-9, 2.1e-9, 3e-9, 4.2e-9, 5.1e-9];
    const v = t.map((x) => Math.sin(2 * Math.PI * x * 1e8));
    const result = resampleUniform(t, v);
    expect(result.resampled).toBe(true);
    expect(result.time).toHaveLength(6);
    const diffs = result.time.slice(1).map((x, i) => x - result.time[i]);
    expect(Math.max(...diffs) - Math.min(...diffs)).toBeLessThan(1e-12);
    const spectrum = fftMagnitude(result.samples, 1 / (result.time[1] - result.time[0]));
    expect(spectrum.frequencyHz.length).toBeGreaterThan(0);
  });

  it('maps measured roles without mixing Vbus and Vds', () => {
    const channels = [
      { name: 'CH1', samples: [48, 49, 50] },
      { name: 'CH2', samples: [0, 6, 4] },
      { name: 'CH3', samples: [50, 55, 52] },
    ];
    const parsed = { time: [0, 1e-9, 2e-9], channels, sampleRateHz: 1e9, rowCount: 3 };
    const metrics = channels.map((c) => computeMetrics(parsed.time, c.samples));
    const out = buildMeasurementsFromChannels(parsed, ['vbus', 'vgs', 'vds'], 'scope.csv', '2026-10-02T00:00:00Z');
    expect(out.values.vbusPeakV).toBe(50);
    expect(out.values.gateSpikeMeasuredV).toBe(6);
    expect(out.values.vdsPeakV).toBe(55);
    expect(out.values.vbusMeasuredPeakV).toBe(50);
    expect(out.provenance.gateSpikeMeasuredV.source).toBe('IMPORTED');

    const onlyVds = buildMeasurementsFromChannels(parsed, ['none', 'none', 'vds'], 'scope.csv', '2026-10-02T00:00:00Z');
    expect(onlyVds.values.vbusMeasuredPeakV).toBeUndefined();
    expect(onlyVds.warnings.some((item) => item.includes('不会用 Vds 峰值代替'))).toBe(true);
  });
});


it('centers and zero-pads non-power-of-two FFT input without amplitude bias', () => {
    const samples = Array.from({ length: 6 }, (_, i) => 3 + Math.cos(2 * Math.PI * i / 8));
    const spectrum = fftMagnitude(samples, 8);
    const peak = Math.max(...spectrum.magnitude);
    expect(peak).toBeGreaterThan(0.5);
  });



describe('waveform backfill governance', () => {
  const baseProject = (overrides: Record<string, any> = {}) => ({
    meta: { projectId:'backfill', projectName:'backfill', domain:'BLDC' as const, phase:'EVT', at:'fixture' },
    issue: { title:'', quantities: { vbusNominalV:{status:'missing',unit:'V',need:'x'}, vbusMeasuredPeakV:{status:'missing',unit:'V',need:'x'}, gateSpikeMeasuredV:{status:'missing',unit:'V',need:'x'}, dvDtVns:{status:'missing',unit:'V/ns',need:'x'}, vdsRatingV:{status:'missing',unit:'V',need:'x'}, ...overrides } },
  });

  it('only emits canonical fields and marks existing measured values protected', () => {
    const parsed = { time:[0,1e-9,2e-9,3e-9,4e-9], channels:[{name:'Vbus',samples:[48,48,50,60,50]},{name:'Vgs',samples:[0,0,4,9,8]},{name:'Vds',samples:[48,48,95,60,50]}], sampleRateHz:1e9, rowCount:5 };
    const result = buildMeasurementsFromChannels(parsed, ['vbus','vgs','vds'], 'scope.csv', '2026-10-02T00:00:00Z');
    const project = baseProject({ gateSpikeMeasuredV:{status:'ok',value:8.5,unit:'V',evidence:'MEASURED',enteredAt:'fixture'} });
    const plan = buildWaveformBackfillPlan(project as any, result);
    expect(plan.apply.vbusMeasuredPeakV).toBe(60);
    expect(plan.apply.gateSpikeMeasuredV).toBeUndefined();
    expect(plan.protectedKeys).toContain('gateSpikeMeasuredV');
    expect(plan.apply.vdsPeakV).toBeUndefined();
  });

  it('explicit overwrite is required to replace an existing measured value', () => {
    const parsed = { time:[0,1e-9,2e-9,3e-9,4e-9], channels:[{name:'Vgs',samples:[0,0,4,9,8]}], sampleRateHz:1e9, rowCount:5 };
    const result = buildMeasurementsFromChannels(parsed, ['vgs'], 'scope.csv', '2026-10-02T00:00:00Z');
    const project = baseProject({ gateSpikeMeasuredV:{status:'ok',value:7.5,unit:'V',evidence:'MEASURED',enteredAt:'fixture'} });
    const plan = buildWaveformBackfillPlan(project as any, result);
    expect(plan.apply.gateSpikeMeasuredV).toBeUndefined();
    const overwrite = allowMeasuredOverwrite(project as any, plan);
    expect(overwrite.apply.gateSpikeMeasuredV).toBe(9);
  });
});

describe('device evidence', () => {
  it('protects measured values and imports direct datasheet values', () => {
    const fieldKeys = new Set(['vdsRatingV']);
    const direct = { id: 'd1', rawPath: 'ratings.vds', targetKey: 'vdsRatingV', label: 'VDS', unit: 'V', value: 80, sourceType: 'DATASHEET_DIRECT' as const, valueType: 'MAX' as const, confidence: 0.99, importable: true, mappingStatus: 'mapped' as const, candidateKind: 'DIRECT_SCALAR' as const, category: '功率级' as const };
    expect(getAutoImportCandidateIds([direct], { vdsRatingV: 60 }, { vdsRatingV: { source: 'MEASURED' } })).toEqual(new Set());
    const payload = buildDeviceCandidateImportPayload([direct], new Set(['d1']), { vdsRatingV: 60 }, 'DEV', '2026-10-02T00:00:00Z', new Set(), { vdsRatingV: { source: 'MEASURED' } });
    expect(payload.values).toEqual({});
    expect(payload.conflicts).toHaveLength(1);
  });

  it('compares two devices using mapped candidate provenance, without declaring substitution feasibility', () => {
    const left = { id:'l', deviceType:'MOSFET', partNumber:'L', manufacturer:'A', package:'', aecqGrade:'', channelType:'N', raw:{ ratings:{vds:{value:60}}, }, candidateDecisions:{}, candidateRequests:{}, createdAt:'', updatedAt:'' } as any;
    const right = { id:'r', deviceType:'MOSFET', partNumber:'R', manufacturer:'B', package:'', aecqGrade:'', channelType:'N', raw:{ ratings:{vds:{value:80}}, }, candidateDecisions:{}, candidateRequests:{}, createdAt:'', updatedAt:'' } as any;
    const comparison = compareDevices(left, right, new Set(['vdsRatingV']));
    expect(comparison.left.partNumber).toBe('L');
    expect(comparison.rows.some((row) => row.status === 'DIFFER')).toBe(true);
  });
});

describe('engineering tools', () => {
  it('is deterministic for WCCA with fixed seed', () => {
    const input = { components:[{id:'r',name:'R',nominal:10,initTolPercent:1,tempDriftPercent:0.5,agingPercent:0.2,distribution:'gaussian' as const}], targetErrorLimitPercent:5, iterations:1000, seed:7 };
    expect(runWcca(input).percentiles).toEqual(runWcca(input).percentiles);
  });
  it('returns finite transient thermal and voltage margin results', () => {
    const thermal = calculateTransientThermal({ambientTempC:60,biasPowerW:2,pulsePowerW:10,pulseWidthMs:2,tjMaxC:175,deratingMarginC:20,fosterStages:[{r:0.3,c:0.01},{r:1,c:0.1}]});
    expect(Number.isFinite(thermal.peakJunctionTempC)).toBe(true);
    const voltage = calculateVoltageMargin({nominalVoltage:12,regulatorTolerancePercent:2,lineAndSwitchDropMv:100,transientDipMv:200,minAllowedVoltage:11});
    expect(Number.isFinite(voltage.marginV)).toBe(true);
  });
  it('keeps motor/safety tools deterministic and catches short-circuit units', () => {
    expect(calculateCommutationRisk({controlMode:'foc_vector',speedMinRpm:500,speedMaxRpm:3000,angleOffsetDeg:2,torqueFluctuationPct:4}).angleRisk).toBe('normal');
    expect(calculateSafetyChain({fhtiBudgetMs:10,watchdogTimeoutMs:2,safeStateTransitionMs:3,currentSenseDeviationPct:1}).timingPass).toBe(true);
    const energy = calculateShortCircuitEnergy({vdsV:100,currentA:10,durationUs:100});
    expect(energy.status).toBe('ok');
    if (energy.status === 'ok') expect(energy.value).toBeCloseTo(0.1, 10);
  });
});
