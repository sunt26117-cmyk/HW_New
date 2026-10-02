export type EngineeringDomain = 'BLDC' | 'EMC';

export type EvidenceKind =
  | 'MEASURED'
  | 'IMPORTED'
  | 'DATASHEET'
  | 'DERIVED'
  | 'TEXT_INFERRED'
  | 'ASSUMED';

export type Quantity =
  | { status: 'ok'; value: number; unit: string; evidence: EvidenceKind; sourceLabel?: string; evidenceId?: string; enteredAt: string }
  | { status: 'missing'; unit: string; need: string };

export interface ValueItem {
  key: string;
  label: string;
  value: Quantity;
  margin?: Margin;
}

export interface Margin {
  limit: number;
  actual: number;
  unit: string;
  ratio: number;
  verdict: 'PASS' | 'WARN' | 'FAIL';
}

export interface TraceInput {
  key: string;
  label: string;
  value: number | string;
  evidence: EvidenceKind;
  evidenceId?: string;
}

export interface TraceNode {
  id: string;
  title: string;
  formula?: string;
  standardRef?: string;
  inputs: TraceInput[];
  verdict?: 'PASS' | 'WARN' | 'FAIL' | 'INFO';
  degraded: boolean;
  children?: TraceNode[];
}

export interface Measure {
  id: string;
  title: string;
  requiresBoardRespin: boolean;
  cost: 'L' | 'M' | 'H';
  days: number;
  sideEffects: string[];
}

export type RiskLevel = 'Low' | 'Medium' | 'High' | 'Critical' | 'Unknown';
export type PatternKind = 'FAILURE_MODE' | 'CHECKLIST';

export interface PatternOutput {
  id: string;
  name: string;
  kind: PatternKind;
  triggered: boolean | 'insufficient_input';
  riskLevel: RiskLevel;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  veto: { triggered: boolean; reason?: string };
  values: ValueItem[];
  trace: TraceNode[];
  measures: Measure[];
  verification: string[];
  unknowns: string[];
}

export interface Veto {
  patternId: string;
  reason?: string;
}

export interface TscqlScores {
  T: number;
  S: number;
  C: number;
  Q: number;
  L: number;
  total: number;
}

export interface OptionVeto {
  triggered: boolean;
  sourcePatternIds: string[];
  reasons: string[];
}

export interface Option {
  id: string;
  tier: 'ROOT_FIX' | 'COMBINED' | 'TEMPORARY';
  title: string;
  sourcePatternIds: string[];
  measureIds: string[];
  scores: TscqlScores;
  veto: OptionVeto;
  requiresBoardRespin: boolean;
  days: number;
  cost: 'L' | 'M' | 'H';
  sideEffects: string[];
  verification: string[];
}

export interface TimelineItem {
  optionId: string;
  title: string;
  measureIds: string[];
  days: number;
  requiresBoardRespin: boolean;
  vetoed: boolean;
}

export interface DualTimeline {
  containment: TimelineItem[];
  permanent: TimelineItem[];
}

export interface DocRef {
  id: string;
  title: string;
}

export interface AuditReport {
  passed: boolean;
  rejectedNumbers: string[];
}

export interface ProjectMeta {
  projectId: string;
  projectName: string;
  domain: EngineeringDomain;
  phase: string;
  daysRemaining?: number;
  selectedDeviceId?: string;
  at: string;
}

export interface IssueInput {
  title: string;
  phenomenon?: string;
  requirement?: string;
  testCondition?: string;
  quantities: Record<string, Quantity>;
}

export interface EngineeringProject {
  meta: ProjectMeta;
  issue: IssueInput;
}

export interface AnalysisResult {
  meta: {
    analysisId: string;
    inputHash: string;
    engineVersion: string;
    at: string;
    domain: EngineeringDomain;
    source: 'DETERMINISTIC' | 'AI_ENHANCED';
  };
  facts: { quantities: Quantity[]; missing: string[]; assumptions: string[] };
  judgment: { patterns: PatternOutput[]; dominant?: string; vetoes: Veto[] };
  action: { options: Option[]; recommended?: string; timeline: DualTimeline; docs: DocRef[] };
  narrative?: { text: string; citedTraceIds: string[]; auditReport: AuditReport };
}
