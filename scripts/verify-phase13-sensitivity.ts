import { strict as assert } from 'node:assert';
import { runBldcSensitivity } from '../src/app/sensitivity.ts';
import { BLDC_HEALTHY, BLDC_MISSING } from '../src/fixtures/bldc.ts';

const report = runBldcSensitivity(BLDC_HEALTHY, 20);
assert.ok(report.rows.length > 0);
assert.ok(report.rows.some((row) => row.key === 'currentRmsA'));
assert.ok(report.rows.every((row) => Number.isFinite(row.lowMetric) && Number.isFinite(row.highMetric) && Number.isFinite(row.normalizedImpactPct)));
const missing = runBldcSensitivity(BLDC_MISSING, 20);
assert.ok(missing.skipped.some((item) => item.key === 'rotorInertiaKgM2'));
console.log('AUTOHW CORE PHASE 13 SENSITIVITY VERIFY PASS');
