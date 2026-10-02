import assert from 'node:assert/strict';
import { evaluateEmcPatterns } from '../src/core/patterns/emc/registry.ts';
import { EMC_BCI_MISSING, EMC_BCI_PASS, EMC_BCI_FAIL } from '../src/fixtures/emc.ts';
const pick=(p:any,id:string)=>evaluateEmcPatterns(p.issue).find((x)=>x.id===id);
assert.equal(pick(EMC_BCI_MISSING,'EMC.C002').triggered,'insufficient_input');
assert.equal(pick(EMC_BCI_PASS,'EMC.C002').triggered,false);
assert.equal(pick(EMC_BCI_FAIL,'EMC.C002').triggered,false);
assert.equal(pick(EMC_BCI_FAIL,'EMC.C002').trace.length > 0,true);
console.log('AUTOHW CORE PHASE 16 EMC CAUSALITY VERIFY PASS');
