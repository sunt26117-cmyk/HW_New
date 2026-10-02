import type { AnalysisResult, EngineeringProject } from '../../core/model/contracts.ts';
import { navigate, useNavigation } from '../navigation.ts';
import { TraceViewer } from '../components/TraceViewer.tsx';
import { CalculatorPanel } from '../tools/CalculatorPanel.tsx';
import { SensitivityPanel } from '../tools/SensitivityPanel.tsx';

export function PhysicsScreen({ result, project }: { result: AnalysisResult; project: EngineeringProject }) {
  const route = useNavigation();
  const tab = route.sub === 'calculators' ? 'calculators' : route.sub === 'sensitivity' ? 'sensitivity' : 'patterns';
  return <div className="space-y-5">
    <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5"><div className="flex flex-wrap items-end justify-between gap-4"><div><div className="text-[11px] uppercase tracking-[.18em] text-blue-300">Deterministic Physics</div><h1 className="mt-1 text-xl font-semibold">物理与机理</h1><p className="mt-1 text-sm text-slate-400">正式风险结论来自当前 AnalysisResult；计算器用于工程推演，必须明确输入后才能计算。</p></div><div className="flex flex-wrap gap-1">{([['patterns','Pattern / Trace'],['calculators','工程计算器'],['sensitivity','敏感度 Tornado']] as const).map(([id,label]) => <button key={id} onClick={() => navigate({screen:'physics', sub:id})} className={`rounded-lg px-3 py-2 text-xs ${tab===id?'border border-blue-500/30 bg-blue-600/20 text-blue-300':'text-slate-400 hover:bg-slate-800'}`}>{label}</button>)}</div></div></section>
    {tab === 'patterns' && result.judgment.patterns.map((pattern) => <section key={pattern.id} className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><div className="text-[11px] font-mono text-slate-500">{pattern.id}</div><h2 className="mt-1 text-base font-semibold">{pattern.name}</h2></div><div className="flex flex-wrap gap-2 text-[10px]"><span className="rounded-full border border-slate-700 px-2 py-1">{pattern.kind}</span><span className={`rounded-full border px-2 py-1 ${pattern.riskLevel==='Critical'?'border-rose-800 text-rose-300':pattern.riskLevel==='High'?'border-amber-800 text-amber-300':'border-slate-700 text-slate-400'}`}>{pattern.riskLevel}</span><span className="rounded-full border border-slate-700 px-2 py-1">{pattern.triggered==='insufficient_input'?'INSUFFICIENT_INPUT':pattern.triggered?'TRIGGERED':'NOT TRIGGERED'}</span>{pattern.veto.triggered&&<span className="rounded-full border border-rose-800 bg-rose-950/30 px-2 py-1 text-rose-300">VETO</span>}</div></div>
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">{pattern.values.map((item)=><div key={item.key} className="rounded-xl border border-slate-800 bg-slate-950/50 p-3"><div className="text-xs text-slate-400">{item.label}</div><div className="mt-2 font-mono text-lg">{item.value.status==='ok'?`${item.value.value} ${item.value.unit}`:`缺失 · ${item.value.need}`}</div>{item.margin&&<div className="mt-2 text-[11px] text-slate-500">margin {item.margin.actual} / {item.margin.limit} {item.margin.unit} · {item.margin.verdict}</div>}<div className="mt-2 text-[10px] text-slate-600">证据：{item.value.status==='ok'?item.value.evidence:'—'}</div></div>)}</div>
      {pattern.veto.triggered&&<div className="mt-4 rounded-xl border border-rose-800/50 bg-rose-950/15 px-3 py-2 text-xs text-rose-200">VETO：{pattern.veto.reason}</div>}
      {pattern.trace.length>0&&<details className="mt-4"><summary className="cursor-pointer text-xs font-medium text-slate-300">Trace / 公式 / 输入证据</summary><div className="mt-3"><TraceViewer traces={pattern.trace}/></div></details>}
      {pattern.unknowns.length>0&&<div className="mt-4 rounded-xl border border-amber-900/50 bg-amber-950/10 p-3 text-xs text-amber-300">未知量：{pattern.unknowns.join('；')}</div>}
      {pattern.verification.length>0&&<div className="mt-4"><div className="text-[11px] uppercase tracking-wider text-slate-500">验证入口</div><div className="mt-2 flex flex-wrap gap-2">{pattern.verification.map(v=><span key={v} className="rounded-full border border-slate-800 bg-slate-950/50 px-2.5 py-1.5 text-[10px] text-slate-400">{v}</span>)}</div></div>}
    </section>)}
    {tab === 'calculators' && <CalculatorPanel project={project}/>}
    {tab === 'sensitivity' && <SensitivityPanel project={project}/>}
  </div>;
}
