export interface VoltageMarginInput {
  nominalVoltage: number;
  regulatorTolerancePercent: number;
  lineAndSwitchDropMv: number;
  transientDipMv: number;
  minAllowedVoltage: number;
}

export interface VoltageMarginResult {
  regulatorMinimumV: number;
  worstCaseMinimumV: number;
  marginV: number;
  pass: boolean;
}

export function calculateVoltageMargin(input: VoltageMarginInput): VoltageMarginResult {
  const values = Object.values(input);
  if (values.some((value) => !Number.isFinite(value))) throw new Error('电压裕量输入必须全部为有限数。');
  if (input.nominalVoltage <= 0 || input.regulatorTolerancePercent < 0 || input.lineAndSwitchDropMv < 0 || input.transientDipMv < 0) throw new Error('电压、容差和压降参数不合法。');
  const regulatorMinimumV = input.nominalVoltage * (1 - input.regulatorTolerancePercent / 100);
  const worstCaseMinimumV = regulatorMinimumV - (input.lineAndSwitchDropMv + input.transientDipMv) / 1000;
  const marginV = worstCaseMinimumV - input.minAllowedVoltage;
  return { regulatorMinimumV: Number(regulatorMinimumV.toFixed(4)), worstCaseMinimumV: Number(worstCaseMinimumV.toFixed(4)), marginV: Number(marginV.toFixed(4)), pass: marginV >= 0 };
}
