# AutoHW Core Phase 5 — 5 屏 UI 与导航

对应指南第 5 章：

1. `home` 决策首页：当前问题、主导机理、VETO、最佳下一步、缺失输入。
2. `input` 输入与证据：BLDC 输入字段、证据类型和来源标签；空值保持 missing。
3. `physics` 物理与机理：Pattern 按风险顺序查看 values、margin、Trace 和 unknowns。
4. `plan` 方案与验证：三档候选、C-T-S-Q-L、VETO 来源、T+24h / 永久时间轴、验证动作。
5. `deliver` 交付：Analysis ID/Input Hash/Engine version、受控文档引用和 JSON 导出。

导航实现：

- `Screen` 使用联合类型。
- 二级页状态使用 `useSyncExternalStore` 外部 store。
- 唯一跳转 API `navigate({screen, sub?})`。
- 每个屏使用 `ScreenErrorBoundary`，key 为 `screen:sub`。
- Shell 只渲染一次全局事实边界提示。
- UI 屏幕不直接 import `core/physics` 或 `core/decision`，不重新计算工程结论。
- 深链接未知值返回 `home`；`constructor`、`toString`、`__proto__` 等原型键通过运行时归一化仍只能回到 `home`。
