import type { IssueInput, Quantity } from '../model/contracts.ts';
import { missing, numberOf } from '../trace/trace.ts';

/**
 * BLDC 工程输入的 canonical 字段表。
 * 这里只保留“一种物理量一个 key”；旧版同义字段在导入层统一映射到这些 key，
 * 避免例如 vbusMeasuredPeakV / busVoltagePeakV 变成两份真源。
 */
export type BldcKey =
  | 'vbusNominalV' | 'vbusMeasuredPeakV' | 'vdsRatingV' | 'regenEfficiency' | 'absorbedEnergyJ' | 'rpm' | 'rotorInertiaKgM2' | 'cbusUf'
  | 'gateSpikeMeasuredV' | 'vthMinV' | 'vthMaxV' | 'cgdPf' | 'cgsPf' | 'rgOffOhm' | 'dvDtVns' | 'sourceInductanceNh' | 'diDtANs'
  | 'keVkrpm' | 'magnetLowTempFluxUpliftPct'
  | 'turnOffDelayNs' | 'turnOffDelayMaxNs' | 'fallTimeNs' | 'fallTimeMaxNs' | 'driverPropMismatchNs' | 'driverPropMismatchMaxNs'
  | 'pwmSwitchingFreqHz' | 'diodeForwardVoltageV' | 'modulationIndex'
  | 'ambientC' | 'currentRmsA' | 'currentPeakA' | 'rdsOnMilliOhm' | 'rdsOnTempCoeff' | 'rthJaCPerW' | 'rthCaOrJa' | 'tjMaxC'
  | 'switchingTimeNs' | 'qrrNc' | 'powerFactorCosPhi' | 'pulseDurationS' | 'thermalTauS' | 'deratingBasisC'
  | 'parasiticCapPf' | 'loopInductanceNh'
  | 'vbusMinExpectedV' | 'uvloTypicalV' | 'uvloMinV'
  | 'gateChargeQgNc' | 'bootRefreshWindowUs' | 'bootChargeLoopOhm'
  | 'capInitialTolerancePct' | 'capEolDeratingPct' | 'capLowTempDeratingPct' | 'capRatedRippleCurrentA' | 'capRatedLifeHours' | 'capRatedTempC'
  | 'senseDelayNs' | 'comparatorDelayNs' | 'digitalFilterDelayNs' | 'driverPropDelayNs' | 'gateTurnOffDelayNs' | 'currentFallDelayNs' | 'soaShortCircuitTimeUs' | 'easEnergyMj'
  | 'stallCurrentThresholdA' | 'stallRpmThreshold' | 'stallLevel1TimeMs' | 'stallLevel2TimeMs' | 'stallLevel3TimeMs' | 'stallLockoutCountN';

export interface BldcEvaluationInput { quantities: Record<BldcKey, Quantity>; }

const UNITS: Record<BldcKey, string> = {
  vbusNominalV: 'V', vbusMeasuredPeakV: 'V', vdsRatingV: 'V', regenEfficiency: 'ratio', absorbedEnergyJ: 'J', rpm: 'rpm', rotorInertiaKgM2: 'kg·m²', cbusUf: 'µF',
  gateSpikeMeasuredV: 'V', vthMinV: 'V', vthMaxV: 'V', cgdPf: 'pF', cgsPf: 'pF', rgOffOhm: 'Ω', dvDtVns: 'V/ns', sourceInductanceNh: 'nH', diDtANs: 'A/ns',
  keVkrpm: 'V/krpm', magnetLowTempFluxUpliftPct: '%',
  turnOffDelayNs: 'ns', turnOffDelayMaxNs: 'ns', fallTimeNs: 'ns', fallTimeMaxNs: 'ns', driverPropMismatchNs: 'ns', driverPropMismatchMaxNs: 'ns',
  pwmSwitchingFreqHz: 'Hz', diodeForwardVoltageV: 'V', modulationIndex: 'ratio',
  ambientC: '°C', currentRmsA: 'A', currentPeakA: 'A', rdsOnMilliOhm: 'mΩ', rdsOnTempCoeff: '1/°C', rthJaCPerW: '°C/W', rthCaOrJa: '°C/W', tjMaxC: '°C',
  switchingTimeNs: 'ns', qrrNc: 'nC', powerFactorCosPhi: 'ratio', pulseDurationS: 's', thermalTauS: 's', deratingBasisC: '°C',
  parasiticCapPf: 'pF', loopInductanceNh: 'nH',
  vbusMinExpectedV: 'V', uvloTypicalV: 'V', uvloMinV: 'V',
  gateChargeQgNc: 'nC', bootRefreshWindowUs: 'µs', bootChargeLoopOhm: 'Ω',
  capInitialTolerancePct: '%', capEolDeratingPct: '%', capLowTempDeratingPct: '%', capRatedRippleCurrentA: 'A RMS', capRatedLifeHours: 'h', capRatedTempC: '°C',
  senseDelayNs: 'ns', comparatorDelayNs: 'ns', digitalFilterDelayNs: 'ns', driverPropDelayNs: 'ns', gateTurnOffDelayNs: 'ns', currentFallDelayNs: 'ns', soaShortCircuitTimeUs: 'µs', easEnergyMj: 'mJ',
  stallCurrentThresholdA: 'A', stallRpmThreshold: 'rpm', stallLevel1TimeMs: 'ms', stallLevel2TimeMs: 'ms', stallLevel3TimeMs: 'ms', stallLockoutCountN: '次',
};

