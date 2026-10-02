import type { Quantity } from '../model/contracts.ts';

export type PhysicsResult<T> =
  | { status: 'ok'; value: T }
  | { status: 'insufficient_input'; need: string[] }
  /** 输入齐全，但物理方程在当前有效域内不存在稳态解/发生物理发散：这是物理结论，不是缺参。 */
  | { status: 'diverged'; reason: string };

/** 取“还缺什么 / 为何失败”的文字，供 Pattern 的 unknowns 使用。 */
export function needOf<T>(r: PhysicsResult<T>): string[] {
  if (r.status === 'insufficient_input') return r.need;
  if (r.status === 'diverged') return [r.reason];
  return [];
}

/** 把 PhysicsResult 的非 OK 状态映射成统一 Pattern 语义，禁止未来 Pattern 把 diverged 误报成缺输入。 */
export function patternStateFromPhysics<T>(r: Exclude<PhysicsResult<T>, { status: 'ok' }>): {
  triggered: true | 'insufficient_input';
  veto: { triggered: boolean; reason?: string };
  riskLevel: 'Critical' | 'Unknown';
  unknowns: string[];
} {
  if (r.status === 'insufficient_input') {
    return { triggered: 'insufficient_input', veto: { triggered: false }, riskLevel: 'Unknown', unknowns: r.need };
  }
  return { triggered: true, veto: { triggered: true, reason: r.reason }, riskLevel: 'Critical', unknowns: [] };
}

export function resolveInput(name: string, input: number | Quantity | undefined): PhysicsResult<number> {
  if (typeof input === 'number') return Number.isFinite(input) ? { status: 'ok', value: input } : { status: 'insufficient_input', need: [name] };
  if (!input || input.status === 'missing') return { status: 'insufficient_input', need: [name] };
  return Number.isFinite(input.value) ? { status: 'ok', value: input.value } : { status: 'insufficient_input', need: [name] };
}

export function requireInputs(entries: Array<[string, number | Quantity | undefined]>): PhysicsResult<Record<string, number>> {
  const values: Record<string, number> = {};
  const need: string[] = [];
  for (const [name, input] of entries) {
    const resolved = resolveInput(name, input);
    if (resolved.status === 'ok') values[name] = resolved.value;
    else need.push(...needOf(resolved));
  }
  return need.length ? { status: 'insufficient_input', need } : { status: 'ok', value: values };
}

export interface NumericRule { name: string; value: number; min?: number; max?: number; minExclusive?: number; maxExclusive?: number; }

/** 统一物理输入域检查；非法域值返回 insufficient_input，绝不把非法数字带进公式。 */
export function validateNumericDomain(rules: NumericRule[]): PhysicsResult<void> {
  const need: string[] = [];
  for (const rule of rules) {
    const { name, value, min, max, minExclusive, maxExclusive } = rule;
    if (!Number.isFinite(value)) { need.push(`${name} 必须为有限数`); continue; }
    if (min !== undefined && value < min) need.push(`${name} >= ${min}`);
    if (max !== undefined && value > max) need.push(`${name} <= ${max}`);
    if (minExclusive !== undefined && value <= minExclusive) need.push(`${name} > ${minExclusive}`);
    if (maxExclusive !== undefined && value >= maxExclusive) need.push(`${name} < ${maxExclusive}`);
  }
  return need.length ? { status: 'insufficient_input', need } : { status: 'ok', value: undefined };
}
