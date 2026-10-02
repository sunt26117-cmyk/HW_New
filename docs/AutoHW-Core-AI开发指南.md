# AutoHW Core —— 精华提炼版重开发 · AI 开发指南

> 用法：把本文件整份贴给编码 AI（Claude Code / Cursor / Copilot），再按「第 8 章」逐阶段下指令。
> 来源：对 backHW-main（14 视图 / 7 工作台 / P001–P018 + J001–J007）的实读审计。
> 目标：保留"确定性物理 + 可追溯 + 决策"的骨架，砍掉"卡片墙 / 罐头文案 / 重复 UI"。

---

## 0. 一句话定位

**离线优先的车规硬件风险决策副驾**：工程师输入工况与实测值 → 本地确定性物理引擎判定故障模式（每个数字可追溯到来源）→ 给出带 VETO 的候选方案与受控文档。
**AI 只做叙述增强，且必须过审计；任何数值以本地计算为准。**

## 1. 从旧软件提炼的精华（必须保留）

| # | 精华 | 旧软件落点 | 新软件落点 |
|---|---|---|---|
| 1 | **一个 Pattern 一个文件**，统一输出契约，注册表编排 | `domains/bldc/patterns/P0xx.ts` + `bldcEngine.ts` | `core/patterns/<domain>/` |
| 2 | **缺输入 ≠ 默认值**：缺参标 `INSUFFICIENT_INPUT`，不用经验值顶替 | `deterministic*Engine`、`nanGuard` | 数据契约里强制 `Quantity.status` |
| 3 | **字段级 Trace**：每个结论回链到输入来源（实测/规格/假设/文本推断） | `utils/trace.ts`、`TraceNode` | `core/trace` 唯一一份 |
| 4 | **证据优先级**：实测 > 器件库 datasheet > 派生 > 文本推断 > 假设 | `mapMeasurementSourceToTraceSource` | `EvidenceKind` 枚举 + 降级规则 |
| 5 | **实测值驱动**：示波器导入的 Vgs 尖峰优先于理论估算 | P003 `gateSpikeMeasuredV` | 通用规则：同一量有实测则覆盖理论值并标注 |
| 6 | **VETO（一票否决）** 跟随 Pattern 判定，而非人工写死 | `vetoTriggered` | 决策层只读 Pattern 输出 |
| 7 | **C-T-S-Q-L 五维权衡 + 候选方案三档**（根治 / 联合 / 临时） | `scenarioDynamic` | `core/decision` |
| 8 | **AI 防幻觉审计**：数值必须能在确定性事实里找到 | `aiResultAuditor` | `core/ai/audit` |
| 9 | **离线单文件交付** | `vite-plugin-singlefile` | 保留 |
| 10 | **治理型回归断言**（"页面被顶掉""模板数字被当结论"都真发生过） | `scripts/verify-*` | 保留并前置到 Phase 0 |
| 11 | 热-电-米勒级联、母线泵升、关节双质量共振等**物理核心** | `src/physics`、`thermalCascadeEngine` | `core/physics`（唯一一份） |
| 12 | 双时间轴：T+24h 遏制 / 下一版永久纠正 | `dualTimelineEngine` | **改为从候选方案派生**，不再罐头 |

## 2. 明确丢弃 / 重做的东西