export interface BldcFieldDefinition {
  key: BldcKey;
  label: string;
  requiredBy: string[];
  description?: string;
}

export const BLDC_FIELDS: BldcFieldDefinition[] = [
  // P001：母线泵升
  { key: 'vbusNominalV', label: '母线标称电压', requiredBy: ['P001'], description: '实际供电/母线标称值。' },
  { key: 'vbusMeasuredPeakV', label: '台架实测母线峰值', requiredBy: [], description: '示波器 Vbus 通道峰值；实测优先于理论泵升。' },
  { key: 'vdsRatingV', label: 'MOSFET VDS 额定耐压', requiredBy: ['P001'], description: '器件 datasheet 额定耐压。' },
  { key: 'regenEfficiency', label: '再生能量进入 DC-Link 的效率 η', requiredBy: ['P001'], description: '再生机械能进入母线储能的效率。' },
  { key: 'absorbedEnergyJ', label: '已知泄放吸收能量', requiredBy: ['P001'], description: '线束/制动电阻等已知泄放吸收能量。' },
  { key: 'rpm', label: '电机转速', requiredBy: ['P001'] },
  { key: 'rotorInertiaKgM2', label: '转子等效惯量 J', requiredBy: ['P001'] },
  { key: 'cbusUf', label: 'DC-Link 母线电容', requiredBy: ['P001'] },
  { key: 'keVkrpm', label: '反电动势常数 Ke', requiredBy: ['P002'], description: '用于交叉核验 BEMF/泵升口径。' },
  { key: 'magnetLowTempFluxUpliftPct', label: '低温磁通提升', requiredBy: ['P002'], description: '低温磁通相对基准温度的提升量。' },

  // P003：Miller / Vgs 瞬态
  { key: 'vthMinV', label: 'MOSFET 最低 Vth', requiredBy: ['P003'] },
  { key: 'vthMaxV', label: 'MOSFET 最大 Vth', requiredBy: [] },
  { key: 'cgdPf', label: 'Cgd / Crss 取点值', requiredBy: ['P003'] },
  { key: 'cgsPf', label: '栅源电容 Cgs', requiredBy: ['P003'] },
  { key: 'rgOffOhm', label: '关断下拉电阻总量', requiredBy: ['P003'] },
  { key: 'dvDtVns', label: '开关节点 dv/dt', requiredBy: ['P003'] },
  { key: 'gateSpikeMeasuredV', label: 'Vgs 实测尖峰', requiredBy: ['P003'] },
  { key: 'sourceInductanceNh', label: '源极寄生电感 Ls', requiredBy: ['P003'] },
  { key: 'diDtANs', label: '关断 di/dt', requiredBy: ['P003'] },

  // P004：死区 / 关断动态
  { key: 'turnOffDelayNs', label: '关断延迟 t_d(off)', requiredBy: ['P004'] },
  { key: 'turnOffDelayMaxNs', label: '关断延迟最大值', requiredBy: ['P004'] },
  { key: 'fallTimeNs', label: '下降时间 t_f', requiredBy: ['P004'] },
  { key: 'fallTimeMaxNs', label: '下降时间最大值', requiredBy: ['P004'] },
  { key: 'driverPropMismatchNs', label: '驱动传播失配', requiredBy: ['P004'] },
  { key: 'driverPropMismatchMaxNs', label: '驱动传播失配最大值', requiredBy: ['P004'] },

  // P005：死区畸变 / 二极管
  { key: 'pwmSwitchingFreqHz', label: 'PWM 开关频率', requiredBy: ['P005'] },
  { key: 'diodeForwardVoltageV', label: '体二极管 Vf', requiredBy: ['P005'] },
  { key: 'modulationIndex', label: '调制比 m', requiredBy: ['P005'] },

  // P006/P007：热与损耗
  { key: 'ambientC', label: '基准温度', requiredBy: ['P006'] },
  { key: 'currentRmsA', label: 'MOSFET RMS 电流', requiredBy: ['P006'] },
  { key: 'currentPeakA', label: '峰值电流', requiredBy: ['P006'] },
  { key: 'rdsOnMilliOhm', label: '25°C Rds(on)', requiredBy: ['P006'] },
  { key: 'rdsOnTempCoeff', label: 'Rds(on) 温度系数 α', requiredBy: ['P006'] },
  { key: 'rthJaCPerW', label: '结到环境热阻 RθJA', requiredBy: ['P006'] },
  { key: 'rthCaOrJa', label: 'RθCA / RθJA（工具箱口径）', requiredBy: ['P006'] },
  { key: 'tjMaxC', label: '最大结温', requiredBy: ['P006'] },
  { key: 'switchingTimeNs', label: '开关重叠时间', requiredBy: ['P006'] },
  { key: 'qrrNc', label: '反向恢复电荷 Qrr', requiredBy: ['P006'] },
  { key: 'powerFactorCosPhi', label: '功率因数 cosφ', requiredBy: ['P006'] },
  { key: 'pulseDurationS', label: '热脉冲持续时间', requiredBy: ['P007'] },
  { key: 'thermalTauS', label: '热时间常数 τ', requiredBy: ['P007'] },
  { key: 'deratingBasisC', label: '降额基准温度', requiredBy: ['P007'] },

  // P008 / P014：寄生与 Vds 尖峰
  { key: 'parasiticCapPf', label: '回路寄生电容', requiredBy: ['P008'] },
  { key: 'loopInductanceNh', label: '功率回路寄生电感', requiredBy: ['P008', 'P014'] },

  // P011：UVLO / 预驱供电
  { key: 'vbusMinExpectedV', label: '最低预期母线', requiredBy: ['P011'] },
  { key: 'uvloTypicalV', label: 'UVLO 典型阈值', requiredBy: ['P011'] },
  { key: 'uvloMinV', label: 'UVLO 最小阈值', requiredBy: ['P011'] },

  // P012：Bootstrap
  { key: 'gateChargeQgNc', label: 'MOSFET 总栅电荷 Qg', requiredBy: ['P012'] },
  { key: 'bootRefreshWindowUs', label: '自举刷新窗口', requiredBy: ['P012'] },
  { key: 'bootChargeLoopOhm', label: '自举充电回路电阻', requiredBy: ['P012'] },

  // P013：母线电容最坏容量
  { key: 'capInitialTolerancePct', label: '电容初始公差', requiredBy: ['P013'] },
  { key: 'capEolDeratingPct', label: 'EOL 容量衰减', requiredBy: ['P013'] },
  { key: 'capLowTempDeratingPct', label: '低温容量衰减', requiredBy: ['P013'] },
  { key: 'capRatedRippleCurrentA', label: '电容允许纹波电流', requiredBy: ['P013'] },
  { key: 'capRatedLifeHours', label: '电容额定寿命', requiredBy: ['P013'] },
  { key: 'capRatedTempC', label: '寿命额定温度', requiredBy: ['P013'] },

  // P016：短路保护完整时序
  { key: 'senseDelayNs', label: '电流检测延迟', requiredBy: ['P016'] },
  { key: 'comparatorDelayNs', label: '比较器响应延迟', requiredBy: ['P016'] },
  { key: 'digitalFilterDelayNs', label: '数字滤波延迟', requiredBy: ['P016'] },
  { key: 'driverPropDelayNs', label: '预驱传播延迟', requiredBy: ['P016'] },
  { key: 'gateTurnOffDelayNs', label: '门极关断延迟', requiredBy: ['P016'] },
  { key: 'currentFallDelayNs', label: '电流衰减延迟', requiredBy: ['P016'] },
  { key: 'soaShortCircuitTimeUs', label: 'SOA 短路耐受时间边界', requiredBy: ['P016'] },
  { key: 'easEnergyMj', label: '单脉冲雪崩能量 EAS', requiredBy: ['P016'] },

  // P018：堵转判据
  { key: 'stallCurrentThresholdA', label: '堵转电流阈值', requiredBy: ['P018'] },
  { key: 'stallRpmThreshold', label: '堵转低速阈值', requiredBy: ['P018'] },
  { key: 'stallLevel1TimeMs', label: 'Level 1 时间窗', requiredBy: ['P018'] },
  { key: 'stallLevel2TimeMs', label: 'Level 2 时间窗', requiredBy: ['P018'] },
  { key: 'stallLevel3TimeMs', label: 'Level 3 时间窗', requiredBy: ['P018'] },
  { key: 'stallLockoutCountN', label: 'Level 3 锁存次数 N', requiredBy: ['P018'] },

];

