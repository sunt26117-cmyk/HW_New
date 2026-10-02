const fs=require('node:fs'); const path=require('node:path'); const root=path.resolve(__dirname,'..');
const delivery=fs.readFileSync(path.join(root,'src/ui/screens/DeliverScreen.tsx'),'utf8'); const build=fs.readFileSync(path.join(root,'vite.config.offline.ts'),'utf8');
if(!/runSystemSelfCheck\(project\)/.test(delivery)) throw new Error('browser self-check missing');
if(!/viteSingleFile\(\)/.test(build)) throw new Error('single-file Vite plugin missing');
if(!/dist-offline/.test(build)) throw new Error('offline output path missing');
console.log('✓ AUTOHW CORE PHASE 9 OFFLINE POLICY PASS');