| 丢弃 | 原因（旧代码证据） | 替代 |
|---|---|---|
| 14 个视图 / 5 层导航 | 同一批字段在 5–7 个视图重复渲染 | **5 个屏**（第 5 章） |
| `dualTimelineEngine`、`decisionPillars`、`bldcMotorExpert` 的按域罐头文案 | 不经计算按域名 switch 输出；与 `robotJointExpert` 有 12 处以上逐字重复；还藏过"约 约三周"这类错字 | 方案文案由 Pattern 的 `candidateMeasures` 派生；确需静态文字进 `content/` 注册表 |
| `CopilotAnalysisResult` 54 个字段 | 历次迭代逐个追加，每字段一张卡片 | 三层结构：事实 → 判断 → 行动（第 4 章） |
| 输入派生**两条路径** A/B | 缺输入时一边给 NaN、一边给 0，靠"对齐"维持 | **单一派生函数**，缺参统一 `missing` |
| 物理计算两处（`src/physics` 与 `utils/motorPhysicsEngine`） | 双真源 | 只留 `core/physics` |
| `activeTab: string` | 曾导致 3 个工作台点不动且 tsc 抓不到 | 联合类型 + 表驱动路由（第 5 章） |
| Trace 三套 UI、免责横幅重复 4 次 | 每切一页重复轰炸 | 全局只一套 Trace 视图、横幅只挂一次 |
| 三套案例库（preset / gold / regression） | 边界不清、打进前端 bundle | 一套 `fixtures/`，只在测试与"示例加载"用 |
| 21 个域一次铺开 | 多数域只有静态指南，没有确定性判定 | 先 BLDC 做深，再逐域"引擎化"（第 9 章） |

## 3. 总体架构（4 层，单向依赖）

```
ui/            React 视图。只读 AnalysisResult，不做任何物理/决策计算
  ▲
app/           编排：analyze(project, issue) → AnalysisResult；存储；导入导出
  ▲
core/          纯 TypeScript，零 React / 零 DOM / 零网络，可在 node 里整体跑测试
  ├─ model/      数据契约（第 4 章）
  ├─ physics/    唯一物理真源（纯函数）
  ├─ derive/     IssueInput → 各域 EvaluationInput（唯一一条路径）
  ├─ patterns/   <domain>/P001.ts …  + registry.ts
  ├─ trace/      TraceNode 构造与降级规则
  ├─ decision/   候选方案、VETO 汇总、C-T-S-Q-L、双时间轴（派生）
  └─ ai/         prompt 组装、结果导入、审计（可整体删除而不影响核心）
content/       静态文字注册表（假设条款、免责、域指南），UI 只引用 key
fixtures/      验收工况（含用户台架实测数据），测试与示例共用
```

**依赖规则（用 ESLint `no-restricted-imports` 强制）**：`core` 不得 import `ui/app`；`patterns/*` 之间不得互相 import；Pattern 只能读自己的 `EvaluationInput` 和 `physics/*`。

推荐栈：React 19 + TypeScript strict + Vite（`vite-plugin-singlefile`）+ Vitest（取代旧的一堆 `tsx scripts/verify-*`）。**可以不要后端**：旧软件的 Express 只用于代理云端模型，离线形态不需要；云端 AI 做成可选适配器。

## 4. 核心数据契约（先写这个，再写别的）

```ts
// core/model/quantity.ts —— 一切数值的唯一形态
export type EvidenceKind =
  | 'MEASURED'      // 台架/示波器实测
  | 'IMPORTED'      // 波形/文件导入
  | 'DATASHEET'     // 器件库/规格书
  | 'DERIVED'       // 由其它量计算得出
  | 'TEXT_INFERRED' // 从自由文本推断（最低可信）
  | 'ASSUMED';      // 用户显式假设

export type Quantity =
  | { status: 'ok'; value: number; unit: string; evidence: EvidenceKind; sourceLabel?: string; evidenceId?: string; enteredAt: string }
  | { status: 'missing'; unit: string; need: string };   // 缺参：必须说明"需要什么"

// 禁止在任何地方用 0 / 经验默认值代替 missing。
```

