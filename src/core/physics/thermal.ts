import type { Quantity } from '../model/contracts.ts';
import { requireInputs, validateNumericDomain, type PhysicsResult } from './result.ts';

export interface ThermalInput {
  baseTemperatureC: number | Quantity | undefined;
  currentRmsA: number | Quantity | undefined;
  rdsOn25MilliOhm: number | Quantity | undefined;
  rthCPerW: number | Quantity | undefined;
  alphaPerC: number | Quantity | undefined;
  tjMaxC: number | Quantity | undefined;
}

export interface ThermalResult {
  conductionLossW: number;
  rdsOnMilliOhm: number;
  estimatedTjC: number;
  iterations: number;
  converged: boolean;
  feedbackGain: number;
  steadyStateExists: true;
}

const EXPONENT = 1.8;
const ROOT_SOLVER_MIN_ITERATIONS = 80;

function rdsAtTemperature(rdsOn25MilliOhm: number, alphaPerC: number, tjC: number): number | undefined {
  const factor = 1 + alphaPerC * (tjC - 25);
  if (factor <= 0) return undefined;
  const rds = rdsOn25MilliOhm * factor ** EXPONENT;
  return Number.isFinite(rds) ? rds : undefined;
}

function residual(
  baseTemperatureC: number,
  currentRmsA: number,
  rdsOn25MilliOhm: number,
  rthCPerW: number,
  alphaPerC: number,
  tjC: number,
): number | undefined {
  const rds = rdsAtTemperature(rdsOn25MilliOhm, alphaPerC, tjC);
  if (rds === undefined) return undefined;
  const p = currentRmsA ** 2 * rds * 1e-3;
  const next = baseTemperatureC + p * rthCPerW;
  return Number.isFinite(next) ? next - tjC : undefined;
}

function feedbackGain(currentRmsA: number, rdsOn25MilliOhm: number, rthCPerW: number, alphaPerC: number, tjC: number): number {
  const factor = 1 + alphaPerC * (tjC - 25);
  return currentRmsA ** 2 * rdsOn25MilliOhm * 1e-3 * rthCPerW * EXPONENT * alphaPerC * factor ** (EXPONENT - 1);
}

function solveLowRoot(
  baseTemperatureC: number,
  currentRmsA: number,
  rdsOn25MilliOhm: number,
  rthCPerW: number,
  alphaPerC: number,
  upperC: number,
  toleranceC: number,
): { tjC: number; iterations: number } | undefined {
  let lo = baseTemperatureC;
  let hi = upperC;
  const gLo = residual(baseTemperatureC, currentRmsA, rdsOn25MilliOhm, rthCPerW, alphaPerC, lo);
  const gHi = residual(baseTemperatureC, currentRmsA, rdsOn25MilliOhm, rthCPerW, alphaPerC, hi);
  if (gLo === undefined || gHi === undefined || gLo < 0 || gHi > 0) return undefined;
  for (let i = 1; i <= Math.max(ROOT_SOLVER_MIN_ITERATIONS, 1); i += 1) {
    const mid = (lo + hi) / 2;
    const gMid = residual(baseTemperatureC, currentRmsA, rdsOn25MilliOhm, rthCPerW, alphaPerC, mid);
    if (gMid === undefined) return undefined;
    if (Math.abs(gMid) <= toleranceC || Math.abs(hi - lo) <= toleranceC) return { tjC: mid, iterations: i };
    if (gMid > 0) lo = mid;
    else hi = mid;
  }
  return { tjC: (lo + hi) / 2, iterations: Math.max(ROOT_SOLVER_MIN_ITERATIONS, 1) };
}

/**
 * Rds(Tj)=Rds25·(1+α(Tj−25))^1.8; Tj=Tbase+P(Tj)·Rθ.
 *
 * 关键语义：固定点迭代失败 ≠ 热失控。先判断安全有效域内是否存在稳态根，再用有界二分求低温稳定根。
 * 只有“当前模型有效域内没有稳态解”才返回 diverged；这样数值求解预算不足不会伪装成安全 VETO。
 */
