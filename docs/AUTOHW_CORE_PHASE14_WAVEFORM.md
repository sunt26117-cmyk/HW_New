# AutoHW Core Phase 14 · 波形证据自动回填

## 目标
将示波器分析结果稳定地投影到 canonical 工程输入，并明确保护边界。

## 规则
- 只允许已定义 canonical 工程字段进入 AnalysisResult。
- `IMPORTED` 新证据可覆盖 DATASHEET / DERIVED / TEXT_INFERRED / ASSUMED。
- 已有 `MEASURED` 默认保护；只有工程师明确勾选覆盖才更新。
- `vdsPeakV` 当前只是波形证据展示项，不自动新建工程真源。
- 每次回填保留 evidenceId / sourceLabel / enteredAt / confidence。
- 波形指标必须来自当前导入波形，不允许示例数字。
