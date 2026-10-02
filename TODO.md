# AutoHW Core TODO

## 已完成（本机实测；证据见 `docs/AUTOHW_CORE_STATUS.md`）

- [x] 在具备依赖的环境执行 `npm install` / `npm run lint` / `npm test` / `npm run build`：**全部 exit 0**。
      9 个测试文件 54 个用例全过；Phase 0–16 全部 PASS；离线产物 `dist-offline/index.html` 约 611 KB。
- [x] v4 工程工作台融合：器件库/规格书（JSON 结构化入口）、工况、工程计算器、WCCA/Foster、验证回归、版本与工作区备份。
- [x] Phase 11 证据层：器件模型/字段表/候选与导入、工况、波形证据。
- [x] Phase 12–16：EMC/BCI 确定性 Pattern、敏感度、波形回归、黄金用例治理、EMC 因果性。
- [x] 波形证据边界：Vds 不冒充 Vbus；非递增时间轴拒绝；FFT 非 2 次幂输入不再产生均值归一化偏差。

## 待办

1. **真实台架黄金数据**：用真实实测建立 `fixtures/gold/*.json`，作为物理公式的最终验收依据。
   在此之前 `src/fixtures/*.ts` 只作结构/回归验证，**不得对外称"黄金标准"**。
2. **规格书原始件解析**：接入 PDF/扫描件解析适配器（当前入口是 JSON/TXT 结构化提取结果）。
3. **敏感度 → 验证清单/VOI**：把敏感度排序接入验证取舍，但仍保持确定性 Pattern 为风险真源。
4. **机器人关节 J001–J007**：建立确定性 Pattern（目前只有 BLDC 与 EMC 两个域）。
5. **波形 → Evidence 回归覆盖**：补充真实导入波形的回链与边界用例。

## 约束

- 非本阶段架构变更不要直接进入活动 `src/`；先写 TODO，再分阶段进入。
- `legacy/` 为冻结归档，不属于活动应用，不参与 `npm test` / `lint` / `build`。
- `src/core` 不得依赖 `react` / `react-dom` / `../ui` / `../app`（由 eslint `no-restricted-imports` 强制）。
- `lint` 脚本扫 `src/**/*.{ts,tsx}`，因此 `eslint.config.mjs` 必须覆盖全部被扫文件——少一条基础块，ESLint 9 会因"文件没有任何配置"直接失败（曾发生）。
- 器件 raw 路径以字段表为准（如 `maxRatings.vds -> vdsRatingV`）；不要在测试或数据里自造路径。

## 用户明确排除

- 8D 报告导出不进入本产品当前路线；交付保留 EDR、受控文档、RACI、版本/A-B 与工作区备份。
