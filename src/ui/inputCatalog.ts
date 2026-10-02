import { BLDC_FIELD_CATALOG, type BldcFieldDefinition, type BldcKey, unitForBldcKey } from '../core/derive/bldc.ts';

export type InputGroup = {
  id: string;
  title: string;
  description: string;
  fields: Array<BldcFieldDefinition & { unit: string }>;
};

const toFields = (predicate: (field: BldcFieldDefinition) => boolean) =>
  BLDC_FIELD_CATALOG.filter(predicate).map((field) => ({ ...field, unit: unitForBldcKey(field.key) }));

const assigned = new Set<BldcKey>();
const group = (id: string, title: string, description: string, predicate: (field: BldcFieldDefinition) => boolean): InputGroup => {
  const fields = toFields((field) => !assigned.has(field.key) && predicate(field));
  fields.forEach((field) => assigned.add(field.key));
  return { id, title, description, fields };
};

export const INPUT_GROUPS: InputGroup[] = [
  group('P001', '母线泵升 / DC-Link', '最高优先级：母线标称、实测峰值、器件耐压、再生能量与母线电容。', (f) => f.requiredBy.includes('P001') || f.key === 'vbusMeasuredPeakV'),
  group('P003', 'Miller / Vgs 瞬态', '开关节点 dv/dt、Cgd、Rg、Vth 与示波器 Vgs 实测。', (f) => f.requiredBy.includes('P003')),
  group('P006', '热-电级联 / 损耗', '结温、Rds(on) 温漂、电流、热阻与开关损耗相关输入。', (f) => f.requiredBy.includes('P006')),
  group('P016', '保护链 ↔ SOA', '检测、比较器、数字滤波、驱动关断到电流下降的完整时间链。', (f) => f.requiredBy.includes('P016')),
  group('P004/P005', '死区 / 换相 / 二极管', '驱动传播、下降时间、PWM、二极管 Vf 与调制比。', (f) => f.requiredBy.some((id) => id === 'P004' || id === 'P005')),
  group('P008/P014', '寄生 / 尖峰', '功率回路 L/C 等寄生参数，用于尖峰与阻尼校核。', (f) => f.requiredBy.some((id) => id === 'P008' || id === 'P014')),
  group('P011/P012/P013', '供电 / Bootstrap / 电容寿命', 'UVLO、自举刷新以及 DC-Link 电容最坏容量与寿命输入。', (f) => f.requiredBy.some((id) => id === 'P011' || id === 'P012' || id === 'P013')),
  group('P018', '堵转 / 保护时序', '堵转电流、低速阈值、多级时间窗与锁存次数。', (f) => f.requiredBy.includes('P018')),
  group('P002/P007', '高级 / 扩展模型', '当前主要用于后续 Pattern 引擎；先保留输入与证据，不会因为字段存在就参与判断。', (f) => f.requiredBy.some((id) => id === 'P002' || id === 'P007')),
  group('ADV', '工程校核 / 尚未接入判据', '已知工程量先进入 Evidence；未接入 Pattern 的字段不会被静默用于风险判断。', () => true),
];

export const INPUT_GROUPS_BY_ID = new Map(INPUT_GROUPS.map((g) => [g.id, g]));
