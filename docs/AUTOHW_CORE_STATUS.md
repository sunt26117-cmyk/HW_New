# AutoHW Core 当前状态

> 本文件描述**活动源码树**的实际状态。所有"通过"结论都来自真实执行；未执行的命令一律标注，不用"应当通过"代替。

## 主线

仓库已从旧 14/7 工作台体系切换到 AutoHW Core 主线。旧实现不再属于活动应用，统一归档到 `legacy/`（冻结，不参与构建与校验）；活动代码仅在 `src/app`、`src/core`、`src/ui`、`src/content`、`src/fixtures`。

当前规模（文件数）：`src/core` 54、`src/ui` 17、`src/app` 13、`src/content` 8、`src/fixtures` 4。

分层护栏：`src/core` 不得依赖 `react` / `react-dom` / `../ui` / `../app`，由 `eslint.config.mjs` 的 `no-restricted-imports` 强制（该规则只作用于 `src/core/**`）。

## Phase 0–16

| Phase | 内容 | 守护脚本 |
| --- | --- | --- |
| 0 | 脚手架、分层护栏、Core 依赖治理 | `verify-autohw-core-policy.cjs` |
| 1 | Quantity / PatternOutput / AnalysisResult / Trace / Zod contract | `verify-autohw-core.ts` |
| 2 | 唯一物理核心 `src/core/physics/*` | `verify-autohw-core.ts` |
| 3 | BLDC P001/P003/P006/P016 + 单一路径 derive + 三态测试 | `verify-autohw-core.ts` |
| 4 | ROOT_FIX / COMBINED / TEMPORARY + C-T-S-Q-L + VETO 来源 + 双时间轴 | `verify-phase4.ts` |
| 5 | 5 屏 UI + union route + 外部 sub-route store + ErrorBoundary | `verify-phase5-navigation.cjs`、`verify-phase5-route.cjs` |
| 6 | content registry + 重复文案/数字硬编码治理 | `verify-phase6-content.cjs` |
| 7 | analysisId / inputHash 版本快照 + A/B diff | `verify-phase7-versioning.ts` |
| 8 | 可拔插 AI narrative adapter + Trace ID / number audit，失败回退 deterministic-only | `verify-phase8-ai.ts`、`verify-phase8-ai.cjs` |
| 9 | offline single-file 配置 + 浏览器自检 | `verify-phase9-selfcheck.cjs` |
| 10 | 热失控语义、稳定过温、非法物理输入与状态映射回归守护 | `verify-phase10-physics.ts` |
| 11 | 证据层：器件模型/字段表/候选与导入、工况、波形证据 | `verify-phase11-evidence.ts` |
| 12 | EMC/BCI 确定性 Pattern（EMC.C001/C002/P001） | `verify-phase12-emc.ts` |
| 13 | 敏感度分析（排序与物理边界） | `verify-phase13-sensitivity.ts` |
| 14 | 波形回归 | `verify-phase14-waveform.ts` |
| 15 | 黄金用例治理（Gold governance） | `verify-phase15-gold.ts` |
| 16 | EMC 因果性（判定链一致性） | `verify-phase16-emc-causality.ts` |

现有 Pattern 清单：BLDC `P001/P003/P006/P016`；EMC `C001/C002/P001`。

## 已在本机实际执行并通过

```text
npm install   -> OK
npm run lint  -> exit 0（tsc --noEmit 0 error；eslint 0 error）
npm test      -> exit 0
npm run build -> exit 0
```

测试输出（`npm test` 的真实结尾）：

```text
Test Files  9 passed (9)
Tests      54 passed (54)
AUTOHW CORE PHASE 0-3 VERIFY PASS
✓ AUTOHW CORE PHASE 0-3 POLICY PASS
✓ AUTOHW CORE PHASE 4 VERIFY PASS
✓ AUTOHW CORE PHASE 5 NAVIGATION POLICY PASS
✓ AUTOHW CORE PHASE 5 ROUTE POLICY PASS
✓ AUTOHW CORE PHASE 6 CONTENT POLICY PASS
✓ AUTOHW CORE PHASE 7 VERSION/A-B VERIFY PASS
✓ AUTOHW CORE PHASE 8 AI VERIFY PASS
✓ AUTOHW CORE PHASE 8 AI POLICY PASS
✓ AUTOHW CORE PHASE 9 OFFLINE POLICY PASS
AUTOHW CORE PHASE 10 PHYSICS SAFETY VERIFY PASS
AUTOHW CORE PHASE 11 EVIDENCE VERIFY PASS
AUTOHW CORE PHASE 12 EMC/BCI VERIFY PASS
AUTOHW CORE PHASE 13 SENSITIVITY VERIFY PASS
AUTOHW CORE PHASE 14 VERIFY PASS
AUTOHW CORE PHASE 15 GOLD GOVERNANCE PASS
AUTOHW CORE PHASE 16 EMC CAUSALITY VERIFY PASS
```

`npm run build` 产物：`dist-offline/index.html`（单文件离线包，约 611 KB，gzip 约 163 KB）。

测试文件：`core-ai`、`core-decision`、`core-emc`、`core-evidence`、`core-gold`、`core-governance`、`core-patterns`、`core-physics`、`core-sensitivity`。

## 本版修正记录（相对上一份快照）

1. **eslint flat config 覆盖不全**：`lint` 脚本扫 `src/**/*.{ts,tsx}`，但配置只声明了 `src/core/**/*.ts`，导致 9 个 `.tsx`（`src/main.tsx` 等）不被任何配置块覆盖，ESLint 9 直接以 *all of the files matching the glob pattern ... are ignored* 失败。已补覆盖全部 src 的基础块并显式挂 TS parser，core 边界规则仍只作用于 `src/core/**`。
2. **波形重采样会改变记录长度**：抖动时间轴重采样按 `round(跨度/中位间隔)+1` 取点数，会凭空多插采样点（6 点变 7 点）。已改为保持记录点数（抖动只体现在时间轴）。
3. **Vbus 实测只写了一半**：Vbus 通道自测量只写入证据层键 `vbusMeasuredPeakV`，漏了工程层键 `vbusPeakV`。同一路实测现在两键同时写入（同源、同 provenance）。
4. **器件 raw 路径规范**：器件字段表的规范路径是 `maxRatings.*`（`maxRatings.vds -> vdsRatingV`）。测试夹具曾使用不存在的裸 `ratings.vds`，已按 schema 修正。

## 已知边界（不要当成已完成）

- `src/fixtures/bldc.ts`、`src/fixtures/emc.ts` 是用于结构/回归验证的 **synthetic** fixture，不冒充工程师台架实测的黄金数据。
- 器件规格书入口当前是 **JSON/TXT 结构化提取结果**；原始 PDF/扫描件的解析器尚未作为独立适配器接入。
- 机器人关节 J001–J007 的确定性 Pattern 尚未建立。
- `legacy/` 是冻结归档：不参与 `npm test` / `npm run lint` / `npm run build` 的活动代码路径。
