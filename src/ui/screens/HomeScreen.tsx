import type { AnalysisResult, EngineeringProject } from '../../core/model/contracts.ts';
import { navigate } from '../navigation.ts';

export function HomeScreen({ result, project }: { result: AnalysisResult; project: EngineeringProject }) {
  const dominant = result.judgment.patterns.find((p) => p.id === result.judgment.dominant);
  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
        <div className="text-xs text-slate-500">当前问题</div>
        <h1 className="mt-1 text-2xl font-semibold text-white">{project.issue.title || '尚未定义工程问题'}</h1>
        {project.issue.phenomenon && <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">{project.issue.phenomenon}</p>}
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-4"><div className="text-[11px] text-slate-500">主导机理</div><div className="mt-2 text-lg font-semibold">{dominant?.name ?? '证据不足'}</div><div className="mt-2 text-xs text-slate-400">风险：{dominant?.riskLevel ?? 'Unknown'}</div></section>
        <section className={`rounded-2xl border p-4 ${result.judgment.vetoes.length ? 'border-rose-800 bg-rose-950/20' : 'border-slate-800 bg-slate-900'}`}><div className="text-[11px] text-slate-500">VETO</div><div className="mt-2 text-lg font-semibold">{result.judgment.vetoes.length ? `${result.judgment.vetoes.length} 项` : '无'}</div><div className="mt-2 text-xs text-slate-400">来源只来自 Pattern。</div></section>
        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-4"><div className="text-[11px] text-slate-500">最佳下一步</div><div className="mt-2 text-sm font-semibold">{result.action.recommended ? (result.action.options.find((o) => o.id === result.action.recommended)?.title ?? '已生成候选方案') : '先补齐关键证据'}</div></section>
        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-4"><div className="text-[11px] text-slate-500">缺失输入</div><div className="mt-2 text-lg font-semibold">{result.facts.missing.length}</div><div className="mt-2 text-xs text-slate-400">缺参不会被默认值替代。</div></section>
      </div>

      {result.judgment.vetoes.length > 0 && <section className="rounded-2xl border border-rose-900/60 bg-rose-950/10 p-5"><h2 className="text-sm font-semibold text-rose-200">当前 VETO</h2><div className="mt-3 space-y-2">{result.judgment.vetoes.map((v) => <div key={v.patternId} className="rounded-xl border border-rose-900/40 bg-slate-950/40 p-3 text-sm"><span className="font-mono text-rose-300">{v.patternId}</span><span className="ml-3 text-slate-300">{v.reason || 'Pattern 已触发一票否决。'}</span></div>)}</div></section>}

      {result.facts.missing.length > 0 && <section className="rounded-2xl border border-amber-900/50 bg-amber-950/10 p-5"><div className="flex items-center justify-between gap-3"><h2 className="text-sm font-semibold text-amber-200">阻塞决策的缺失证据</h2><button onClick={() => navigate({ screen: 'input', sub: 'bldc' })} className="rounded-lg border border-amber-800 px-3 py-1.5 text-xs text-amber-200">去补输入</button></div><div className="mt-3 grid gap-2 md:grid-cols-2">{result.facts.missing.map((m) => <div key={m} className="rounded-lg border border-slate-800 bg-slate-950/50 p-2 text-xs text-slate-400">{m}</div>)}</div></section>}
    </div>
  );
}
