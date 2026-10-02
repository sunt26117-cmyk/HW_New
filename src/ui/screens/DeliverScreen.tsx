import { useState } from 'react';
import type { AnalysisResult, EngineeringProject } from '../../core/model/contracts.ts';
import { diffAnalysis, listAnalysisVersions, saveAnalysisVersion, type AnalysisSnapshot } from '../../app/versioning.ts';
import { runSystemSelfCheck, type SelfCheckReport } from '../../app/selfCheck.ts';

function downloadJson(result: AnalysisResult, project: EngineeringProject) {
  const payload = JSON.stringify({ project, result }, null, 2);
  const blob = new Blob([payload], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `autohw-${result.meta.analysisId.replace(/[^a-zA-Z0-9_.-]/g, '_')}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function DeliverScreen({ result, project }: { result: AnalysisResult; project: EngineeringProject }) {
  const [versions, setVersions] = useState<AnalysisSnapshot[]>([]);
  const [aId, setAId] = useState('');
  const [bId, setBId] = useState('');
  const [diff, setDiff] = useState<ReturnType<typeof diffAnalysis> | null>(null);
  const [selfCheck, setSelfCheck] = useState<SelfCheckReport | null>(null);
  const saveVersion = () => {
    const snapshot = saveAnalysisVersion(project, result);
    const next = listAnalysisVersions();
    setVersions(next);
    if (!aId) setAId(snapshot.analysisId); else if (!bId) setBId(snapshot.analysisId);
  };
  const refreshVersions = () => setVersions(listAnalysisVersions());

  return <div className="space-y-5">
    <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5"><h1 className="text-xl font-semibold">交付</h1><p className="mt-1 text-sm text-slate-400">这里负责当前分析身份、受控输出引用和本地交付；当前版本、历史快照与 A/B 比较均在本地保存。</p></section>
    <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-sm font-semibold">版本与 A/B</h2><p className="mt-1 text-xs text-slate-500">按 analysisId 保存快照；比较输入、Pattern/VETO 和候选方案变化。</p></div><div className="flex gap-2"><button onClick={saveVersion} className="rounded-lg border border-slate-700 px-3 py-2 text-xs">保存当前版本</button><button onClick={refreshVersions} className="rounded-lg border border-slate-700 px-3 py-2 text-xs">刷新版本</button></div></div>
      <div className="mt-4 grid gap-3 md:grid-cols-2"><select value={aId} onChange={(e)=>setAId(e.target.value)} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs"><option value="">A 版本</option>{versions.map((v)=><option key={v.analysisId} value={v.analysisId}>{v.analysisId}</option>)}</select><select value={bId} onChange={(e)=>setBId(e.target.value)} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs"><option value="">B 版本</option>{versions.map((v)=><option key={v.analysisId} value={v.analysisId}>{v.analysisId}</option>)}</select></div>
      <button disabled={!aId||!bId||aId===bId} onClick={()=>{const a=versions.find((v)=>v.analysisId===aId), b=versions.find((v)=>v.analysisId===bId); if(a&&b) setDiff(diffAnalysis(a,b));}} className="mt-3 rounded-lg border border-slate-700 px-3 py-2 text-xs disabled:opacity-40">比较 A / B</button>
      {diff && <div className="mt-4 grid gap-3 md:grid-cols-2"><div className="rounded-xl bg-slate-950/60 p-3 text-xs">输入变化：{diff.changedInputs.join(', ') || 'none'}</div><div className="rounded-xl bg-slate-950/60 p-3 text-xs">Pattern：{diff.changedPatterns.join(', ') || 'none'}</div><div className="rounded-xl bg-slate-950/60 p-3 text-xs">候选方案：{diff.changedOptions.join(', ') || 'none'}</div><div className="rounded-xl bg-slate-950/60 p-3 text-xs">VETO：{diff.vetoChanges.join('；') || 'none'}</div></div>}
    </section>

    <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5"><div className="flex items-center justify-between gap-3"><div><h2 className="text-sm font-semibold">离线系统自检</h2><p className="mt-1 text-xs text-slate-500">直接使用当前确定性 AnalysisResult，本地无网也可执行。</p></div><button onClick={()=>setSelfCheck(runSystemSelfCheck(project))} className="rounded-lg border border-slate-700 px-3 py-2 text-xs">运行自检</button></div>{selfCheck && <div className="mt-4 space-y-2"><div className="text-sm">{selfCheck.passed ? 'PASS' : 'FAIL'} · {selfCheck.passedCount}/{selfCheck.total}</div>{selfCheck.items.map((item)=><div key={item.id} className="rounded-lg bg-slate-950/60 p-2 text-xs">{item.passed ? '✓' : '✗'} {item.detail}</div>)}</div>}</section>

    <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5"><div><h2 className="text-sm font-semibold">交付材料</h2><p className="mt-1 text-xs text-slate-500">这里只管理受控文档入口与引用，不重新生成工程结论。</p></div><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{result.action.docs.map((doc)=><div key={doc.id} className="rounded-xl border border-slate-800 bg-slate-950/50 p-3"><div className="font-mono text-[10px] text-slate-500">{doc.id}</div><div className="mt-1 text-xs text-slate-300">{doc.title}</div></div>)}</div></section>
    <section className="grid gap-4 md:grid-cols-2"><div className="rounded-2xl border border-slate-800 bg-slate-900 p-5"><div className="text-[11px] text-slate-500">Analysis ID</div><div className="mt-2 break-all font-mono text-sm text-slate-200">{result.meta.analysisId}</div><div className="mt-4 text-[11px] text-slate-500">Input Hash</div><div className="mt-1 font-mono text-xs text-slate-300">{result.meta.inputHash}</div><div className="mt-4 text-[11px] text-slate-500">Engine</div><div className="mt-1 font-mono text-xs text-slate-300">{result.meta.engineVersion}</div></div>
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5"><div className="text-[11px] text-slate-500">受控文档引用</div><div className="mt-3 space-y-2">{result.action.docs.length ? result.action.docs.map((doc) => <div key={doc.id} className="rounded-lg border border-slate-800 bg-slate-950/50 p-3 text-xs"><span className="font-mono text-slate-500">{doc.id}</span><span className="ml-3 text-slate-300">{doc.title}</span></div>) : <div className="text-sm text-slate-500">本阶段尚未生成受控文档引用。</div>}</div><button onClick={() => downloadJson(result, project)} className="mt-4 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-200 hover:bg-slate-800">导出当前工程 + AnalysisResult</button></div></section>
  </div>;
}
