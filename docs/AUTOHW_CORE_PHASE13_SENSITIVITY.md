# AutoHW Core Phase 13 · BLDC 单参敏感度 Tornado

本阶段把“现在最值得获取哪一个工程证据”做成确定性分析辅助，不替代 Pattern 风险结论。

## 规则

- 每次只改变一个当前工程输入，其余输入保持不变。
- 默认扫描范围来自工具参数；当前 UI 使用一个对称比例范围。
- 每个端点都重新执行 `analyze()`，因此 Pattern、VETO、Trace 和证据优先级仍来自同一 deterministic truth source。
- 当前目标量覆盖 P001 母线峰值、P003 米勒裕量、P006 结温。
- “影响”是目标量相对于基线尺度的变化，不是风险评分。
- “实测价值”只是证据质量启发式：已经是 MEASURED/IMPORTED 的量不再给出额外测量优先级。
- 缺输入、不有限或非正值不会伪造扫描值，而是进入 skipped。
