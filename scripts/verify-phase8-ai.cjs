const fs=require('node:fs'); const path=require('node:path'); const root=path.resolve(__dirname,'..');
const audit=fs.readFileSync(path.join(root,'src/core/ai/audit.ts'),'utf8');
const prompt=fs.readFileSync(path.join(root,'src/core/ai/prompt.ts'),'utf8');
for(const needle of ['rejectedNumbers','invalidTraceIds','AI_CONTENT','citedTraceIds',"source:'AI_ENHANCED'"]) {
  if(!audit.includes(needle)&&!prompt.includes(needle)) throw new Error('AI audit boundary missing: '+needle);
}
if(/veto\s*[:=].*false/i.test(audit)) throw new Error('AI layer appears to mutate VETO');
console.log('✓ AUTOHW CORE PHASE 8 AI POLICY PASS');
