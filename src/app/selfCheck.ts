import type { EngineeringProject } from '../core/model/contracts.ts';
import { analyze } from './analyze.ts';

export interface SelfCheckItem { id:string; passed:boolean; detail:string }
export interface SelfCheckReport { passed:boolean; total:number; passedCount:number; items:SelfCheckItem[] }

export function runSystemSelfCheck(project: EngineeringProject): SelfCheckReport {
  const result=analyze(project);
  const hasNonFinite = (value: unknown): boolean => {
    if (typeof value === 'number') return !Number.isFinite(value);
    if (Array.isArray(value)) return value.some(hasNonFinite);
    if (value && typeof value === 'object') return Object.values(value as Record<string, unknown>).some(hasNonFinite);
    return false;
  };
  const finite=!hasNonFinite(result);
  const flattenTrace=(nodes: typeof result.judgment.patterns[number]['trace']): string[] => nodes.flatMap((node) => [node.id, ...flattenTrace(node.children ?? [])]);
  const traceable=result.judgment.patterns.every((p)=>{ const ids=new Set(flattenTrace(p.trace)); return p.values.every((v)=>v.value.status==='missing' || ids.has(`${p.id}.${v.key}`)); });
  const vetoOrigin=result.judgment.vetoes.every((v)=>result.judgment.patterns.some((p)=>p.id===v.patternId && p.veto.triggered));
  const versioned=Boolean(result.meta.analysisId && result.meta.inputHash && result.meta.engineVersion);
  const items=[
    {id:'analysis-finite',passed:finite,detail:'AnalysisResult 不含 NaN/Infinity'},
    {id:'values-trace',passed:traceable,detail:'Pattern values 具备 Trace 链'},
    {id:'veto-origin',passed:vetoOrigin,detail:'VETO 只来自 Pattern'},
    {id:'versioned',passed:versioned,detail:'Analysis ID / Input Hash / Engine Version 存在'},
  ];
  const passedCount=items.filter((item)=>item.passed).length;
  return {passed:passedCount===items.length,total:items.length,passedCount,items};
}
