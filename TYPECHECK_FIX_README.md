# HW_New v6 TypeScript Fix Package

基线：GitHub `HW_New` commit `aadeb680a4bea2d93f6109fe443f581b510bfd35`。

本包修复该 commit 的 35 个 TypeScript 类型检查错误，保持业务语义不变；同时清理 DeliverScreen 中已明确取消的 8D 活动分支。

涉及文件：
- scripts/verify-phase16-emc-causality.ts
- src/app/evidence/deviceValidation.ts
- src/app/tools/calculators.ts
- src/core/evidence/deviceCandidateImport.ts
- src/core/evidence/deviceCompare.ts
- src/core/patterns/emc/C001.ts
- src/core/patterns/emc/P001.ts
- src/ui/evidence/DeviceWorkbench.tsx
- src/ui/screens/DeliverScreen.tsx
- src/ui/tools/CalculatorPanel.tsx

已执行：
- npm run test:policy：Phase 0–16 全部 PASS
- TypeScript/TSX 语法转译扫描：PASS
- 修复点静态断言：PASS

当前沙箱没有 node_modules，未在此处虚报 npm test / npm run lint / npm run build。

仓库已有 package-lock.json 时应继续保留，不需要从本包生成新的 lockfile。
