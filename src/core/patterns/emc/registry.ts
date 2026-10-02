import type { IssueInput, PatternOutput } from '../../model/contracts.ts';
import { deriveEmcEvaluationInput } from '../../derive/emc.ts';
import { evaluateEmcP001 } from './P001.ts';
import { evaluateEmcC001 } from './C001.ts';
import { evaluateEmcC002 } from './C002.ts';

export const EMC_PATTERN_REGISTRY = [evaluateEmcP001, evaluateEmcC001, evaluateEmcC002] as const;
export function evaluateEmcPatterns(issue: IssueInput): PatternOutput[] {
  const input = deriveEmcEvaluationInput(issue);
  return EMC_PATTERN_REGISTRY.map((evaluate) => evaluate(input));
}
