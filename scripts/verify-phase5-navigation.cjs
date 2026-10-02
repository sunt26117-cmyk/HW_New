const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const model = fs.readFileSync(path.join(root, 'src/ui/navigationModel.ts'), 'utf8');
const nav = fs.readFileSync(path.join(root, 'src/ui/navigation.ts'), 'utf8');
const app = fs.readFileSync(path.join(root, 'src/app/WorkbenchApp.tsx'), 'utf8');
const screensDir = path.join(root, 'src/ui/screens');
const expected = ['HomeScreen.tsx','InputScreen.tsx','PhysicsScreen.tsx','PlanScreen.tsx','DeliverScreen.tsx'];
const errors=[];
if (!/export type Screen = 'home' \| 'input' \| 'physics' \| 'plan' \| 'deliver'/.test(model)) errors.push('Screen union missing');
if (!/useSyncExternalStore/.test(nav)) errors.push('navigation must use useSyncExternalStore');
if (!/export function navigate\(next: AppRoute\)/.test(nav)) errors.push('single navigate API missing');
if (!/isScreen\(value: string\)/.test(model)) errors.push('explicit screen guard missing');
for (const name of expected) if (!fs.existsSync(path.join(screensDir,name))) errors.push(`missing screen ${name}`);
for (const forbidden of ['core/physics','core/decision','calculateBusPumping','checkMillerRisk','calculateThermalCascade']) {
  for (const name of expected) {
    const s=fs.readFileSync(path.join(screensDir,name),'utf8');
    if (s.includes(forbidden)) errors.push(`${name} imports/calculates ${forbidden}`);
  }
}
if (!/ScreenErrorBoundary key=/.test(app) || !/route.screen/.test(app)) errors.push('per-screen error boundary is not keyed by screen/sub');
if (!/Object\.entries\(SHELL_CONTENT\.screens\)/.test(app)) errors.push('navigation is not table-driven');
if (errors.length) { console.error(errors.map(x=>'✗ '+x).join('\n')); process.exit(1); }
console.log('✓ AUTOHW CORE PHASE 5 NAVIGATION POLICY PASS');
