import type { TraceNode } from '../../core/model/contracts.ts';

function Node({ node, depth }: { node: TraceNode; depth: number }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3" style={{ marginLeft: depth * 10 }}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-medium text-slate-100">{node.title}</div>
          <div className="mt-1 text-[11px] text-slate-500">Trace · {node.id}</div>
        </div>
        {node.verdict && <span className={`rounded-full border px-2 py-0.5 text-[10px] ${node.verdict === 'FAIL' ? 'border-rose-700 text-rose-300' : node.verdict === 'WARN' ? 'border-amber-700 text-amber-300' : 'border-emerald-700 text-emerald-300'}`}>{node.verdict}</span>}
      </div>
      {node.formula && <div className="mt-3 rounded-lg bg-slate-900 p-2 font-mono text-[11px] text-slate-300">{node.formula}</div>}
      {node.standardRef && <div className="mt-2 text-[11px] text-slate-500">基准：{node.standardRef}</div>}
      <div className="mt-3 space-y-1">
        {node.inputs.map((input) => (
          <div key={`${node.id}:${input.key}`} className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-900 pt-1 text-[11px]">
            <span className="text-slate-500">{input.label}</span>
            <span className="font-mono text-slate-200">{String(input.value)} · {input.evidence}{input.evidenceId ? ` · ${input.evidenceId}` : ''}</span>
          </div>
        ))}
      </div>
      {node.children?.map((child) => <Node key={child.id} node={child} depth={depth + 1} />)}
    </div>
  );
}

export function TraceViewer({ traces }: { traces: TraceNode[] }) {
  return (
    <div className="space-y-2">
      {traces.length === 0 ? <div className="rounded-xl border border-amber-900/60 bg-amber-950/20 p-3 text-sm text-amber-300">当前 Pattern 没有足够 Trace。不要用界面文案补造计算依据。</div> : traces.map((node) => <Node key={node.id} node={node} depth={0} />)}
    </div>
  );
}
