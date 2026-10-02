const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const core = path.join(root, 'src', 'core');
const read = (p) => fs.readFileSync(p, 'utf8');
const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]);
const tsFiles = walk(core).filter((p) => p.endsWith('.ts'));
const patterns = walk(path.join(core, 'patterns', 'bldc')).filter((p) => p.endsWith('.ts'));
const failures = [];
const check = (ok, msg) => { if (!ok) failures.push(msg); };

for (const p of tsFiles) {
  const s = read(p);
  check(!/from\s+['"]react(?:-|['"])/.test(s) && !/from\s+['"]react-dom(?:-|['"])/.test(s), `core imports React: ${path.relative(root, p)}`);
  check(!/\b(window|document|fetch)\b/.test(s), `core touches DOM/network: ${path.relative(root, p)}`);
  check(!/\|\|\s*0\b/.test(s), `core uses || 0 default: ${path.relative(root, p)}`);
  check(!/\?\?\s*0\b/.test(s), `core uses ?? 0 default: ${path.relative(root, p)}`);
  check(!/leadershipEngine|HwLeadStyle|CONSERVATIVE|AGILE_DELIVERY|PROCESS_DEFENSIVE|Nash|甩锅|免责防御|心理/.test(s), `legacy leadership/game-theory content leaked into core: ${path.relative(root, p)}`);
}

const patternFiles = patterns.filter((p) => /\/P\d+\.ts$/.test(p));
for (const p of patternFiles) {
  const s = read(p);
  check(/insufficient_input/.test(s), `Pattern lacks insufficient_input branch: ${path.relative(root, p)}`);
  check(!/from\s+['"][.]{1,2}\/P\d+/.test(s), `Pattern imports another Pattern: ${path.relative(root, p)}`);
}
const registry = read(path.join(core, 'patterns', 'bldc', 'registry.ts'));
check(/P001/.test(registry) && /P003/.test(registry) && /P006/.test(registry) && /P016/.test(registry), 'Phase-3 registry missing one of P001/P003/P006/P016');
const content = read(path.join(root, 'src', 'content', 'bldc.ts'));
check(!/\b\d+(?:\.\d+)?\s*(V|A|W|Hz|rpm|°C|µs|ns|µF|mΩ|Ω)\b/.test(content), 'content/bldc.ts contains hard-coded engineering numeric sentence');

if (failures.length) { console.error(failures.map((x) => '✗ ' + x).join('\n')); process.exit(1); }
console.log('✓ AUTOHW CORE PHASE 0-3 POLICY PASS');
