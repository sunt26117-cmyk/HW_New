import type { AnalysisResult, EngineeringProject } from '../model/contracts.ts';
import { AI_CONTENT } from '../../content/ai.ts';

export function buildAiNarrativePrompt(project: EngineeringProject, result: AnalysisResult): { system: string; user: string } {
  const quantities = result.facts.quantities.map((q, index) => {
    if (q.status === 'missing') return `${index + 1}. UNKNOWN · ${q.unit} · ${q.need}`;
    return `${index + 1}. ${q.value} ${q.unit} · ${q.evidence} · ${q.sourceLabel ?? 'no source label'}`;
  }).join('\n');
  const missing = result.facts.missing.length ? result.facts.missing.join('\n') : 'none';
  return {
    system: `${AI_CONTENT.system}\n${AI_CONTENT.outputContract}`,
    user: [
      '【工程问题】', project.issue.title || '未定义',
      '【确定性事实】', quantities,
      '【缺失项】', missing,
      '【Trace 可引用 ID】', result.judgment.patterns.flatMap((p) => p.trace.map((t) => t.id)).join('\n') || 'none',
      '只做解释、风险机理叙述和下一验证动作，不重复计算。',
    ].join('\n'),
  };
}

export function parseAiNarrative(raw: unknown): { success: boolean; data?: { text: string; citedTraceIds: string[] }; error?: string } {
  try {
    const text = typeof raw === 'string' ? raw : JSON.stringify(raw);
    const parsed = JSON.parse(text);
    if (!parsed || typeof parsed.text !== 'string' || !Array.isArray(parsed.citedTraceIds) || !parsed.citedTraceIds.every((id: unknown) => typeof id === 'string')) {
      return { success: false, error: 'AI narrative JSON contract invalid' };
    }
    return { success: true, data: { text: parsed.text, citedTraceIds: parsed.citedTraceIds } };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}