// 去重保护：历史合并时不要因为同义字段误建两份数量。
const UNIQUE_FIELDS = new Map<string, BldcFieldDefinition>();
for (const field of BLDC_FIELDS) {
  if (!UNIQUE_FIELDS.has(field.key)) UNIQUE_FIELDS.set(field.key, field);
}
export const BLDC_FIELD_CATALOG: readonly BldcFieldDefinition[] = [...UNIQUE_FIELDS.values()];

export function unitForBldcKey(key: BldcKey): string { return UNITS[key]; }

export function deriveBldcEvaluationInput(issue: IssueInput): BldcEvaluationInput {
  const quantities = {} as Record<BldcKey, Quantity>;
  for (const field of BLDC_FIELD_CATALOG) quantities[field.key] = issue.quantities[field.key] ?? missing(UNITS[field.key], `需要提供：${field.label}`);
  return { quantities };
}
export function value(input: BldcEvaluationInput, key: BldcKey): number | undefined { return numberOf(input.quantities[key]); }
export function missingFor(input: BldcEvaluationInput, keys: readonly BldcKey[]): string[] {
  return keys.filter((k) => input.quantities[k]?.status !== 'ok').map((k) => `${k}：${input.quantities[k]?.status === 'missing' ? input.quantities[k]?.need : '缺失'}`);
}
