# AutoHW Core v4 能力回归地图

## 目标

5 个主屏幕只负责导航与工程阶段，不删减工程能力。旧版成熟能力迁移到统一 Evidence / AnalysisResult 链路，禁止把旧版 App.tsx / Context / Domain 双真源架构搬回来。

## ① 决策首页

- 当前工程问题、主导 Pattern、VETO、缺失证据、下一步措施
- 快捷入口：示波器、器件/规格书、计算器、回归验证

## ② 输入与证据

### 工程参数

- BLDC canonical numeric field catalog：完整保留旧版已识别的工程数值字段
- P001/P003/P006/P016 为当前确定性主 Pattern 优先区
- P004/P005、P008/P014、P011/P012/P013、P018、P002/P007 与扩展字段分组保留
- 字段搜索 + 只看缺失，避免 70 左右字段形成卡片墙
- 每个 Quantity 强制 evidence；没有数值或没有证据类型仍为 missing

### 示波器

- CSV/TXT 文件导入
- 粘贴文本导入
- 分隔符识别与元数据跳过
- 非递增时间轴拒绝
- Vbus/Vgs/Vds 通道角色映射
- 20–80% 边沿 dv/dt
- 触发前基线
- 主边沿后振铃峰间隔
- 均匀采样重采样后 FFT
- 波形本地留存与回看
- 实测结果以 IMPORTED Evidence 回填
- Vds 不再冒充 Vbus

### 器件 / 规格书

- AI 提取 JSON 模板与导入
- 规格参数候选生成
- DATASHEET 直接值与 DERIVED / 曲线候选分层
- 未映射资料保留
- 人工确认映射
- 实测值覆盖/保护规则
- 器件库、当前器件、器件对比

> 当前“规格书导入”沿用旧版实际可靠的数据边界：规格书经过提取形成结构化 JSON，再进入器件库/候选映射；没有为了 UI 方便直接把 PDF OCR 结果伪装成确定性工程数值。

### 工况 / 案卷

- 5 个模板工况
- 本地保存、恢复、删除
- 切换工况后统一重新分析

## ③ 物理与机理

- P001 / P003 / P006 / P016 deterministic Pattern
- 统一 Trace
- 工程计算器卡片
- 母线泵升、Miller、热级联、短路/SOA、Snubber、Deadtime、带宽/共振、WCCA、Foster 热、DC 电压裕量、换相、安全链等工具
- 稳定过温 ≠ 热失控；真正无安全稳态才产生 diverged

## ④ 方案与验证

- ROOT_FIX / COMBINED / TEMPORARY 三档方案
- C-T-S-Q-L
- VETO 只取 Pattern
- Verification Loop
- Regression Lab
- Gold Cases 接口保留，真实台架数据才可进入 gold/

## ⑤ 交付

- RACI
- EDR / 受控文档
- 导出
- 本地版本与 A/B
- 工作区备份/恢复

## 当前用户路线

- 8D 报告导出：用户明确排除，不进入当前产品。
- Phase 14：波形 → Evidence 自动回填治理已接入。
- Phase 15：Gold Case 治理框架已接入；真实注册表保持为空直到收到台架数据。
- Phase 16：BCI 异常因果链检查已接入；不制造通用门限，缺证据就保持 insufficient_input。
- 用户明确：8D 报告导出不进入当前产品。

## 禁止回归的旧能力

- 按域名 switch 生成整段方案文案
- 多套物理真源
- 多套 Trace UI
- `activeTab: string`
- 页面自行计算物理结论
- 示例数字直接进入工程结论
- 未确认的 DERIVED / curve-only 参数静默回填

## Phase 12 · EMC / BCI

- `EngineeringDomain` 新增 `EMC`，工况模板可以切换到 EMC/BCI。
- `EMC.P001`：BCI 功能抗扰异常，完整证据下按功能失效观察触发 High；不自行制造 VETO。
- `EMC.C001`：BCI 试验可追溯性 CHECKLIST，缺起止频率/注入/线束配置时保持 `insufficient_input`。
- BCI 输入独立进入 Evidence，不污染 BLDC 物理真源。

## Phase 13 · BLDC 单参敏感度 Tornado
- 物理与机理新增二级入口 `sensitivity`
- 每个候选输入单独 ±比例扫描并重新执行 deterministic `analyze()`
- 目标量：P001 母线峰值、P003 米勒裕量、P006 结温
- 输出物理敏感度与证据质量启发式“实测价值”
- 不对 missing / invalid 输入伪造扫描值
