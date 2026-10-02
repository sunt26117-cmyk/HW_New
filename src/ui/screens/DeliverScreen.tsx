import { useRef, useState } from 'react';
import type { AnalysisResult, EngineeringProject } from '../../core/model/contracts.ts';
import { diffAnalysis, listAnalysisVersions, saveAnalysisVersion, type AnalysisSnapshot } from '../../app/versioning.ts';
import { runSystemSelfCheck, type SelfCheckReport } from '../../app/selfCheck.ts';
import { buildWorkspaceBackup, parseWorkspaceBackup, restoreWorkspaceBackup } from '../../app/workspaceBackup.ts';
import { navigate, useNavigation } from '../navigation.ts';

function downloadText(fileName: string, content: string, type = 'application/json') {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = fileName; a.click(); URL.revokeObjectURL(url);
}

const RACI_ROWS = [
  ['问题定义 / 事实冻结', '工程负责人', '系统负责人', '验证工程师', '项目/质量'],
  ['波形与规格证据确认', '硬件工程师', '系统负责人', '测试工程师', '质量'],
  ['风险 Pattern 评审', '硬件/系统工程师', '技术负责人', '验证工程师', '质量'],
  ['措施实施与回归验证', '执行工程师', '项目负责人', '验证/测试', '质量'],
  ['受控发布与问题关闭', '工程负责人', '项目负责人', '验证工程师', '质量'],
] as const;

