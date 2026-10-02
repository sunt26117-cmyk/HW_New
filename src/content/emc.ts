import type { Measure } from '../core/model/contracts.ts';

export const EMC_CONTENT = {
  measures: {
    pathIsolation: (): Measure => ({ id: 'M-EMC-PATH', title: '定位共模回流、连接器、参考地与滤波路径并做 A/B 隔离', requiresBoardRespin: true, cost: 'M', days: 3, sideEffects: ['可能改变阻抗、滤波损耗或热路径，需要配套回归'] }),
    testContainment: (): Measure => ({ id: 'M-EMC-CONTAIN', title: '保留当前异常频点与注入工况证据，增加受扰节点和功能状态同步记录', requiresBoardRespin: false, cost: 'L', days: 1, sideEffects: ['只能作为证据/遏制手段，不能替代物理整改'] }),
  },
  verification: {
    bci: '按项目 EMC 规范确认实际试验等级与放行判据；逐频点记录注入电流、敏感节点、功能状态和恢复证据。',
    path: '对线束、连接器、参考地、滤波与屏蔽做可重复 A/B 隔离，并保留未软件掩蔽的物理证据。',
    causality: '发生功能异常后，至少把注入条件、共模路径、敏感节点、功能后果与恢复证据绑定到同一试验记录；缺一项就标证据不足。',
  },
  validation: {
    p001Invalid: 'BCI 注入、敏感频点与功能结果标记必须是有效工程值。',
    c001Invalid: 'BCI 试验覆盖条件不完整或顺序无效。',
  },
} as const;
