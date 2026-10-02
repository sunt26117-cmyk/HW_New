# AutoHW Core Phase 15 · Gold Case 框架

Gold Case 只允许来自真实台架/实测证据。当前注册表保持为空，不允许用 synthetic fixture 冒充最终公式验收。

## Case 必须包含
- 唯一 case id、工程域、完整工程输入
- measured/imported evidenceId
- 预期值 + 明确容差
- 预期值的证据来源与 rationale
- 版本与复现说明

`assertGoldCaseReady()` 会拒绝没有真实 measured/imported evidence 的 case。
