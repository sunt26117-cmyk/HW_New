# AutoHW Core Phase 4 — 决策层

本阶段严格对应指南第 8 章 Phase 4：

- 从触发 Pattern 的 `measures` 派生候选方案；不按域名 switch 写方案文案。
- 候选方案分为 `ROOT_FIX / COMBINED / TEMPORARY` 三档。
- Option 的 VETO 只引用 Pattern 输出，决策层不新增、撤销或重算 VETO。
- C-T-S-Q-L 权重集中在 `core/decision/scoring.ts`，不再由 UI 或 AI 各写一份。
- SOP 且距离节点 ≤21 天时，对涉及 board respin 的方案使用纯函数时间衰减。
- T+24h 遏制时间轴仅来自 `requiresBoardRespin=false` 的临时候选；永久时间轴来自根治/联合或需要改板的候选。
- 修改一个 Pattern 的 `triggered` 状态会同步改变候选方案与时间轴。

## 重要边界

C-T-S-Q-L 是决策政策层，不是物理事实层。技术分由当前触发 Pattern 的风险等级提供锚点，其余维度由 Measure 的成本、天数和副作用元数据确定。所有物理数值仍只来自 `core/physics` 与 Pattern Trace。

## 验收

`tests/core-decision.test.ts` 覆盖：健康无方案、三档候选、VETO 来源、T+24h/永久双时间轴、SOP 时间衰减、权重总和、Pattern 触发变化传播。


## VETO 语义边界

Option 的 `veto` 是 Pattern 当前状态的引用，不是候选方案自身重新计算出的否决。即使某个根治方案本身用于纠正 VETO，当前分析结果仍保留 Pattern VETO，直到重新分析证明原 Pattern 不再触发。

## 时间轴边界

`containment` 只接收 `TEMPORARY && requiresBoardRespin=false`；`permanent` 接收当前被 Pattern VETO 或需要改板的候选，因此一个被 VETO 的临时候选可以同时出现在 T+24h 遏制与永久纠正时间轴；这里不代表决策层撤销了 VETO。两条时间轴均由当前触发 Pattern 的 `Measure[]` 派生，不存在独立的固定行动文案。
