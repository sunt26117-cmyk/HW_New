# AutoHW Core 当前状态

## 主线

当前仓库已经从旧 14/7 工作台体系切换到 AutoHW Core 主线。旧实现不再属于活动应用，统一归档到 `legacy/`；活动代码只在 `src/app`、`src/core`、`src/ui`、`src/content`、`src/fixtures`。

## Phase 0–9

- Phase 0：脚手架、分层护栏、Core 依赖治理。
- Phase 1：Quantity / PatternOutput / AnalysisResult / Trace / Zod contract。
- Phase 2：唯一物理核心。
- Phase 3：BLDC P001/P003/P006/P016 + 单一路径 derive + 三态测试。
- Phase 4：ROOT_FIX / COMBINED / TEMPORARY + C-T-S-Q-L + VETO 来源 + 双时间轴。
- Phase 5：5 屏 UI + union route + external sub-route store + ErrorBoundary。
- Phase 6：content registry + 重复文案/数字硬编码治理。
- Phase 7：analysisId/inputHash 版本快照 + A/B diff。
- Phase 8：可拔插 AI narrative adapter + Trace ID / number audit，失败回退 deterministic-only。
- Phase 9：offline single-file 配置 + 浏览器自检。

## 已实际通过（最终活动源码树）

```text
✓ AUTOHW CORE PHASE 0-3 VERIFY PASS
✓ AUTOHW CORE PHASE 0-3 POLICY PASS
✓ AUTOHW CORE PHASE 4 VERIFY PASS
✓ AUTOHW CORE PHASE 5 NAVIGATION POLICY PASS
✓ AUTOHW CORE PHASE 5 ROUTE POLICY PASS
✓ AUTOHW CORE PHASE 6 CONTENT POLICY PASS
✓ AUTOHW CORE PHASE 7 VERSION/A-B VERIFY PASS
✓ AUTOHW CORE PHASE 8 AI VERIFY PASS
✓ AUTOHW CORE PHASE 8 AI POLICY PASS
✓ AUTOHW CORE PHASE 9 OFFLINE POLICY PASS
✓ browser-equivalent deterministic self-check: 4/4 PASS
✓ final architecture scan: legacy implementation absent from active src/
```

## 尚未在本运行环境执行

本环境没有 `node_modules`，且此前实际访问 npm registry 返回 DNS `EAI_AGAIN`。因此：

- `npm install` 未完成；
- Vitest 实际 runner 未执行；
- ESLint 实际 runner 未执行；
- Vite offline build 未执行。

这些命令在具备 npm registry 的开发环境中由新的 `package.json` 默认脚本执行。

## 黄金用例边界

`src/fixtures/bldc.ts` 当前用于结构/回归验证的 synthetic fixture，不冒充用户台架黄金数据。指南要求真实黄金用例来自工程师台架实测；真实数据接入后再作为 `fixtures/gold` 的终审依据。
