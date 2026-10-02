import type { AnalysisResult } from '../model/contracts.ts';

export interface AiNarrativeRequest {
  facts: AnalysisResult['facts'];
  judgment: AnalysisResult['judgment'];
}

export interface AiNarrativeResponse {
  text: string;
  citedTraceIds: string[];
  auditReport: { passed: boolean; rejectedNumbers: string[] };
}

/** Phase 0-3 boundary: AI may describe deterministic facts; it does not recalculate or mutate them. */
export interface AiAdapter {
  generate(request: AiNarrativeRequest): Promise<AiNarrativeResponse>;
}