export function DeliverScreen({ result, project, onProjectChange }: { result: AnalysisResult; project: EngineeringProject; onProjectChange: (project: EngineeringProject) => void }) {
  const route = useNavigation();
  const tab = (['package','raci','docs','versions','backup'].includes(route.sub ?? '') ? route.sub : 'package') as 'package'|'raci'|'docs'|'versions'|'backup';
  const [versions, setVersions] = useState<AnalysisSnapshot[]>(() => listAnalysisVersions());
  const [aId, setAId] = useState('');
  const [bId, setBId] = useState('');
  const [diff, setDiff] = useState<ReturnType<typeof diffAnalysis> | null>(null);
  const [selfCheck, setSelfCheck] = useState<SelfCheckReport | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const backupRef = useRef<HTMLInputElement>(null);

  const saveVersion = () => { const snapshot = saveAnalysisVersion(project, result); const next = listAnalysisVersions(); setVersions(next); if (!aId) setAId(snapshot.analysisId); else if (!bId) setBId(snapshot.analysisId); setNotice(`已保存版本 ${snapshot.analysisId}`); };
  const runDiff = () => { const a=versions.find((v)=>v.analysisId===aId), b=versions.find((v)=>v.analysisId===bId); if(a&&b) setDiff(diffAnalysis(a,b)); };
  const exportAnalysis = () => downloadText(`autohw-${result.meta.analysisId}.json`, JSON.stringify({project,result},null,2));
  const exportBackup = () => downloadText(`autohw-workspace-${result.meta.analysisId}.json`, JSON.stringify(buildWorkspaceBackup(project),null,2));
  const importBackup = async (file: File) => {
    const parsed = parseWorkspaceBackup(await file.text());
    if (!parsed.ok) { setNotice(parsed.error); return; }
    const restored = restoreWorkspaceBackup(parsed.backup); onProjectChange(restored.project); setNotice(`工作区已恢复。${restored.warnings.join(' ')}`);
  };

  const tabs = [['package','交付包'],['raci','技术 RACI'],['docs','EDR / 受控'],['versions','版本 / A-B'],['backup','备份 / 恢复']] as const;
  return <div className="space-y-5">
    <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5"><div className="flex flex-wrap items-end justify-between gap-4"><div><div className="text-[11px] uppercase tracking-[.18em] text-blue-300">Controlled Delivery</div><h1 className="mt-1 text-xl font-semibold">交付</h1><p className="mt-1 text-sm text-slate-400">把当前事实、判断、行动和证据打成可复核的工程案卷；不在交付层重新发明风险结论。</p></div><div className="flex flex-wrap gap-1">{tabs.map(([id,label])=><button key={id} onClick={()=>navigate({screen:'deliver',sub:id})} className={`rounded-lg px-3 py-2 text-xs ${tab===id?'border border-blue-500/30 bg-blue-600/20 text-blue-300':'text-slate-400 hover:bg-slate-800'}`}>{label}</button>)}</div></div>{notice&&<div className="mt-4 rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2 text-xs text-slate-300">{notice}</div>}</section>

    {tab==='package' && <section className="grid gap-4 lg:grid-cols-[1.1fr_.9fr]">
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5"><h2 className="text-sm font-semibold">当前交付包</h2><div className="mt-4 grid gap-3 sm:grid-cols-2"><MetaCard label="Analysis ID" value={result.meta.analysisId}/><MetaCard label="Input Hash" value={result.meta.inputHash}/><MetaCard label="Engine" value={result.meta.engineVersion}/><MetaCard label="Source" value={result.meta.source}/></div><div className="mt-4 flex flex-wrap gap-2"><button onClick={exportAnalysis} className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold">导出工程 + AnalysisResult</button><button onClick={()=>setSelfCheck(runSystemSelfCheck(project))} className="rounded-lg border border-slate-700 px-3 py-2 text-xs">运行系统自检</button><button onClick={()=>navigate({screen:'deliver',sub:'backup'})} className="rounded-lg border border-slate-700 px-3 py-2 text-xs">工作区备份</button></div>{selfCheck&&<div className="mt-4 space-y-2"><div className={selfCheck.passed?'text-emerald-300':'text-rose-300'}>{selfCheck.passed?'PASS':'FAIL'} · {selfCheck.passedCount}/{selfCheck.total}</div>{selfCheck.items.map(i=><div key={i.id} className="rounded-lg bg-slate-950/60 p-2 text-xs">{i.passed?'✓':'✗'} {i.detail}</div>)}</div>}</div>
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5"><h2 className="text-sm font-semibold">交付内容索引</h2><div className="mt-3 grid gap-2">{result.action.docs.map(doc=><button key={doc.id} onClick={()=>navigate({screen:'deliver',sub:doc.id==='RACI'?'raci':'docs'})} className="rounded-xl border border-slate-800 bg-slate-950/50 p-3 text-left hover:border-blue-500/30"><div className="font-mono text-[10px] text-slate-500">{doc.id}</div><div className="mt-1 text-xs text-slate-200">{doc.title}</div></button>)}</div></div>
    </section>}

    {tab==='raci' && <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5"><h2 className="text-sm font-semibold">技术行动 RACI</h2><p className="mt-1 text-xs text-slate-500">只描述工程责任与交付动作，不做人员性格、博弈或心理判断。</p><div className="mt-4 overflow-x-auto"><table className="min-w-full text-left text-xs"><thead className="bg-slate-950/80 text-slate-500"><tr>{['工程动作','R','A','C','I'].map(h=><th key={h} className="px-3 py-3">{h}</th>)}</tr></thead><tbody>{RACI_ROWS.map(row=><tr key={row[0]} className="border-t border-slate-800">{row.map((cell,i)=><td key={`${row[0]}-${i}`} className="px-3 py-3 text-slate-300">{cell}</td>)}</tr>)}</tbody></table></div></section>}

    {tab==='docs' && <section className="space-y-4"><DocPanel id="EDR" title="工程决策记录" result={result} kind="decision"/><DocPanel id="CONTROLLED" title="受控工程文档" result={result} kind="controlled"/></section>}

    {tab==='versions' && <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-sm font-semibold">版本历史与 A/B</h2><p className="mt-1 text-xs text-slate-500">保存当前工程快照，比较输入、Pattern、VETO 与候选方案变化。</p></div><div className="flex gap-2"><button onClick={saveVersion} className="rounded-lg bg-blue-600 px-3 py-2 text-xs">保存当前版本</button><button onClick={()=>setVersions(listAnalysisVersions())} className="rounded-lg border border-slate-700 px-3 py-2 text-xs">刷新</button></div></div><div className="mt-4 grid gap-3 md:grid-cols-2"><select value={aId} onChange={e=>setAId(e.target.value)} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs"><option value="">A 版本</option>{versions.map(v=><option key={v.analysisId} value={v.analysisId}>{v.analysisId}</option>)}</select><select value={bId} onChange={e=>setBId(e.target.value)} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs"><option value="">B 版本</option>{versions.map(v=><option key={v.analysisId} value={v.analysisId}>{v.analysisId}</option>)}</select></div><button disabled={!aId||!bId||aId===bId} onClick={runDiff} className="mt-3 rounded-lg border border-slate-700 px-3 py-2 text-xs disabled:opacity-40">比较 A / B</button>{diff&&<div className="mt-4 grid gap-3 md:grid-cols-2"><DiffCard title="输入变化" values={diff.changedInputs}/><DiffCard title="Pattern 变化" values={diff.changedPatterns}/><DiffCard title="方案变化" values={diff.changedOptions}/><DiffCard title="VETO 变化" values={diff.vetoChanges}/></div>}<div className="mt-5 space-y-2">{versions.map(v=><div key={v.analysisId} className="rounded-lg border border-slate-800 bg-slate-950/40 p-3"><div className="font-mono text-xs text-slate-200">{v.analysisId}</div><div className="mt-1 text-[10px] text-slate-500">{v.engineVersion} · {v.at}</div></div>)}{versions.length===0&&<div className="text-xs text-slate-600">暂无保存版本。</div>}</div></section>}

    {tab==='backup' && <section className="grid gap-4 md:grid-cols-2"><div className="rounded-2xl border border-slate-800 bg-slate-900 p-5"><h2 className="text-sm font-semibold">完整工作区备份</h2><p className="mt-1 text-xs leading-relaxed text-slate-500">包含当前工程、器件库、示波器已保存证据、工况案卷和分析版本。用于换电脑/回滚，而不是只导出一份当前结果。</p><button onClick={exportBackup} className="mt-4 rounded-lg bg-blue-600 px-3 py-2 text-xs">导出工作区备份</button></div><div className="rounded-2xl border border-slate-800 bg-slate-900 p-5"><h2 className="text-sm font-semibold">恢复工作区</h2><p className="mt-1 text-xs text-slate-500">恢复后会刷新本地库；请确认备份来自可信工程环境。</p><input ref={backupRef} type="file" accept="application/json,.json" className="hidden" onChange={e=>{const f=e.target.files?.[0]; if(f) void importBackup(f); e.currentTarget.value='';}}/><button onClick={()=>backupRef.current?.click()} className="mt-4 rounded-lg border border-slate-700 px-3 py-2 text-xs">选择备份 JSON</button></div></section>}
  </div>;
}

function MetaCard({label,value}:{label:string;value:string}){return <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-3"><div className="text-[10px] text-slate-500">{label}</div><div className="mt-1 break-all font-mono text-xs text-slate-200">{value}</div></div>}
function DiffCard({title,values}:{title:string;values:string[]}){return <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-3"><div className="text-[10px] text-slate-500">{title}</div><div className="mt-2 text-xs text-slate-300">{values.length?values.join('、'):'无变化'}</div></div>}
function DocPanel({id,title,result,kind}:{id:string;title:string;result:AnalysisResult;kind:'decision'|'8d'|'controlled'}){
  const veto=result.judgment.vetoes.map(v=>`${v.patternId}${v.reason?` · ${v.reason}`:''}`).join('；') || '当前无 VETO';
  const options=result.action.options.map(o=>o.title).join('；') || '当前无候选方案';
  const checks=result.action.options.flatMap(o=>o.verification).filter((v,i,a)=>a.indexOf(v)===i).join('；') || '暂无验证清单';
  const body=kind==='decision'
    ? `工程问题：${result.meta.analysisId}\n主导机理：${result.judgment.dominant||'暂无'}\nVETO：${veto}\n候选方案：${options}\n验证：${checks}`
    : kind==='8d'
      ? `D2 问题描述：${result.meta.analysisId}\nD3 遏制：${result.action.timeline.containment.map(i=>i.title).join('；')||'暂无'}\nD4 根因候选：${result.judgment.patterns.filter(p=>p.triggered===true).map(p=>p.id).join('、')||'暂无'}\nD5/D6 永久纠正与验证：${result.action.timeline.permanent.map(i=>i.title).join('；')||'暂无'}`
      : `受控对象：AutoHW Core AnalysisResult\n版本：${result.meta.analysisId}\n输入指纹：${result.meta.inputHash}\n发动机版本：${result.meta.engineVersion}\n来源：${result.meta.source}`;
  return <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><div className="font-mono text-[10px] text-slate-500">{id}</div><h2 className="mt-1 text-sm font-semibold">{title}</h2><p className="mt-1 text-xs text-slate-500">由当前 AnalysisResult 组织，不重新生成数字。</p></div><button onClick={()=>downloadText(`autohw-${id}-${result.meta.analysisId}.txt`,body,'text/plain')} className="rounded-lg border border-slate-700 px-3 py-2 text-xs">导出文本</button></div><pre className="mt-4 whitespace-pre-wrap rounded-xl border border-slate-800 bg-slate-950/50 p-4 text-[11px] leading-relaxed text-slate-300">{body}</pre></section>;
}