export function calculateThermalCascade(input: ThermalInput, maxIterations = 40, toleranceC = 0.01): PhysicsResult<ThermalResult> {
  const r = requireInputs([
    ['baseTemperatureC', input.baseTemperatureC], ['currentRmsA', input.currentRmsA], ['rdsOn25MilliOhm', input.rdsOn25MilliOhm],
    ['rthCPerW', input.rthCPerW], ['alphaPerC', input.alphaPerC], ['tjMaxC', input.tjMaxC],
  ]);
  if (r.status !== 'ok') return r;
  const { baseTemperatureC, currentRmsA, rdsOn25MilliOhm, rthCPerW, alphaPerC, tjMaxC } = r.value;

  const domain = validateNumericDomain([
    { name: 'baseTemperatureC', value: baseTemperatureC },
    { name: 'currentRmsA', value: currentRmsA, min: 0 },
    { name: 'rdsOn25MilliOhm', value: rdsOn25MilliOhm, min: 0 },
    { name: 'rthCPerW', value: rthCPerW, min: 0 },
    { name: 'alphaPerC', value: alphaPerC, min: 0 },
    { name: 'tjMaxC', value: tjMaxC, minExclusive: 0 },
    { name: 'maxIterations', value: maxIterations, minExclusive: 0 },
    { name: 'toleranceC', value: toleranceC, minExclusive: 0 },
  ]);
  if (domain.status !== 'ok') return domain;
  const factorAtBase = 1 + alphaPerC * (baseTemperatureC - 25);
  if (factorAtBase <= 0) return { status: 'insufficient_input', need: ['baseTemperatureC / alphaPerC 不在当前热模型有效域内：1+α(Tj−25) 必须 > 0'] };

  // 快路径：标准固定点迭代。即便预算较小，后续仍会用稳态存在性判定避免误报热失控。
  let tj = baseTemperatureC;
  for (let i = 1; i <= maxIterations; i += 1) {
    const rds = rdsAtTemperature(rdsOn25MilliOhm, alphaPerC, tj);
    if (rds === undefined) break;
    const p = currentRmsA ** 2 * rds * 1e-3;
    const next = baseTemperatureC + p * rthCPerW;
    if (!Number.isFinite(next)) break;
    if (Math.abs(next - tj) <= toleranceC) {
      return { status: 'ok', value: { conductionLossW: p, rdsOnMilliOhm: rds, estimatedTjC: next, iterations: i, converged: true, feedbackGain: feedbackGain(currentRmsA, rdsOn25MilliOhm, rthCPerW, alphaPerC, next), steadyStateExists: true } };
    }
    tj = next;
  }

  // alpha=0 时方程退化成线性，一定只有一个稳态根。
  if (alphaPerC === 0) {
    const rds = rdsOn25MilliOhm;
    const p = currentRmsA ** 2 * rds * 1e-3;
    const root = baseTemperatureC + p * rthCPerW;
    if (!Number.isFinite(root)) return { status: 'diverged', reason: '热-电方程无有限稳态解' };
    return { status: 'ok', value: { conductionLossW: p, rdsOnMilliOhm: rds, estimatedTjC: root, iterations: 0, converged: true, feedbackGain: 0, steadyStateExists: true } };
  }

  // g(T)=Tbase + K·(1+α(T−25))^1.8 − T 为凸函数。
  // 从 Tbase 出发，若其唯一极小值仍 > 0，则当前模型内不存在稳态根；若存在根但根高于 TjMax，
  // 那是“存在过温稳态”，应由 P006 的 TjMax margin 触发 VETO，而不是把过温误称为热失控。
  const K = currentRmsA ** 2 * rdsOn25MilliOhm * 1e-3 * rthCPerW;
  if (K === 0) {
    return { status: 'ok', value: { conductionLossW: 0, rdsOnMilliOhm: rdsOn25MilliOhm * factorAtBase ** EXPONENT, estimatedTjC: baseTemperatureC, iterations: 0, converged: true, feedbackGain: 0, steadyStateExists: true } };
  }
  const gainAtBase = feedbackGain(currentRmsA, rdsOn25MilliOhm, rthCPerW, alphaPerC, baseTemperatureC);
  if (gainAtBase >= 1) {
    return { status: 'diverged', reason: `热-电反馈增益在基准温度已为 ${gainAtBase.toFixed(3)}≥1，且当前有效域内无低温稳态根（疑似热失控）` };
  }

  const factorAtCritical = (1 / (K * EXPONENT * alphaPerC)) ** (1 / (EXPONENT - 1));
  const criticalT = 25 + (factorAtCritical - 1) / alphaPerC;
  if (!Number.isFinite(criticalT) || criticalT <= baseTemperatureC) {
    return { status: 'diverged', reason: '热-电反馈模型未找到基准温度以上的稳态根' };
  }
  const searchUpper = criticalT;
  const gUpper = residual(baseTemperatureC, currentRmsA, rdsOn25MilliOhm, rthCPerW, alphaPerC, searchUpper);
  if (gUpper === undefined) return { status: 'diverged', reason: '热-电稳态边界无法计算出有限残差' };
  if (gUpper > 0) {
    return { status: 'diverged', reason: `热-电方程在当前模型有效域内无稳态根（反馈正增益使功耗随温度增长超过散热能力）` };
  }

  const root = solveLowRoot(baseTemperatureC, currentRmsA, rdsOn25MilliOhm, rthCPerW, alphaPerC, searchUpper, toleranceC);
  if (!root) return { status: 'diverged', reason: '已判定存在稳态根，但低温稳态根求解失败' };
  const rds = rdsAtTemperature(rdsOn25MilliOhm, alphaPerC, root.tjC);
  if (rds === undefined) return { status: 'diverged', reason: '低温稳态根对应的 Rds(Tj) 非有限值' };
  const power = currentRmsA ** 2 * rds * 1e-3;
  return { status: 'ok', value: { conductionLossW: power, rdsOnMilliOhm: rds, estimatedTjC: root.tjC, iterations: root.iterations, converged: true, feedbackGain: feedbackGain(currentRmsA, rdsOn25MilliOhm, rthCPerW, alphaPerC, root.tjC), steadyStateExists: true } };
}

/** Vth(Tj)=Vth25+k·(Tj−25). */
export function calculateVthAtTemperature(vth25V: number | Quantity | undefined, tempcoVPerC: number | Quantity | undefined, tjC: number | Quantity | undefined): PhysicsResult<number> {
  const r = requireInputs([['vth25V', vth25V], ['tempcoVPerC', tempcoVPerC], ['tjC', tjC]]);
  if (r.status !== 'ok') return r;
  return { status: 'ok', value: r.value.vth25V + r.value.tempcoVPerC * (r.value.tjC - 25) };
}
