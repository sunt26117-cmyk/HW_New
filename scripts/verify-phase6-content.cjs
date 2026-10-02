const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const contentDir=path.join(root,'src','content');
const scanDirs=[path.join(root,'src','ui'),path.join(root,'src','core')];
const files=[];
for(const dir of scanDirs){
  const walk=(d)=>{for(const e of fs.readdirSync(d,{withFileTypes:true})){const f=path.join(d,e.name); if(e.isDirectory()) walk(f); else if(/\.(ts|tsx)$/.test(e.name)) files.push(f);}};
  walk(dir);
}
const literalRe=/['"]([^'"\n]{30,})['"]/g;
const values=new Map();
for(const file of files){
  const rel=path.relative(root,file);
  const s=fs.readFileSync(file,'utf8');
  let m;
  while((m=literalRe.exec(s))){
    const text=m[1];
    if(!/[\u3400-\u9fff]/.test(text)) continue;
    const normalized=text.replace(/\s+/g,' ').trim();
    if(!normalized) continue;
    const arr=values.get(normalized)||[]; arr.push(rel); values.set(normalized,arr);
  }
}
const duplicate=[...values.entries()].filter(([,paths])=>new Set(paths).size>1 && !paths.every(p=>p.startsWith('src/content/')));
if(duplicate.length){console.error('Duplicate static copy outside content:'); for(const [txt,paths] of duplicate) console.error(`- ${txt} -> ${[...new Set(paths)].join(', ')}`); process.exit(1);}
// Numeric explanatory sentences must live in content; formulas are structured Trace fields and are excluded.
const numericRisks=[];
for(const file of files){
  const rel=path.relative(root,file); const s=fs.readFileSync(file,'utf8');
  const withoutFormula=s.replace(/formula\s*:\s*['"][^'"\n]*['"]/g,'');
  if(!rel.startsWith('src/core/patterns/')) continue;
  if(/[\u3400-\u9fff][^\n'"`]*\d+(?:\.\d+)?[^\n'"`]*/.test(withoutFormula)) numericRisks.push(rel);
}
if(numericRisks.length){console.error('Numeric static sentence found in Pattern source:'); console.error(numericRisks.join('\n')); process.exit(1);}
if(!fs.existsSync(path.join(contentDir,'index.ts'))) throw new Error('content/index.ts missing');
console.log('✓ AUTOHW CORE PHASE 6 CONTENT POLICY PASS');
