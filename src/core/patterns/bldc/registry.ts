import type { EngineeringProject, PatternOutput } from '../../model/contracts.ts';
import { deriveBldcEvaluationInput } from '../../derive/bldc.ts';
import { evaluateP001 } from './P001.ts';
import { evaluateP003 } from './P003.ts';
import { evaluateP006 } from './P006.ts';
import { evaluateP016 } from './P016.ts';

export type BldcPatternEvaluator = (input: ReturnType<typeof deriveBldcEvaluationInput>) => PatternOutput;

export const BLDC_PATTERN_REGISTRY: readonly { id: string; evaluate: BldcPatternEvaluator }[] = [
  { id: 'P001', evaluate: evaluateP001 }, { id: 'P003', evaluate: evaluateP003 }, { id: 'P006', evaluate: evaluateP006 }, { id: 'P016', evaluate: evaluateP016 },
];

export function evaluateBldcPatterns(project: EngineeringProject): PatternOutput[] {
  const input = deriveBldcEvaluationInput(project.issue);
  return BLDC_PATTERN_REGISTRY.map(({ evaluate }) => evaluate(input));
}