```ts
// core/model/pattern.ts —— 所有域的 Pattern 统一输出
export interface PatternOutput {
  id: string;                         // 'BLDC.P003'
  name: string;
  kind: 'FAILURE_MODE' | 'CHECKLIST'; // CHECKLIST 不计入"已触发风险"
  triggered: boolean | 'insufficient_input';
  riskLevel: 'Low' | 'Medium' | 'High' | 'Critical' | 'Unknown';
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';   // 由 trace 自动降级，不得手填
  veto: { triggered: boolean; reason?: string };
  values: Array<{ key: string; label: string; value: Quantity; margin?: Margin }>;
  trace: TraceNode[];                  // 每个 values 项都能回链
  measures: Measure[];                 // 候选措施（决策层从这里派生方案）
  verification: string[];              // 需做的验证/试验
  unknowns: string[];                  // 需补测的量
}

export interface Margin { limit: number; actual: number; unit: string; ratio: number; verdict: 'PASS'|'WARN'|'FAIL' }

export interface Measure { id: string; title: string; requiresBoardRespin: boolean; cost: 'L'|'M'|'H'; days: number; sideEffects: string[] }
```

```ts
// core/model/trace.ts
export interface TraceNode {
  id: string; title: string; formula?: string; standardRef?: string;
  inputs: Array<{ key: string; label: string; value: number|string; evidence: EvidenceKind; evidenceId?: string }>;
  verdict?: 'PASS'|'WARN'|'FAIL'|'INFO';
  degraded: boolean;      // 只要任一输入是 TEXT_INFERRED/ASSUMED/规格常数 → 自动 true
  children?: TraceNode[];
}
```

```ts
// core/model/result.ts —— 取代 54 字段的 CopilotAnalysisResult
export interface AnalysisResult {
  meta: { analysisId: string; inputHash: string; engineVersion: string; at: string; domain: DomainId; source: 'DETERMINISTIC'|'AI_ENHANCED' };
  facts:    { quantities: Quantity[]; missing: string[]; assumptions: string[] };           // 第一层：事实
  judgment: { patterns: PatternOutput[]; dominant?: string; vetoes: Veto[] };               // 第二层：判断
  action:   { options: Option[]; recommended?: string; timeline: DualTimeline; docs: DocRef[] }; // 第三层：行动
  narrative?: { text: string; citedTraceIds: string[]; auditReport: AuditReport };          // 可选，AI 叙述
}
```

**为什么要 `inputHash` + `analysisId`**：旧软件只存最新一份分析，改参数重跑会覆盖。新软件从第一天就带版本，A/B 对比、回归讨论"为什么结论变了"都靠它。

## 5. 界面：5 个屏，不是 14 个

| 屏 | 内容 | 取代旧的 |
|---|---|---|
| ① **决策首页** | 当前问题 / 主导机理 / VETO / 最佳下一步 / 缺什么数据（10 秒屏） | 总览、第一屏、工作流 |
| ② **输入与证据** | 结构化输入（带 evidence 选择）、器件库、波形导入、缺参清单 | 工程输入、事实审计 |
| ③ **物理与机理** | Pattern 列表（按风险排序）→ 展开看公式/裕量/Trace；计算器作为"卡片"挂在这里 | Pattern、计算器、Trace 三套 UI |
| ④ **方案与验证** | 候选方案对比表 + C-T-S-Q-L + VOI/验证清单 + 双时间轴 | 候选方案、驾驶舱、验证闭环、评审回归 |
| ⑤ **交付** | RACI、EDR/8D/受控文档、导出、版本历史与 A/B 对比 | RACI、受控文档 |

功能安全（FMEDA/FTA/寿命）作为 ③ 的一个域模块，不单独成屏。

### 导航实现铁律（旧软件踩过的真坑）

1. 主屏 id 用联合类型 `type Screen = 'home'|'input'|'physics'|'plan'|'deliver'`，**不用 string**。
2. 二级页选择放在**独立 store**（zustand 或 `useSyncExternalStore`），不放组件内 `useState`——旧软件因为外层 `key={activeTab}` 会重挂载工作台，导致所有跨屏深链接落到第一个二级页。
3. 跳转 API 只有一个：`navigate({ screen, sub? })`，**先写 sub 再切 screen**。
4. 每个二级页各包一层 ErrorBoundary，key = `screen:sub`。
5. 全局提示（"模板内容""结果来源"）**只在 Shell 层挂一次**，各屏不得自己渲染。
6. 治理测试：遍历所有深链接 id，断言落点正确；未知 id 回落首页且不抛错；`'constructor'` 之类原型键也要回落。

