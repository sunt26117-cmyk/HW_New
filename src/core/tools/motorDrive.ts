export type CommutationMode = 'sensorless_bemf' | 'hall_six_step' | 'foc_vector';

export interface CommutationInput {
  controlMode: CommutationMode;
  speedMinRpm: number;
  speedMaxRpm: number;
  angleOffsetDeg: number;
  torqueFluctuationPct: number;
}

export interface CommutationResult {
  baseRipplePct: number;
  torqueRipplePct: number;
  lowSpeedBEMFRisk: boolean;
  angleRisk: 'normal' | 'warning' | 'critical';
}

export function calculateCommutationRisk(input: CommutationInput): CommutationResult {
  if (!Number.isFinite(input.speedMinRpm) || !Number.isFinite(input.speedMaxRpm) || !Number.isFinite(input.angleOffsetDeg) || !Number.isFinite(input.torqueFluctuationPct)) throw new Error('换相分析输入必须为有限数。');
  if (input.speedMinRpm < 0 || input.speedMaxRpm < input.speedMinRpm || input.torqueFluctuationPct < 0) throw new Error('转速与转矩波动输入不合法。');
  const baseRipplePct = input.controlMode === 'foc_vector' ? 3.5 : input.controlMode === 'hall_six_step' ? 14 : 18;
  const angleImpact = Math.abs(input.angleOffsetDeg) * (input.controlMode === 'foc_vector' ? 1.8 : 2.5);
  const torqueRipplePct = Number((baseRipplePct + angleImpact + input.torqueFluctuationPct * 0.35).toFixed(1));
  const angleRisk = Math.abs(input.angleOffsetDeg) >= 20 || (torqueRipplePct > 35 && input.speedMaxRpm > 3000)
    ? 'critical'
    : Math.abs(input.angleOffsetDeg) >= 8 || torqueRipplePct > 20
      ? 'warning'
      : 'normal';
  return {
    baseRipplePct,
    torqueRipplePct,
    lowSpeedBEMFRisk: input.controlMode === 'sensorless_bemf' && input.speedMinRpm < 400,
    angleRisk,
  };
}

export interface SafetyChainInput {
  fhtiBudgetMs: number;
  watchdogTimeoutMs: number;
  safeStateTransitionMs: number;
  currentSenseDeviationPct: number;
}

export interface SafetyChainResult {
  responseTimeMs: number;
  marginMs: number;
  timingPass: boolean;
  currentSenseStatus: 'COMPLIANT' | 'WARNING' | 'CRITICAL';
}

export function calculateSafetyChain(input: SafetyChainInput): SafetyChainResult {
  if (Object.values(input).some((value) => !Number.isFinite(value))) throw new Error('安全链时间输入必须为有限数。');
  if (input.fhtiBudgetMs <= 0 || input.watchdogTimeoutMs < 0 || input.safeStateTransitionMs < 0 || input.currentSenseDeviationPct < 0) throw new Error('安全链时间参数不合法。');
  const responseTimeMs = input.watchdogTimeoutMs + input.safeStateTransitionMs;
  const marginMs = input.fhtiBudgetMs - responseTimeMs;
  const currentSenseStatus = input.currentSenseDeviationPct >= 10 ? 'CRITICAL' : input.currentSenseDeviationPct >= 5 ? 'WARNING' : 'COMPLIANT';
  return { responseTimeMs: Number(responseTimeMs.toFixed(3)), marginMs: Number(marginMs.toFixed(3)), timingPass: marginMs >= 0, currentSenseStatus };
}
