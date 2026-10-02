# AutoHW Core Phase 0–3 交付说明

## 基线

本次重开发以《AutoHW Core —— 精华提炼版重开发 · AI 开发指南》为唯一架构基线。指南明确要求保留“确定性物理 + 可追溯 + 决策”，将旧 14 视图体系逐步重做为 4 层架构，并建议起步只做 Phase 0–3。

## 已完成

- `core/model/`：统一 `EvidenceKind`、`Quantity`、`PatternOutput`、`AnalysisResult` 等新契约，并提供 zod schema。
- `core/trace/`：统一 Trace、证据优先级、`degraded`、`deriveConfidence`、Margin。
- `core/physics/`：母线泵升、热-电级联、Vth(Tj)、米勒感应、保护链 Fault-to-Off、RC/LC 共振基础、死区误差、关节双质量共振、控制带宽比等纯函数。
- `core/derive/bldc.ts`：BLDC 单一派生路径，缺参统一为 `missing`。
- `core/patterns/bldc/`：P001 / P003 / P006 / P016，一 Pattern 一文件，统一 registry。
- 实测优先：P001 实测 Vbus、P003 实测 Vgs 覆盖理论值，并保留 Trace。
- P006 使用温度反馈的 Rds(on) 迭代，不再用固定导通电阻直接给结论。
- P016 按“保护链 Fault-to-Off ↔ SOA”实现，去掉旧代码中的经验延迟默认值。
- `fixtures/` 与三态/治理验收脚本已建立。
- `CLAUDE.md` 已写入开发铁律，防止后续编码 AI 回到默认值、硬编码结论、跨层依赖和 Pattern 互相调用。

## 验收结果

当前无 `node_modules`，因此本环境不能假装已经执行完整 `npm install + Vitest + ESLint + Vite build`。

已实际执行并通过：

```text
tsc -p tsconfig.core.json
AUTOHW CORE PHASE 0-3 VERIFY PASS
AUTOHW CORE PHASE 0-3 POLICY PASS
```

新测试脚本覆盖：

- 健康工况不触发
- 缺关键输入 → `insufficient_input`
- 四个 Pattern 各自的触发态
- P001 / P003 实测覆盖理论
- Pattern values ↔ Trace 可回链
- VETO 来源仅在 Pattern
- inputHash / analysisId 版本身份
- 物理函数边界和热迭代不收敛

## 尚未完成，且刻意没有越级修改

- Phase 4 `core/decision`：C-T-S-Q-L、三档候选、VETO 汇总、双时间轴。
- Phase 5：5 屏 UI、联合类型导航、二级页 store、全局 Trace/Shell。
- Phase 6：content 全量迁移与重复文案治理。
- Phase 7：版本快照与 A/B diff。
- Phase 8：AI prompt/audit adapter。
- Phase 9：最终离线单文件与浏览器系统自检。

另外，当前 `fixtures/bldc.ts` 是**结构测试用 synthetic fixture，不是用户台架黄金用例**。指南要求最终黄金用例来自用户台架实测；在没有把你的真实台架数据放进 fixture 前，不应声称黄金用例已经完成。
