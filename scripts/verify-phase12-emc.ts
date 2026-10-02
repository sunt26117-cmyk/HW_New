import { evaluateEmcPatterns } from '../src/core/patterns/emc/registry.ts';
import { EMC_BCI_MISSING, EMC_BCI_PASS, EMC_BCI_FAIL } from '../src/fixtures/emc.ts';

function assert(condition: unknown, message: string): asserts condition { if (!condition) throw new Error(message); }
const missing = evaluateEmcPatterns(EMC_BCI_MISSING.issue);
const pass = evaluateEmcPatterns(EMC_BCI_PASS.issue);
const fail = evaluateEmcPatterns(EMC_BCI_FAIL.issue);
const p = (patterns: ReturnType<typeof evaluateEmcPatterns>, id: string) => patterns.find((item) => item.id === id);
assert(p(missing, 'EMC.P001')?.triggered === 'insufficient_input', 'EMC P001 missing evidence regression');
assert(p(missing, 'EMC.C001')?.triggered === 'insufficient_input', 'EMC C001 missing coverage regression');
assert(p(pass, 'EMC.P001')?.triggered === false && p(pass, 'EMC.P001')?.veto.triggered === false, 'EMC BCI pass regression');
assert(p(fail, 'EMC.P001')?.triggered === true && p(fail, 'EMC.P001')?.riskLevel === 'High', 'EMC BCI failure regression');
assert(p(fail, 'EMC.P001')?.veto.triggered === false, 'EMC P001 must not invent a VETO');
assert(p(fail, 'EMC.C001')?.triggered === false, 'EMC coverage checklist should remain a checklist when complete');
console.log('AUTOHW CORE PHASE 12 EMC/BCI VERIFY PASS');
