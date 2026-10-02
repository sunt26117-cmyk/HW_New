import assert from 'node:assert/strict';
import { GOLD_CASES } from '../src/fixtures/gold/index.ts';
import { withinGoldTolerance } from '../src/core/gold/contracts.ts';
assert.equal(GOLD_CASES.length, 0);
assert.equal(withinGoldTolerance(5.1, { key:'x', unit:'V', expected:5, toleranceAbsolute:0.2, source:'MEASURED', rationale:'bench' }), true);
console.log('AUTOHW CORE PHASE 15 GOLD GOVERNANCE PASS');
