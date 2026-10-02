import { useMemo } from 'react';
import type { EngineeringProject } from '../../core/model/contracts.ts';
import { runBldcSensitivity } from '../../app/sensitivity.ts';

export function SensitivityPanel({ project }: { project: EngineeringProject }) {
  const report = useMemo(() => {
    try { return runBldcSensitivity(project, 20); } catch { return undefined; }
  }, [project]);
  if (project.meta.domain !== 'BLDC') return <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5 text-sm text-slate-400">当前工程域暂未提供 BLDC 单参敏感度扫描。</section>;
  if (!report) return <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5 text-sm text-rose-300">当前输入无法完成敏感度扫描，请先检查工程输入。</section>;
  return <div className="space-y-4">
    <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><div className="text-[11px] uppercase tracking-[.18em] text-blue-300">Decision Support</div><h2 className="mt-1 text-base font-semibold">单参敏感度 Tornado</h2><p className="mt-1 text-xs text-slate-500">单独改变一个当前工程输入，其余输入保持不变；结果来自重新执行当前 deterministic analysis。</p></div>
        <div className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-400">扫描范围 ±{report.percent}%</div>
      </div>
    </section>
    {report.rows.length === 0 && <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5 text-sm text-slate-400">当前没有足够的可扫描输入。缺失候选：{report.skipped.length} 项。</section>}
    {report.rows.length > 0 && (() => {
      const priorityRows = report.rows.filter((row) => row.measurementPriorityPct > 0).sort((a, b) => b.measurementPriorityPct - a.measurementPriorityPct).slice(0, 3);
      const targetGroups = ['BLDC.P006', 'BLDC.P001', 'BLDC.P003'] as const;
      return <>
        {priorityRows.length > 0 && <section className="rounded-2xl border border-blue-900/40 bg-blue-950/10 p-5">
          <div className="text-[11px] uppercase tracking-[.18em] text-blue-300">Measurement Priority</div>
          <h3 className="mt-1 text-base font-semibold">优先补高质量证据</h3>
          <div className="mt-4 grid gap-3 md:grid-cols-3">{priorityRows.map((row, index) => <div key={row.key} className="rounded-xl border border-slate-800 bg-slate-950/50 p-4"><div className="text-[10px] text-slate-600">#{index + 1} · {row.targetPatternId}</div><div className="mt-1 text-sm font-medium text-slate-200">{row.label}</div><div className="mt-2 font-mono text-sm text-emerald-300">{row.measurementPriorityPct.toFixed(1)}%</div><div className="mt-1 text-[10px] text-slate-500">当前证据：{row.evidence} · 目标：{row.metricLabel}</div></div>)}</div>
        </section>}
        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <div className="text-[11px] uppercase tracking-wider text-slate-500">Tornado View</div>
          <div className="mt-4 space-y-5">{targetGroups.map((target) => {
            const rows = report.rows.filter((row) => row.targetPatternId === target);
            if (!rows.length) return null;
            const scale = Math.max(...rows.flatMap((row) => [Math.abs(row.lowDelta), Math.abs(row.highDelta)]), 1e-9);
            return <div key={target}><div className="mb-2 text-xs font-medium text-slate-300">{target} · {rows[0].metricLabel}</div><div className="space-y-2">{rows.slice(0, 8).map((row) => <div key={row.key} className="grid grid-cols-[150px_1fr] gap-3 items-center"><div className="truncate text-[11px] text-slate-400" title={row.label}>{row.label}</div><div className="space-y-1"><div className="flex items-center gap-2"><div className="ml-auto h-2 rounded-l bg-blue-500/60" style={{ width: `${(Math.abs(row.lowDelta) / scale) * 46}%` }} /><span className="w-28 text-right font-mono text-[10px] text-slate-500">低端 Δ {row.lowDelta >= 0 ? '+' : ''}{row.lowDelta.toFixed(3)}</span></div><div className="flex items-center gap-2"><div className="ml-auto h-2 rounded-l bg-amber-500/60" style={{ width: `${(Math.abs(row.highDelta) / scale) * 46}%` }} /><span className="w-28 text-right font-mono text-[10px] text-slate-500">高端 Δ {row.highDelta >= 0 ? '+' : ''}{row.highDelta.toFixed(3)}</span></div></div></div>)}</div></div>;
          })}</div>
        </section>
        <section className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <table className="w-full min-w-[980px] text-left text-xs"><thead><tr className="border-b border-slate-800 text-slate-500"><th className="px-2 py-2">输入</th><th className="px-2 py-2">证据</th><th className="px-2 py-2">目标</th><th className="px-2 py-2">基线</th><th className="px-2 py-2">低端</th><th className="px-2 py-2">高端</th><th className="px-2 py-2">影响</th><th className="px-2 py-2">实测价值</th></tr></thead>
            <tbody>{report.rows.map((row) => <tr key={row.key} className="border-b border-slate-900"><td className="px-2 py-3"><div className="font-medium text-slate-200">{row.label}</div><div className="font-mono text-[10px] text-slate-600">{row.key}</div></td><td className="px-2 py-3 text-slate-400">{row.evidence}</td><td className="px-2 py-3 text-slate-400">{row.targetPatternId}<div className="text-[10px] text-slate-600">{row.metricLabel}</div></td><td className="px-2 py-3 font-mono">{row.baselineInput} {row.unit}<div className="text-[10px] text-slate-500">→ {row.baselineMetric} {row.metricLabel}</div></td><td className="px-2 py-3 font-mono text-slate-400">{row.lowInput} {row.unit}<div>{row.lowMetric} · Δ {row.lowDelta >= 0 ? '+' : ''}{row.lowDelta}</div></td><td className="px-2 py-3 font-mono text-slate-400">{row.highInput} {row.unit}<div>{row.highMetric} · Δ {row.highDelta >= 0 ? '+' : ''}{row.highDelta}</div></td><td className="px-2 py-3 font-mono text-blue-300">{row.normalizedImpactPct.toFixed(1)}%</td><td className="px-2 py-3 font-mono text-emerald-300">{row.measurementPriorityPct.toFixed(1)}%</td></tr>)}</tbody>
          </table>
        </section>
      </>;
    })()}
    <section className="rounded-2xl border border-slate-800 bg-slate-900 p-4 text-[11px] text-slate-500">“影响”是相对当前目标量尺度的敏感度，不替代 Pattern 风险结论；“实测价值”额外考虑当前证据是否已经是实测/导入，用于提示哪些参数更值得优先获取高质量证据。</section>
    {report.skipped.length > 0 && <details className="rounded-2xl border border-slate-800 bg-slate-900 p-4"><summary className="cursor-pointer text-xs text-slate-400">未进入扫描的输入：{report.skipped.length} 项</summary><div className="mt-3 space-y-2">{report.skipped.map((item) => <div key={item.key} className="text-[11px] text-slate-500"><span className="font-medium text-slate-300">{item.label}</span> · {item.reason}</div>)}</div></details>}
  </div>;
}
