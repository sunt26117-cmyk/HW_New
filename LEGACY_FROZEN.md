# Legacy archive status

旧实现已经从活动 `src/` 移出并归档到 `legacy/`。它不参与 Vite 应用入口、Core 类型检查或产品运行时。

活动架构只有：`src/core` → `src/app` → `src/ui`，以及 `src/content` / `src/fixtures`。

旧代码仅作为迁移参考，不得重新 import 回活动代码；新增能力必须遵循《AutoHW Core —— 精华提炼版重开发 · AI 开发指南》。
