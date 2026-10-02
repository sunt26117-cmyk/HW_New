import type { AnalysisResult } from '../../core/model/contracts.ts';
import { TraceViewer } from '../components/TraceViewer.tsx';

export function PhysicsScreen({ result }: { result: AnalysisResult }) {
  return <div className="space-y-4">
    <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5"><h1 className="text-xl font-semibold">物理与机理</h1><p className="mt-1 text-sm text-slate-400">按当前风险顺序展开 Pattern；所有数字来自 values/Trace，不在界面重新计算。</p></section>
    {result.judgment.patterns.map((pattern) => <section key={pattern.id} className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><div className="text-[11px] font-mono text-slate-500">{pattern.id}</div><h2 className="mt-1 text-base font-semibold">{pattern.name}</h2></div><div className="flex gap-2 text-[10px]"><span className="rounded-full border border-slate-700 px-2 py-1">{pattern.kind}</span><span className={`rounded-full border px-2 py-1 ${pattern.riskLevel === 'Critical' ? 'border-rose-800 text-rose-300' : pattern.riskLevel === 'High' ? 'border-amber-800 text-amber-300' : 'border-slate-700 text-slate-400'}`}>{pattern.riskLevel}</span><span className="rounded-full border border-slate-700 px-2 py-1">{pattern.triggered === 'insufficient_input' ? 'INSUFFICIENT_INPUT' : pattern.triggered ? 'TRIGGERED' : 'NOT TRIGGERED'}</span></div></div>
      <div className="mt-4 grid gap-3 md:grid-cols-2">{pattern.values.map((item) => <div key={item.key} className="rounded-xl border border-slate-800 bg-slate-950/50 p-3"><div className="text-xs text-slate-400">{item.label}</div><div className="mt-2 font-mono text-lg">{item.value.status === 'ok' ? `${item.value.value} ${item.value.unit}` : `缺失 · ${item.value.need}`}</div>{item.margin && <div className="mt-2 text-[11px] text-slate-500">margin {item.margin.actual} / {item.margin.limit} {item.margin.unit} · {item.margin.verdict}</div>}</div>)}</div>
      {pattern.trace.length > 0 && <details className="mt-4"><summary className="cursor-pointer text-xs font-medium text-slate-300">展开 Trace</summary><div className="mt-3"><TraceViewer traces={pattern.trace} /></div></details>}
      {pattern.unknowns.length > 0 && <div className="mt-4 rounded-xl border border-amber-900/50 bg-amber-950/10 p-3 text-xs text-amber-300">未知量：{pattern.unknowns.join('；')}</div>}
    </section>)}
  </div>;
}
