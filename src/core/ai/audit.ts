import type { AnalysisResult } from '../model/contracts.ts';
import type { AiNarrative } from './adapter.ts';

export interface AiAuditReport {
  passed: boolean;
  rejectedNumbers: string[];
  invalidTraceIds: string[];
}

const UNIT_ALIASES: Record<string,string> = { 'μs':'us', 'µs':'us', 'μA':'ua', 'µA':'ua', 'μm':'um', 'µm':'um', 'μF':'uf', 'µF':'uf', 'Ω':'ohm', 'mΩ':'mohm', '°C':'c' };
const NUMBER_WITH_UNIT = /(-?\d+(?:\.\d+)?)\s*(V\/ns|V|A|W|Hz|rpm|°C|C|µs|μs|us|ns|µF|μF|uF|pF|nH|mΩ|Ω|J|%)\b/g;

function normUnit(unit:string):string { return UNIT_ALIASES[unit] ?? unit.toLowerCase(); }
function normValue(value:number):number { return Number(value.toFixed(6)); }

function deterministicNumbers(result: AnalysisResult): Array<{ value:number; unit:string }> {
  const out:Array<{value:number;unit:string}> = [];
  for(const q of result.facts.quantities) if(q.status==='ok') out.push({value:q.value,unit:q.unit});
  for(const p of result.judgment.patterns) for(const v of p.values) if(v.value.status==='ok') out.push({value:v.value.value,unit:v.value.unit});
  return out;
}

export function auditAiNarrative(narrative: AiNarrative, result: AnalysisResult): AiAuditReport {
  const collectTraceIds = (nodes: import('../model/contracts.ts').TraceNode[]): string[] => nodes.flatMap((node) => [node.id, ...collectTraceIds(node.children ?? [])]);
  const validTraceIds = new Set(result.judgment.patterns.flatMap((p) => collectTraceIds(p.trace)));
  const invalidTraceIds=narrative.citedTraceIds.filter((id)=>!validTraceIds.has(id));
  const facts=deterministicNumbers(result);
  const rejectedNumbers:string[]=[];
  for(const match of narrative.text.matchAll(NUMBER_WITH_UNIT)) {
    const value=normValue(Number(match[1])); const unit=normUnit(match[2]);
    const exists=facts.some((fact)=>normValue(fact.value)===value && normUnit(fact.unit)===unit);
    if(!exists) rejectedNumbers.push(`${match[1]} ${match[2]}`);
  }
  return { passed: rejectedNumbers.length===0 && invalidTraceIds.length===0, rejectedNumbers, invalidTraceIds };
}

export function applyAiNarrative(result: AnalysisResult, narrative: AiNarrative): AnalysisResult {
  const audit=auditAiNarrative(narrative,result);
  if(!audit.passed) return result;
  return { ...result, meta:{...result.meta, source:'AI_ENHANCED'}, narrative:{ text:narrative.text, citedTraceIds:narrative.citedTraceIds, auditReport:{ passed:true, rejectedNumbers:[...audit.rejectedNumbers] } } };
}
