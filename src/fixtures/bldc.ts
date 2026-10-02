// Synthetic smoke fixtures for Phase 0–3 structural/three-state tests. These are NOT engineering gold cases. Replace/augment with user bench measurements before Phase 4 final acceptance.
import type { EvidenceKind, EngineeringProject, Quantity } from '../core/model/contracts.ts';

const q = (value: number, unit: string, evidence: EvidenceKind): Quantity => ({ status: 'ok', value, unit, evidence, enteredAt: 'fixture' });
const m = (unit: string, need: string): Quantity => ({ status: 'missing', unit, need });

const base = {
  vbusNominalV: q(48, 'V', 'MEASURED'), regenEfficiency: q(0.85, 'ratio', 'DATASHEET'), absorbedEnergyJ: q(0, 'J', 'MEASURED'), vbusMeasuredPeakV: q(49, 'V', 'MEASURED'), vdsRatingV: q(100, 'V', 'DATASHEET'), rpm: q(1000, 'rpm', 'MEASURED'), rotorInertiaKgM2: q(0.0001, 'kg·m²', 'DATASHEET'), cbusUf: q(1000, 'µF', 'DATASHEET'),
  vthMinV: q(2.2, 'V', 'DATASHEET'), cgdPf: q(20, 'pF', 'DATASHEET'), cgsPf: q(800, 'pF', 'DATASHEET'), rgOffOhm: q(4.7, 'Ω', 'DATASHEET'), dvDtVns: q(2, 'V/ns', 'MEASURED'), gateSpikeMeasuredV: q(0.8, 'V', 'MEASURED'), sourceInductanceNh: q(2, 'nH', 'DERIVED'), diDtANs: q(1, 'A/ns', 'MEASURED'),
  ambientC: q(25, '°C', 'MEASURED'), currentRmsA: q(10, 'A', 'MEASURED'), rdsOnMilliOhm: q(5, 'mΩ', 'DATASHEET'), rdsOnTempCoeff: q(0.002, '1/°C', 'DATASHEET'), rthJaCPerW: q(8, '°C/W', 'DATASHEET'), tjMaxC: q(150, '°C', 'DATASHEET'),
  senseDelayNs: q(80, 'ns', 'MEASURED'), comparatorDelayNs: q(60, 'ns', 'MEASURED'), digitalFilterDelayNs: q(40, 'ns', 'MEASURED'), driverPropDelayNs: q(50, 'ns', 'DATASHEET'), gateTurnOffDelayNs: q(80, 'ns', 'MEASURED'), currentFallDelayNs: q(60, 'ns', 'MEASURED'), soaShortCircuitTimeUs: q(2, 'µs', 'DATASHEET'),
};

export const BLDC_HEALTHY: EngineeringProject = { meta: { projectId: 'fixture-healthy', projectName: 'BLDC synthetic healthy', domain: 'BLDC', phase: 'EVT', at: 'fixture' }, issue: { title: '健康工况基线', quantities: base } };
export const BLDC_MISSING: EngineeringProject = { ...BLDC_HEALTHY, meta: { ...BLDC_HEALTHY.meta, projectId: 'fixture-missing' }, issue: { ...BLDC_HEALTHY.issue, quantities: { ...base, rotorInertiaKgM2: m('kg·m²', '需要转子等效惯量或台架标定值') } } };
export const BLDC_P001_FAULT: EngineeringProject = { ...BLDC_HEALTHY, meta: { ...BLDC_HEALTHY.meta, projectId: 'fixture-p001-fault' }, issue: { ...BLDC_HEALTHY.issue, quantities: { ...base, rpm: q(3800, 'rpm', 'MEASURED'), vbusMeasuredPeakV: q(104, 'V', 'MEASURED') } } };
export const BLDC_P003_FAULT: EngineeringProject = { ...BLDC_HEALTHY, meta: { ...BLDC_HEALTHY.meta, projectId: 'fixture-p003-fault' }, issue: { ...BLDC_HEALTHY.issue, quantities: { ...base, gateSpikeMeasuredV: q(2.5, 'V', 'MEASURED'), dvDtVns: q(8, 'V/ns', 'MEASURED') } } };
export const BLDC_P006_FAULT: EngineeringProject = { ...BLDC_HEALTHY, meta: { ...BLDC_HEALTHY.meta, projectId: 'fixture-p006-fault' }, issue: { ...BLDC_HEALTHY.issue, quantities: { ...base, ambientC: q(100, '°C', 'MEASURED'), currentRmsA: q(60, 'A', 'MEASURED'), rdsOnMilliOhm: q(20, 'mΩ', 'DATASHEET'), rthJaCPerW: q(1, '°C/W', 'DATASHEET') } } };
export const BLDC_P016_FAULT: EngineeringProject = { ...BLDC_HEALTHY, meta: { ...BLDC_HEALTHY.meta, projectId: 'fixture-p016-fault' }, issue: { ...BLDC_HEALTHY.issue, quantities: { ...base, senseDelayNs: q(500, 'ns', 'MEASURED'), comparatorDelayNs: q(500, 'ns', 'MEASURED'), digitalFilterDelayNs: q(500, 'ns', 'MEASURED'), driverPropDelayNs: q(500, 'ns', 'MEASURED'), gateTurnOffDelayNs: q(500, 'ns', 'MEASURED'), currentFallDelayNs: q(500, 'ns', 'MEASURED') } } };

/** 输入齐全但热-电自洽迭代无稳态解（热失控判据）：必须触发 P006 并 VETO，不得表现为"缺输入" */
export const BLDC_P006_RUNAWAY: EngineeringProject = { ...BLDC_HEALTHY, meta: { ...BLDC_HEALTHY.meta, projectId: 'fixture-p006-runaway' }, issue: { ...BLDC_HEALTHY.issue, quantities: { ...base, ambientC: q(125, '°C', 'MEASURED'), currentRmsA: q(80, 'A', 'MEASURED'), rdsOnMilliOhm: q(6, 'mΩ', 'DATASHEET'), rthJaCPerW: q(35, '°C/W', 'DATASHEET'), rdsOnTempCoeff: q(0.01, '1/°C', 'DATASHEET') } } };

/** 有稳定热平衡但 Tj 超过额定值：必须保持物理可解，再由 P006 的 TjMax margin 触发 VETO，而不是误判为热失控。 */
export const BLDC_P006_OVER_TEMP_STABLE: EngineeringProject = { ...BLDC_HEALTHY, meta: { ...BLDC_HEALTHY.meta, projectId: 'fixture-p006-over-temp-stable' }, issue: { ...BLDC_HEALTHY.issue, quantities: { ...base, ambientC: q(80, '°C', 'MEASURED'), currentRmsA: q(50, 'A', 'MEASURED'), rdsOnMilliOhm: q(10, 'mΩ', 'DATASHEET'), rthJaCPerW: q(1, '°C/W', 'DATASHEET'), rdsOnTempCoeff: q(0.002, '1/°C', 'DATASHEET'), tjMaxC: q(110, '°C', 'DATASHEET') } } };
