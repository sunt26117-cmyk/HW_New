import type { GoldCase } from '../../core/gold/contracts.ts';

/**
 * 空白 Gold Case 注册表：真实台架数据未提供前，禁止写入猜测数字。
 * 工具链只允许通过该注册表识别“已注册”，不会把 synthetic fixture 冒充 Gold。
 */
export const GOLD_CASES: readonly GoldCase[] = [];

export function getGoldCase(id: string): GoldCase | undefined {
  return GOLD_CASES.find((item) => item.id === id);
}
