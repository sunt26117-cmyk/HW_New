import assert from 'node:assert/strict';
import { analyze } from '../src/app/analyze.ts';
import { BLDC_HEALTHY, BLDC_MISSING, BLDC_P001_FAULT, BLDC_P003_FAULT, BLDC_P006_FAULT, BLDC_P016_FAULT } from '../src/fixtures/bldc.ts';
import { BLDC_PATTERN_REGISTRY, evaluateBldcPatterns } from '../src/core/patterns/bldc/registry.ts';
import { flatten, preferEvidence, deriveConfidence } from '../src/core/trace/trace.ts';

const failures: string[] = [];
function check(label: string, fn: () => void) {
  try { fn(); console.log(`✓ ${label}`); }
  catch (err) { failures.push(`${label}: ${err instanceof Error ? err.message : String(err)}`); console.log(`✗ ${label}`); }
}

check('Pattern registry only contains the Phase-3 BLDC set P001/P003/P006/P016', () => {
  assert.deepEqual(BLDC_PATTERN_REGISTRY.map((x) => x.id), ['P001', 'P003', 'P006', 'P016']);
});

check('Healthy state: no Phase-3 failure mode triggers', () => {
  const patterns = evaluateBldcPatterns(BLDC_HEALTHY);
  assert.deepEqual(patterns.filter((p) => p.triggered).map((p) => p.id), []);
  assert.deepEqual(patterns.filter((p) => p.veto.triggered).map((p) => p.id), []);
});

check('Missing state: P001 explicitly remains unknown and does not fabricate a result', () => {
  const p = evaluateBldcPatterns(BLDC_MISSING).find((x) => x.id === 'BLDC.P001')!;
  assert.equal(p.triggered, 'insufficient_input');
  assert.equal(p.veto.triggered, false);
  assert.ok(p.unknowns.some((x) => x.startsWith('rotorInertiaKgM2')));
  assert.equal(p.confidence, 'LOW');
});

for (const [label, project, patternId] of [
  ['P001 fault state', BLDC_P001_FAULT, 'BLDC.P001'],
  ['P003 fault state', BLDC_P003_FAULT, 'BLDC.P003'],
  ['P006 fault state', BLDC_P006_FAULT, 'BLDC.P006'],
  ['P016 fault state', BLDC_P016_FAULT, 'BLDC.P016'],
] as const) {
  check(label + ': detected and traced', () => {
    const p = evaluateBldcPatterns(project).find((x) => x.id === patternId)!;
    assert.equal(p.triggered, true);
    assert.ok(p.trace.length > 0);
    assert.ok(flatten(p.trace).every((n) => n.id && n.formula && n.inputs.length > 0));
    assert.ok(p.values.length > 0);
    assert.ok(p.values.every((v) => v.value.status === 'ok' || v.value.status === 'missing'));
    const traceText = JSON.stringify(p.trace);
    assert.ok(p.values.every((v) => v.value.status === 'missing' || traceText.includes(v.key)));
  });
}

check('P001 measured Vbus overrides theoretical calculation for the verdict', () => {
  const measuredFault = evaluateBldcPatterns({ ...BLDC_HEALTHY, issue: { ...BLDC_HEALTHY.issue, quantities: { ...BLDC_HEALTHY.issue.quantities, vbusMeasuredPeakV: { status: 'ok', value: 104, unit: 'V', evidence: 'MEASURED', enteredAt: 'fixture' }, vdsRatingV: { status: 'ok', value: 100, unit: 'V', evidence: 'DATASHEET', enteredAt: 'fixture' } } } }).find((x) => x.id === 'BLDC.P001')!;
  assert.equal(measuredFault.veto.triggered, true);
  assert.equal(measuredFault.values.find((v) => v.key === 'actualVbusPeakV')?.value.status, 'ok');
  assert.equal((measuredFault.values.find((v) => v.key === 'actualVbusPeakV')?.value as any).value, 104);
});

check('P003 measured Vgs overrides theoretical model for the verdict', () => {
  const p = evaluateBldcPatterns(BLDC_P003_FAULT).find((x) => x.id === 'BLDC.P003')!;
  assert.equal(p.veto.triggered, true);
  assert.equal((p.values.find((v) => v.key === 'actualGateV')?.value as any).value, 2.5);
});

check('Pattern values contain no NaN/Infinity and all returned objects are finite', () => {
  const patterns = evaluateBldcPatterns(BLDC_P001_FAULT);
  const raw = JSON.stringify(patterns);
  assert.equal(raw.includes('NaN'), false);
  assert.equal(raw.includes('Infinity'), false);
});

check('Measured evidence outranks derived/eassumption evidence for one quantity', () => {
  const current = { status: 'ok', value: 3, unit: 'V', evidence: 'DERIVED', enteredAt: 'fixture' } as const;
  const measured = { status: 'ok', value: 2.8, unit: 'V', evidence: 'MEASURED', enteredAt: 'fixture' } as const;
  const picked = preferEvidence(current, measured);
  assert.equal(picked.status === 'ok' ? picked.value : undefined, 2.8);
  assert.equal(deriveConfidence([{ id: 'x', title: 'x', inputs: [{ key: 'k', label: 'k', value: 2.8, evidence: 'MEASURED' }], degraded: false }]), 'HIGH');
});

check('AnalysisResult is three-layer and deterministic', () => {
  const result = analyze(BLDC_P001_FAULT);
  assert.equal(result.meta.source, 'DETERMINISTIC');
  assert.ok(result.meta.inputHash);
  assert.ok(result.meta.analysisId.includes(BLDC_P001_FAULT.meta.projectId));
  assert.ok(result.facts && result.judgment && result.action);
});

check('Changing one input changes inputHash and therefore analysis identity', () => {
  const a = analyze(BLDC_HEALTHY);
  const b = analyze({ ...BLDC_HEALTHY, issue: { ...BLDC_HEALTHY.issue, quantities: { rpm: { status: 'ok', value: 1200, unit: 'rpm', evidence: 'MEASURED', enteredAt: 'fixture' } } } });
  assert.notEqual(a.meta.inputHash, b.meta.inputHash);
  assert.notEqual(a.meta.analysisId, b.meta.analysisId);
});

check('AI boundary only accepts facts + judgment and cannot own veto/output mutation', () => {
  const result = analyze(BLDC_P001_FAULT);
  const requestShape = { facts: result.facts, judgment: result.judgment };
  assert.equal('action' in requestShape, false);
  assert.ok(Array.isArray(requestShape.judgment.vetoes));
});

if (failures.length) {
  console.error(`\n${failures.length} failures`);
  for (const failure of failures) console.error(' - ' + failure);
  process.exit(1);
}
console.log('\nAUTOHW CORE PHASE 0-3 VERIFY PASS');
