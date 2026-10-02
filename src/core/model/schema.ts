import { z } from 'zod';
import type { PatternOutput } from './contracts.ts';

export const QuantitySchema = z.discriminatedUnion('status', [
  z.object({
    status: z.literal('ok'), value: z.number().finite(), unit: z.string(),
    evidence: z.enum(['MEASURED', 'IMPORTED', 'DATASHEET', 'DERIVED', 'TEXT_INFERRED', 'ASSUMED']),
    sourceLabel: z.string().optional(), evidenceId: z.string().optional(), enteredAt: z.string(),
  }),
  z.object({ status: z.literal('missing'), unit: z.string(), need: z.string() }),
]);

const ValueItemSchema = z.object({
  key: z.string(), label: z.string(), value: QuantitySchema,
  margin: z.object({ limit: z.number(), actual: z.number(), unit: z.string(), ratio: z.number(), verdict: z.enum(['PASS', 'WARN', 'FAIL']) }).optional(),
});

const TraceNodeSchema: z.ZodTypeAny = z.lazy(() => z.object({
  id: z.string(), title: z.string(), formula: z.string().optional(), standardRef: z.string().optional(),
  inputs: z.array(z.object({ key: z.string(), label: z.string(), value: z.union([z.number(), z.string()]), evidence: z.enum(['MEASURED', 'IMPORTED', 'DATASHEET', 'DERIVED', 'TEXT_INFERRED', 'ASSUMED']), evidenceId: z.string().optional() })),
  verdict: z.enum(['PASS', 'WARN', 'FAIL', 'INFO']).optional(), degraded: z.boolean(), children: z.array(TraceNodeSchema).optional(),
}));

export const PatternOutputSchema = z.object({
  id: z.string(), name: z.string(), kind: z.enum(['FAILURE_MODE', 'CHECKLIST']),
  triggered: z.union([z.boolean(), z.literal('insufficient_input')]),
  riskLevel: z.enum(['Low', 'Medium', 'High', 'Critical', 'Unknown']),
  confidence: z.enum(['HIGH', 'MEDIUM', 'LOW']),
  veto: z.object({ triggered: z.boolean(), reason: z.string().optional() }),
  values: z.array(ValueItemSchema), trace: z.array(TraceNodeSchema),
  measures: z.array(z.object({ id: z.string(), title: z.string(), requiresBoardRespin: z.boolean(), cost: z.enum(['L', 'M', 'H']), days: z.number(), sideEffects: z.array(z.string()) })),
  verification: z.array(z.string()), unknowns: z.array(z.string()),
});

export function assertPatternOutput(value: unknown): PatternOutput {
  return PatternOutputSchema.parse(value) as PatternOutput;
}


const ScoreSchema = z.object({ T: z.number().finite(), S: z.number().finite(), C: z.number().finite(), Q: z.number().finite(), L: z.number().finite(), total: z.number().finite() });
const OptionSchema = z.object({
  id: z.string(), tier: z.enum(['ROOT_FIX', 'COMBINED', 'TEMPORARY']), title: z.string(), sourcePatternIds: z.array(z.string()), measureIds: z.array(z.string()),
  scores: ScoreSchema, veto: z.object({ triggered: z.boolean(), sourcePatternIds: z.array(z.string()), reasons: z.array(z.string()) }),
  requiresBoardRespin: z.boolean(), days: z.number().finite(), cost: z.enum(['L', 'M', 'H']), sideEffects: z.array(z.string()), verification: z.array(z.string()),
});
const TimelineItemSchema = z.object({ optionId: z.string(), title: z.string(), measureIds: z.array(z.string()), days: z.number().finite(), requiresBoardRespin: z.boolean(), vetoed: z.boolean() });
export const DecisionPlanSchema = z.object({ options: z.array(OptionSchema), recommended: z.string().optional(), timeline: z.object({ containment: z.array(TimelineItemSchema), permanent: z.array(TimelineItemSchema) }) });

export function parseDecisionPlan(value: unknown) {
  return DecisionPlanSchema.parse(value);
}