## 6. 不可违反的工程铁律（写进 CLAUDE.md / .cursorrules）

1. **缺输入不得伪造**：任何物理函数收到 `missing` 必须返回 `insufficient_input`，禁止默认值、禁止 `|| 0`。
2. **实测覆盖理论**：同一物理量有 MEASURED/IMPORTED 时，必须覆盖理论估算，并在 Trace 里写明"用了哪个、舍了哪个"。
3. **模板不得进入结论**：静态文字只允许出现在 `content/`，且 UI 渲染时带"通用说明"标记；**任何带数字的句子必须来自 `values`**。
4. **confidence 与 degraded 由 Trace 自动推导**，Pattern 作者不得手填 `HIGH`。
5. **一个物理量一处真源**：电容、Cgd、热阻等的"取哪个值"只在 `derive/` 解析一次，Pattern 不得各自二次解析。
6. **AI 不得产生新数字**：叙述里出现的数值必须能在 `facts/judgment` 里按值+单位匹配到，否则审计不通过、降级为纯确定性输出。
7. **VETO 只由 Pattern 产生**，决策层与 AI 只能引用，不得新增或撤销。
8. **每个 Pattern 必带 3 类测试**：触发 / 不触发 / 缺输入（见第 7 章）。
9. **文案改动需过 lint**：重复段落检测（见 Phase 6），防止"同文案多处维护"再发生。

## 7. 测试策略（取代 29 个零散 verify 脚本）

用 Vitest，目录与 `core/` 镜像：

- **契约测试**：所有 Pattern 返回值通过 `PatternOutput` schema（zod）；`values` 里每一项在 `trace` 中可找到。
- **三态测试**（每个 Pattern）：① 典型故障工况触发 ② 健康工况不触发 ③ 缺关键输入 → `insufficient_input` 且输出里不出现 `NaN`/`Infinity`/`undefined`。
- **黄金用例**：来自你的**台架实测**（`fixtures/gold/*.json`）。断言计算值与实测同数量级、误差在声明范围内。这是公式可信度的唯一终审，也是发现公式量纲错误的最快方法。
- **治理断言**：导航深链接、"VETO 只来自 Pattern"、"UI 不 import physics"、"content 之外无带数字的静态句子"。
- **冒烟渲染**：每屏用 fixture 渲染一次（`renderToString`），防白屏。
- **AI 审计测试**：喂入含幻觉数字的 AI JSON，必须被拒；喂入合规 JSON，必须通过。

## 8. 分阶段开发（每阶段：目标 → 给 AI 的指令 → 验收）

### Phase 0 · 脚手架与护栏（0.5 天）
**指令**：
> 按本指南第 3 章建 monorepo 骨架（Vite + React + TS strict + Vitest + ESLint）。配置 `no-restricted-imports` 实现依赖规则：core 不得 import ui/app；patterns 之间互不 import。加 CI：`tsc --noEmit && vitest run && vite build`。先不写业务代码。

**验收**：故意在 core 里 import React，lint 必须红。

### Phase 1 · 数据契约与 Trace（1 天）
**指令**：
> 实现第 4 章全部类型，用 zod 写 schema 并导出 `parse*`。实现 `core/trace`：`makeTraceNode` 自动计算 `degraded`（任一输入证据为 TEXT_INFERRED/ASSUMED/规格常数即 true），并提供 `deriveConfidence(trace)`。写单测覆盖所有证据组合。

**验收**：`Quantity.missing` 无法被当作数值传入 `physics`（类型层面报错）。

