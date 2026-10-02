import { useMemo } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { EvidenceKind, EngineeringProject, Quantity } from '../../core/model/contracts.ts';
import { INPUT_GROUPS } from '../inputCatalog.ts';

const EVIDENCE: EvidenceKind[] = ['MEASURED', 'IMPORTED', 'DATASHEET', 'DERIVED', 'TEXT_INFERRED', 'ASSUMED'];

export function InputScreen({ project, onProjectChange }: { project: EngineeringProject; onProjectChange: Dispatch<SetStateAction<EngineeringProject>> }) {
  const missing = useMemo(() => Object.values(project.issue.quantities).filter((q) => q.status === 'missing').length, [project.issue.quantities]);
  const updateMeta = (field: 'projectName' | 'phase', value: string) => onProjectChange((prev) => ({ ...prev, meta: { ...prev.meta, [field]: value } }));
  const updateIssue = (field: 'title' | 'phenomenon' | 'requirement' | 'testCondition', value: string) => onProjectChange((prev) => ({ ...prev, issue: { ...prev.issue, [field]: value } }));
  const updateQuantity = (key: string, unit: string, value: string, evidence: string, sourceLabel: string) => {
    onProjectChange((prev) => {
      const next = { ...prev.issue.quantities };
      const numeric = value.trim() === '' ? undefined : Number(value);
      if (numeric === undefined || !Number.isFinite(numeric) || !EVIDENCE.includes(evidence as EvidenceKind)) next[key] = { status: 'missing', unit, need: `需要有效数值与证据类型：${key}` };
      else next[key] = { status: 'ok', value: numeric, unit, evidence: evidence as EvidenceKind, ...(sourceLabel.trim() ? { sourceLabel: sourceLabel.trim() } : {}), enteredAt: new Date().toISOString() };
      return { ...prev, issue: { ...prev.issue, quantities: next } };
    });
  };

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5"><div className="flex items-end justify-between gap-4"><div><h1 className="text-xl font-semibold">输入与证据</h1><p className="mt-1 text-sm text-slate-400">只录入工程事实与证据来源；空值就是 missing，不自动填经验值。</p></div><div className="text-right"><div className="text-xs text-slate-500">缺失输入</div><div className="text-2xl font-semibold text-amber-300">{missing}</div></div></div></section>

      <section className="grid gap-4 md:grid-cols-2">
        <label className="rounded-xl border border-slate-800 bg-slate-900 p-3"><span className="text-[11px] text-slate-500">项目名称</span><input value={project.meta.projectName} onChange={(e) => updateMeta('projectName', e.target.value)} className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none" placeholder="工程项目" /></label>
        <label className="rounded-xl border border-slate-800 bg-slate-900 p-3"><span className="text-[11px] text-slate-500">项目阶段</span><input value={project.meta.phase} onChange={(e) => updateMeta('phase', e.target.value)} className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none" placeholder="EVT / DVT / SOP" /></label>
        <label className="rounded-xl border border-slate-800 bg-slate-900 p-3 md:col-span-2"><span className="text-[11px] text-slate-500">工程问题</span><input value={project.issue.title} onChange={(e) => updateIssue('title', e.target.value)} className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none" placeholder="例如：高 dv/dt 下出现异常 Vgs 尖峰" /></label>
      </section>

      {INPUT_GROUPS.map((group) => (
        <section key={group.id} className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <div className="flex items-center justify-between gap-3"><div><h2 className="text-sm font-semibold">{group.id} · {group.title}</h2><div className="mt-1 text-[11px] text-slate-500">字段由 Core 派生契约提供。</div></div><span className="text-[11px] text-slate-500">{group.fields.length} 个字段</span></div>
          <div className="mt-4 space-y-2">
            {group.fields.map((field) => {
              const q = project.issue.quantities[field.key];
              const value = q?.status === 'ok' ? String(q.value) : '';
              const evidence = q?.status === 'ok' ? q.evidence : '';
              const sourceLabel = q?.status === 'ok' ? q.sourceLabel ?? '' : '';
              return <div key={field.key} className="grid gap-2 rounded-xl border border-slate-800/80 bg-slate-950/40 p-3 md:grid-cols-[minmax(170px,1.2fr)_150px_160px_minmax(140px,1fr)] md:items-center">
                <div><div className="text-sm text-slate-200">{field.label}</div><div className="mt-1 text-[10px] font-mono text-slate-500">{field.key} · {field.unit}{field.requiredBy.length ? ` · required ${field.requiredBy.join(',')}` : ''}</div></div>
                <input type="number" value={value} onChange={(e) => updateQuantity(field.key, field.unit, e.target.value, evidence, sourceLabel)} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm font-mono outline-none" placeholder="missing" />
                <select value={evidence} onChange={(e) => updateQuantity(field.key, field.unit, value, e.target.value, sourceLabel)} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs outline-none"><option value="">选择证据</option>{EVIDENCE.map((e) => <option key={e} value={e}>{e}</option>)}</select>
                <input value={sourceLabel} onChange={(e) => updateQuantity(field.key, field.unit, value, evidence, e.target.value)} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs outline-none" placeholder="来源标签（可选）" />
              </div>;
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
