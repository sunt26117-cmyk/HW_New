import type { Measure } from '../core/model/contracts.ts';

export const BLDC_CONTENT = {
  measures: {
    busClamp: (): Measure => ({ id: 'M-P001-CLAMP', title: '建立母线瞬态钳位路径', requiresBoardRespin: true, cost: 'M', days: 0, sideEffects: ['需要复核瞬态能量、热容量与布置寄生参数'] }),
    busCap: (): Measure => ({ id: 'M-P001-CAP', title: '调整 DC-Link 储能与布局', requiresBoardRespin: true, cost: 'M', days: 0, sideEffects: ['体积、成本和器件寿命需要重新评估'] }),
    busContainment: (): Measure => ({ id: 'M-P001-CONTAIN', title: '临时限制急停能量回馈并降低母线瞬态风险', requiresBoardRespin: false, cost: 'L', days: 0, sideEffects: ['牺牲部分性能或可用工况范围，直到永久硬件措施验证完成'] }),
    gateDrive: (): Measure => ({ id: 'M-P003-GATE', title: '优化关断回路与门极钳位', requiresBoardRespin: true, cost: 'L', days: 0, sideEffects: ['需要检查开关损耗、EMI 与驱动器工作区'] }),
    gateContainment: (): Measure => ({ id: 'M-P003-CONTAIN', title: '临时降低开关速度与高 dv/dt 工况暴露', requiresBoardRespin: false, cost: 'L', days: 0, sideEffects: ['可能增加开关损耗并影响动态性能'] }),
    thermalPath: (): Measure => ({ id: 'M-P006-THERMAL', title: '降低 MOSFET 导通损耗或改善散热路径', requiresBoardRespin: true, cost: 'M', days: 0, sideEffects: ['器件替代、铜箔和散热结构可能联动变化'] }),
    thermalContainment: (): Measure => ({ id: 'M-P006-CONTAIN', title: '临时限制高温高电流工况占空与持续时间', requiresBoardRespin: false, cost: 'L', days: 0, sideEffects: ['降低可用性能并改变任务剖面'] }),
    scProtection: (): Measure => ({ id: 'M-P016-SC', title: '缩短故障关断路径并提高短路能量能力', requiresBoardRespin: true, cost: 'M', days: 0, sideEffects: ['保护阈值变化可能影响正常瞬态容限'] }),
    scContainment: (): Measure => ({ id: 'M-P016-CONTAIN', title: '临时降低故障能量并限制高风险运行窗口', requiresBoardRespin: false, cost: 'L', days: 0, sideEffects: ['降低可用电流或功能覆盖范围'] }),
  },
  verification: {
    bus: '在目标工况下用高压差分探头捕获 DC-Link 波形，并记录触发条件与实测峰值。',
    gate: '同步观察开关节点与 Vgs，保持探头连接方式和带宽限制可复现，并获取门极尖峰证据。',
    thermal: '按项目工况完成温升试验并记录温度、Rds(on) 取值依据与结温路径。',
    shortCircuit: '在受控条件下测量故障检测、关断链路各阶段延迟，并与实际器件 SOA 边界对比。',
  },
};