### Phase 2 · 物理核心（2–3 天）
**指令**：
> 在 `core/physics` 实现纯函数，**全部接受 `Quantity` 或 `number|undefined`，缺参返回 `{ status:'insufficient_input', need:[...] }`**：
> 1. 母线泵升：再生能量 `E = ½·J·ω²·η`，由 `½·C·(Vpk² − V0²) = E` 反解 `Vpk`，再减去线束/制动电阻泄放项
> 2. 热级联：`Rds(Tj)=Rds25·(1+α(Tj−25))^1.8`，`Tj = Tcase + P(Tj)·Rθ`，数值迭代到收敛，**设最大迭代次数与不收敛返回值**
> 3. 门极阈值：`Vth(Tj)=Vth25 + k·(Tj−25)`
> 4. 米勒感应：`Vgs_ind ≈ Cgd·dv/dt·Rg_off`（有 `gateSpikeMeasured` 时优先实测），`margin = Vth(Tj) − Vgs_ind`
> 5. 死区/换相、RC Snubber、关节双质量共振与控制带宽
> 每个函数写量纲注释与单测（含边界：0、负数、极大值、不收敛）。

**验收**：用你的台架实测数据跑黄金用例，误差超范围时**先怀疑公式量纲，再怀疑数据**。

### Phase 3 · 派生层 + 首个 Pattern 簇（2–3 天）
**指令**：
> 实现 `derive/bldc.ts`：`IssueInput → BldcEvaluationInput`，**唯一路径**。自由文本只能产出 `TEXT_INFERRED` 的 Quantity；缺参一律 `missing`。
> 再按 `PatternOutput` 契约实现 P001（母线泵升）、P003（米勒直通）、P006（热）、P016（短路检测延迟）。每个 Pattern 一个文件，必带三态测试。在 `registry.ts` 注册，`evaluateAll()` 统一过 NaN 清洗。

**验收**：健康工况 0 触发；缺参工况全部 `insufficient_input`；Trace 点开能看到每个输入的证据级别。

### Phase 4 · 决策层（2 天）
**指令**：
> 实现 `core/decision`：① 从触发 Pattern 的 `measures` 组装三档方案（根治 / 联合 / 临时缓解），`requiresBoardRespin` 决定是否能进 T+24h 遏制阶段 ② 方案 VETO 严格取自 Pattern ③ C-T-S-Q-L 评分：权重来自 `scoringWeights` 配置，SOP 时间衰减做成**纯函数 + 单测** ④ 双时间轴：遏制 = `requiresBoardRespin=false` 的子集；永久纠正 = 被 VETO 或需改板的方案。**不得出现任何按域名 switch 的整段文案。**

**验收**：改一个输入使某 Pattern 不再触发，对应方案与时间轴项必须同步消失。

### Phase 5 · UI 与导航（3 天）
**指令**：
> 按第 5 章实现 5 屏。先写 `navigation.ts`（联合类型 + 表驱动 + 二级页 store），再写 `Shell`（全局提示只挂这里），最后逐屏接入。每屏只读 `AnalysisResult`。写治理测试：所有深链接 id 的落点断言。

**验收**：从"首页"点任意入口都落到目标二级页；刷新/切屏后二级页记忆保留。

### Phase 6 · 内容注册表与重复文案检测（0.5 天）
**指令**：
> 建 `content/index.ts`：所有静态文字（假设条款、免责、域指南）以 key 引用。写一个 Vitest 用例：扫描 `core/` 与 `ui/` 下长度 ≥ 30 字的中文字符串字面量，若同一段在两处出现则失败；并断言 `core/patterns` 外不存在包含数字的静态句子。

**验收**：故意复制一段文案，测试必须红。

### Phase 7 · 存储、版本与 A/B（1–2 天）
**指令**：
> 分析结果按 `analysisId` 存版本快照（含 `inputHash`、时间戳）。实现"两个版本并排 diff"：输入差异、`values` 差异（含单位与裕量）、VETO 变化。备份/恢复沿用 JSON。

