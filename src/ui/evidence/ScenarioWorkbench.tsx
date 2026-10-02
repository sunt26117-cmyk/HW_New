import { useState } from 'react';
import type { EngineeringProject } from '../../core/model/contracts.ts';
import { SCENARIO_TEMPLATES, applyScenarioTemplate } from '../../content/scenarios.ts';
import { deleteScenario, loadSavedScenarios, saveScenario, type SavedScenario } from '../../app/evidence/scenarioRepository.ts';

export function ScenarioWorkbench({ project, onProjectChange }: { project: EngineeringProject; onProjectChange: (project: EngineeringProject)=>void }) {
  const [saved, setSaved] = useState<SavedScenario[]>(() => loadSavedScenarios());
  const [name, setName] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const loadTemplate = (id: string) => {
    const template = SCENARIO_TEMPLATES.find((x) => x.id === id); if (!template) return;
    onProjectChange(applyScenarioTemplate(template, project));
    setNotice(`已载入模板“${template.name}”；没有自动填入任何数值，原有工程证据保留。`);
  };
  const save = () => { const next = saveScenario(name || project.issue.title || project.meta.projectName, project); setSaved(next); setName(''); setNotice('当前工程工况已保存到本机。'); };
  return <section className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 shadow-xl shadow-black/10"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-lg font-semibold">工况与工程案卷</h2><p className="mt-1 text-xs text-slate-400">模板只写工程语境，不写隐藏计算值；保存/恢复的是当前完整工程输入与证据。</p></div><div className="flex gap-2"><input value={name} onChange={(e)=>setName(e.target.value)} placeholder="保存名称" className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs outline-none"/><button onClick={save} className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-medium">保存当前工况</button></div></div>{notice&&<div className="mt-3 rounded-lg border border-slate-800 bg-slate-950/50 px-3 py-2 text-xs text-slate-400">{notice}</div>}
    <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">{SCENARIO_TEMPLATES.map((t)=><button key={t.id} onClick={()=>loadTemplate(t.id)} className="rounded-xl border border-slate-800 bg-slate-950/45 p-4 text-left transition hover:border-blue-500/30 hover:bg-blue-500/5"><div className="flex items-center justify-between gap-2"><span className="text-sm font-semibold">{t.name}</span><span className="rounded-full border border-slate-700 px-2 py-0.5 text-[9px] text-slate-500">{t.domain}</span></div><p className="mt-2 text-[11px] leading-relaxed text-slate-500">{t.description}</p></button>)}</div>
    <div className="mt-5"><div className="text-sm font-semibold">已保存工况</div><div className="mt-3 space-y-2">{saved.length===0?<div className="text-xs text-slate-600">暂无保存案卷。</div>:saved.map((item)=><div key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2"><div><div className="text-xs font-medium text-slate-200">{item.name}</div><div className="text-[10px] text-slate-500">{item.project.issue.title || '未命名问题'} · {new Date(item.savedAt).toLocaleString()}</div></div><div className="flex gap-1"><button onClick={()=>{onProjectChange(structuredClone(item.project));setNotice(`已恢复“${item.name}”。`);}} className="rounded-lg border border-slate-700 px-2.5 py-1.5 text-[10px] text-slate-300">恢复</button><button onClick={()=>setSaved(deleteScenario(item.id))} className="rounded-lg border border-red-500/20 px-2.5 py-1.5 text-[10px] text-red-300">删除</button></div></div>)}</div></div>
  </section>;
}
