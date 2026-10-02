import type { EngineeringProject } from '../core/model/contracts.ts';

export interface ScenarioTemplate {
  id: string;
  name: string;
  domain: string;
  description: string;
  issue: { title: string; phenomenon: string; requirement: string; testCondition: string };
}

export const SCENARIO_TEMPLATES: readonly ScenarioTemplate[] = [
  { id: 'bldc-emergency-stop', name: 'BLDC 急停 / 母线泵升', domain: 'BLDC', description: '围绕急停再生能量、母线峰值、VDS 裕量与米勒风险建立分析案卷。', issue: { title: '急停时母线峰值与 Vgs 瞬态异常', phenomenon: '急停/堵转切换时母线电压冲高，同时下桥 Vgs 出现瞬态抬升。', requirement: '母线峰值必须低于器件耐压边界，并保持 Gate 驱动安全裕量。', testCondition: '台架急停；记录 Vbus / Vgs / Vds 波形并绑定本次工况。' } },
  { id: 'emc-bci', name: 'EMC / BCI 免疫异常', domain: 'EMC', description: '保留原工程的 EMC/BCI 工作流入口；当前 BLDC Core 不会冒充 EMC 物理结论。', issue: { title: 'BCI 注入后出现异常复位/栅极扰动', phenomenon: '电流注入扫频过程中出现功能异常或功率级波形扰动。', requirement: '按项目 EMC 规范与 BCI 试验计划建立可追溯的频点、注入电流和失效证据。', testCondition: 'BCI 夹具 + 注入探头；记录频点、注入等级、受影响通道及波形。' } },
  { id: 'wcca', name: 'WCCA 最坏情况闭环', domain: 'WCCA', description: '保留器件公差、温漂、ADC/运放等最坏情况分析工作入口。', issue: { title: '全温与公差叠加后精度裕量不足', phenomenon: '极端温度/器差条件下关键输出逼近规格边界。', requirement: '建立 tolerance stack、temperature drift、lifetime evidence，并明确放行边界。', testCondition: '全温扫描 + 参数分布/料差抽样；要求实测结果与 WCCA 对账。' } },
  { id: 'thermal', name: '热设计极限', domain: 'Thermal', description: '持续高负载、高环境温度下的热设计闭环；可逐步补充真实 Tj/Tc 测量。', issue: { title: '高温高负载下结温裕量不足', phenomenon: '长时间运行后器件温升逼近结温边界。', requirement: 'Tj 必须低于项目放行边界，并留出规定降额裕量。', testCondition: '高温箱 + 稳态/阶跃负载；同步记录环境、负载、壳温与波形。' } },
  { id: 'component-alternative', name: '器件替代 / 供货变更', domain: 'Component Alternative', description: '先进入器件资料与候选映射工作流，再用确定性 Pattern 做风险复核。', issue: { title: '替代料动态参数与原器件存在偏差', phenomenon: '替代器件的寄生/动态/热参数与现设计口径不一致。', requirement: '替代料必须完成规格、实测、可靠性与生产证据闭环。', testCondition: '双脉冲 + 高低温 + 关键波形/温升对比。' } },
];

export function applyScenarioTemplate(template: ScenarioTemplate, current: EngineeringProject): EngineeringProject {
  const nextDomain = template.domain === 'EMC' ? 'EMC' : current.meta.domain;
  return {
    ...current,
    meta: { ...current.meta, domain: nextDomain },
    issue: { ...current.issue, title: template.issue.title, phenomenon: template.issue.phenomenon, requirement: template.issue.requirement, testCondition: template.issue.testCondition },
  };
}