### Phase 8 · 可选 AI 增强（2 天）
**指令**：
> `core/ai`：① 组装提示词时只给模型**确定性事实 + 缺参清单**，要求输出 JSON（含 `citedTraceIds`）② 导入后走审计：每个数字按"值+单位"在 facts/judgment 中匹配，匹配不上则拒收；VETO 不得被改动 ③ 失败回退到纯确定性输出。**默认离线、无后端**；云端适配器做成可插拔。

**验收**：喂一份含编造数字的 AI JSON，必须被拒并给出具体字段。

### Phase 9 · 打包与自检（0.5 天）
**指令**：
> `vite build` 产出单文件离线 HTML；设置页加"系统自检"按钮，在浏览器里跑契约测试 + 黄金用例并展示通过数（现场无网也能给客户看）。

## 9. 之后的扩展路线（按价值）

1. **敏感度 tornado**：对 Tj、泵升电压、米勒裕量自动做 ±20% 单参扫描，告诉用户"最值得去实测的参数"。旧软件的 Monte Carlo 只跑 40 样本且藏在三级页，值得提升为 ③ 的一级能力。
2. **示波器 → 参数自动回填**：FFT + 峰值检测识别振铃频率、过冲，回填 `dv/dt`、`Vpeak` 并标 `IMPORTED` 证据。
3. **8D 报告导出**：D3/D5/D6/D7 的素材在 `AnalysisResult.action` 里已有，只差模板。
4. **EMC 域引擎化**：复用 Pattern 契约，把现在只有静态指南的 EMC 做成确定性判定。
5. 机器人关节 J001–J007 迁移（沿用同一契约，不新增架构）。

## 10. 给编码 AI 的通用工作守则（直接并入 CLAUDE.md）

```
你在开发 AutoHW Core。严格遵守：
1. 先读 docs/本指南第 4、6 章，再写代码。数据类型以第 4 章为准，不得自创并行类型。
2. 任何物理函数：缺输入返回 insufficient_input，禁止默认值/|| 0/NaN 传播。
3. 改动前先写（或补）测试；Pattern 必带 触发/不触发/缺输入 三态测试。
4. core/ 内不得 import React/DOM；patterns/* 之间不得互相 import。
5. 带数字的句子只能来自 values；静态文字只能放 content/，UI 用 key 引用。
6. 不得新增按"域名 switch"输出整段方案文案的代码。
7. 导航只通过 navigate({screen, sub})；二级页状态放 store，不放组件 useState。
8. 每完成一个阶段：运行 tsc --noEmit + vitest + build，贴出结果；失败不要绕过测试。
9. 不确定的物理公式或标准条款，标注"待工程师确认"，不要编造数值或引用。
10. 一次只做一个阶段；超出范围的发现写进 TODO.md，不要顺手改。
```

## 11. 常见坑速查（旧软件已付过学费）

| 坑 | 现象 | 预防 |
|---|---|---|
| 单向映射丢失新 id | 3 个工作台点了没反应 | 联合类型 + 双向解析 + 遍历断言 |
| 组件内二级页状态 + 外层 key 重挂载 | 深链接落到第一个二级页 | 二级页放外部 store |
| 无条件 `triggered:true` 的 Pattern | 每次分析都命中，淹没真风险 | 无证据不触发；CHECKLIST 与 FAILURE_MODE 分开计数 |
| 导入的实测值没人读 | 导入 Vgs 尖峰却不影响任何判断 | "实测覆盖理论"规则 + 测试 |
| 模板数字被当结论 | 受控文档里出现通用数字 | `content/` 隔离 + 渲染时标记 |
| 同一文案多处维护 | 改一处漏一处，错字复制多份 | Phase 6 的重复文案检测 |
| 回填用闭包旧 state | 一供/二供连续回填丢数据 | 一律函数式 `setState(prev => …)` |
| 公式量纲错 | 算出的泵升/温升数量级不对 | 黄金用例用台架实测反向校验 |

---

**建议起步**：只做 Phase 0–3（约一周），产出"BLDC 4 个 Pattern + 可追溯 + 三态测试"的最小闭环，用你的台架数据验证物理核心，再决定后续阶段。
