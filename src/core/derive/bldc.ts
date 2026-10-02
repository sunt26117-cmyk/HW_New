import type { IssueInput, Quantity } from '../model/contracts.ts';
import { missing, numberOf } from '../trace/trace.ts';

export type BldcKey =
  | 'vbusNominalV' | 'vbusMeasuredPeakV' | 'vdsRatingV' | 'regenEfficiency' | 'absorbedEnergyJ' | 'rpm' | 'rotorInertiaKgM2' | 'cbusUf'
  | 'gateSpikeMeasuredV' | 'vthMinV' | 'cgdPf' | 'cgsPf' | 'rgOffOhm' | 'dvDtVns' | 'sourceInductanceNh' | 'diDtANs'
  | 'ambientC' | 'currentRmsA' | 'rdsOnMilliOhm' | 'rdsOnTempCoeff' | 'rthJaCPerW' | 'tjMaxC'
  | 'senseDelayNs' | 'comparatorDelayNs' | 'digitalFilterDelayNs' | 'driverPropDelayNs' | 'gateTurnOffDelayNs' | 'currentFallDelayNs' | 'soaShortCircuitTimeUs';

export interface BldcEvaluationInput { quantities: Record<BldcKey, Quantity>; }

const UNITS: Record<BldcKey, string> = {
  vbusNominalV: 'V', vbusMeasuredPeakV: 'V', vdsRatingV: 'V', regenEfficiency: 'ratio', absorbedEnergyJ: 'J', rpm: 'rpm', rotorInertiaKgM2: 'kg·m²', cbusUf: 'µF',
  gateSpikeMeasuredV: 'V', vthMinV: 'V', cgdPf: 'pF', cgsPf: 'pF', rgOffOhm: 'Ω', dvDtVns: 'V/ns', sourceInductanceNh: 'nH', diDtANs: 'A/ns',
  ambientC: '°C', currentRmsA: 'A', rdsOnMilliOhm: 'mΩ', rdsOnTempCoeff: '1/°C', rthJaCPerW: '°C/W', tjMaxC: '°C',
  senseDelayNs: 'ns', comparatorDelayNs: 'ns', digitalFilterDelayNs: 'ns', driverPropDelayNs: 'ns', gateTurnOffDelayNs: 'ns', currentFallDelayNs: 'ns', soaShortCircuitTimeUs: 'µs',
};

export const BLDC_FIELDS: Array<{ key: BldcKey; label: string; requiredBy: string[] }> = [
  { key: 'vbusNominalV', label: '母线标称电压', requiredBy: ['P001'] },
  { key: 'vdsRatingV', label: 'MOSFET VDS 额定耐压', requiredBy: ['P001'] },
  { key: 'regenEfficiency', label: '再生能量进入 DC-Link 的效率 η', requiredBy: ['P001'] },
  { key: 'absorbedEnergyJ', label: '线束/制动电阻等已知泄放吸收能量', requiredBy: ['P001'] },
  { key: 'rpm', label: '电机转速', requiredBy: ['P001'] },
  { key: 'rotorInertiaKgM2', label: '转子等效惯量', requiredBy: ['P001'] },
  { key: 'cbusUf', label: 'DC-Link 母线电容', requiredBy: ['P001'] },
  { key: 'vbusMeasuredPeakV', label: '台架实测母线峰值', requiredBy: [] },
  { key: 'vthMinV', label: 'MOSFET 最低 Vth', requiredBy: ['P003'] },
  { key: 'cgdPf', label: 'Cgd/Crss 取点值', requiredBy: ['P003'] },
  { key: 'rgOffOhm', label: '关断下拉电阻总量', requiredBy: ['P003'] },
  { key: 'dvDtVns', label: '开关节点 dv/dt', requiredBy: ['P003'] },
  { key: 'gateSpikeMeasuredV', label: 'Vgs 实测尖峰', requiredBy: [] },
  { key: 'cgsPf', label: '栅源电容 Cgs', requiredBy: [] },
  { key: 'sourceInductanceNh', label: '源极寄生电感', requiredBy: [] },
  { key: 'diDtANs', label: 'di/dt', requiredBy: [] },
  { key: 'ambientC', label: '基准温度', requiredBy: ['P006'] },
  { key: 'currentRmsA', label: 'MOSFET RMS 电流', requiredBy: ['P006'] },
  { key: 'rdsOnMilliOhm', label: '25°C Rds(on)', requiredBy: ['P006'] },
  { key: 'rdsOnTempCoeff', label: 'Rds(on) 温度系数 α', requiredBy: ['P006'] },
  { key: 'rthJaCPerW', label: '结到环境热阻', requiredBy: ['P006'] },
  { key: 'tjMaxC', label: '最大结温', requiredBy: ['P006'] },
  { key: 'senseDelayNs', label: '电流检测延迟', requiredBy: ['P016'] },
  { key: 'comparatorDelayNs', label: '比较器响应延迟', requiredBy: ['P016'] },
  { key: 'digitalFilterDelayNs', label: '数字滤波延迟', requiredBy: ['P016'] },
  { key: 'driverPropDelayNs', label: '预驱传播延迟', requiredBy: ['P016'] },
  { key: 'gateTurnOffDelayNs', label: '门极关断延迟', requiredBy: ['P016'] },
  { key: 'currentFallDelayNs', label: '电流衰减延迟', requiredBy: ['P016'] },
  { key: 'soaShortCircuitTimeUs', label: 'SOA 短路耐受时间边界', requiredBy: ['P016'] },
];

export function unitForBldcKey(key: BldcKey): string { return UNITS[key]; }

export function deriveBldcEvaluationInput(issue: IssueInput): BldcEvaluationInput {
  const quantities = {} as Record<BldcKey, Quantity>;
  for (const field of BLDC_FIELDS) quantities[field.key] = issue.quantities[field.key] ?? missing(UNITS[field.key], `需要提供：${field.label}`);
  return { quantities };
}

export function value(input: BldcEvaluationInput, key: BldcKey): number | undefined { return numberOf(input.quantities[key]); }
export function missingFor(input: BldcEvaluationInput, keys: readonly BldcKey[]): string[] {
  return keys.filter((k) => input.quantities[k]?.status !== 'ok').map((k) => `${k}：${input.quantities[k]?.status === 'missing' ? input.quantities[k]?.need : '缺失'}`);
}
