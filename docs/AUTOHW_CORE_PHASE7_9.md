# AutoHW Core Phase 7–9

## Phase 7

- `src/app/versioning.ts`：按 `analysisId` 保存本地版本快照，并提供 A/B diff。
- diff 覆盖输入、Pattern、VETO 和候选方案。
- Delivery 屏只调用这一套版本接口。

## Phase 8

- `core/ai` 只有可插拔 Adapter、Prompt Builder 和 Audit。
- Prompt 只组装确定性 facts、judgment、missing 与 Trace ID。
- AI 文本中的数值 + 单位必须匹配确定性 facts/judgment；Trace ID 必须有效。
- 审计失败直接保留原 deterministic AnalysisResult；AI 没有 VETO 写权限。

## Phase 9

- `vite-plugin-singlefile` 输出 `dist-offline/index.html` 单文件离线构建。
- 默认 `npm run build` 只构建离线产品，不再把 Express server 编进产品。
- Delivery 屏提供浏览器端确定性 system self-check。

## 当前环境限制

本运行环境没有 `node_modules`；此前访问 npm registry 实际返回 DNS `EAI_AGAIN`。因此完整 `npm install`、Vitest runner、ESLint runner、Vite build 未在本环境中执行。CI 已改为使用 `npm install` 后执行 `npm run lint && npm test && npm run build`。

截至当前版本，Node 要求为 `>=20.0.0`；测试/静态检查工具已加入 `package.json`，具体版本以仓库锁定配置为准。

## 黄金用例边界

`src/fixtures/bldc.ts` 仍是 synthetic structural fixture，不冒充用户台架黄金数据。真实台架数据接入 `fixtures/gold` 后，再作为物理公式最终终审依据。
