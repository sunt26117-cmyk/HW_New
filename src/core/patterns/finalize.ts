import type { PatternOutput } from '../model/contracts.ts';
import { deriveConfidence } from '../trace/trace.ts';

export function finalizePattern(draft: Omit<PatternOutput, 'confidence' | 'riskLevel'>, riskLevel: PatternOutput['riskLevel']): PatternOutput {
  return { ...draft, riskLevel, confidence: deriveConfidence(draft.trace) };
}
