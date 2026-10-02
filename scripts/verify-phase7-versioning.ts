import assert from 'node:assert/strict';
import { analyze } from '../src/app/analyze.ts';
import { diffAnalysis, type AnalysisSnapshot } from '../src/app/versioning.ts';
import { BLDC_HEALTHY, BLDC_P001_FAULT } from '../src/fixtures/bldc.ts';

const a: AnalysisSnapshot = { analysisId: 'A', savedAt: 'fixture', project: BLDC_HEALTHY, result: analyze(BLDC_HEALTHY) };
const b: AnalysisSnapshot = { analysisId: 'B', savedAt: 'fixture', project: BLDC_P001_FAULT, result: analyze(BLDC_P001_FAULT) };
const diff = diffAnalysis(a,b);
assert.ok(diff.changedInputs.includes('rpm'));
assert.ok(diff.changedPatterns.includes('BLDC.P001'));
assert.ok(diff.changedOptions.length > 0);
assert.ok(diff.vetoChanges.length > 0);
console.log('✓ AUTOHW CORE PHASE 7 VERSION/A-B VERIFY PASS');
