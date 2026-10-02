# AutoHW Core TODO

1. 用真实台架数据建立 `fixtures/gold/*.json`，作为物理公式最终验收。
2. 在有网络的开发环境执行 `npm install`，随后完整运行 `npm test`、`npm run lint`、`npm run build`。
3. 使用真实台架数据建立 Gold Cases；补充波形→Evidence 回归；继续扩展 EMC/BCI 工程化与机器人关节 J001–J007。

非本阶段架构变更不要直接进入活动 `src/`；先写 TODO，再分阶段进入。

- v4 工程工具融合已完成
- Phase 12 EMC/BCI 确定性 Pattern 已接入：示波器、规格书/器件库、工况、计算器、WCCA/Foster、验证回归、版本与工作区备份均已挂回 5 屏架构。

- v4 当前输入层已接入示波器、规格书/器件库、工况；规格书当前以 JSON/TXT 结构化提取结果为入口，原始 PDF/扫描件解析器待后续作为独立适配器接入。

### Phase 13 follow-up
- 将真实台架数据接入 `fixtures/gold/*.json`，用真实数据校验敏感度排序与物理边界。
- 将敏感度结果进一步接入“验证清单/VOI”，但仍保持确定性 Pattern 为风险真源。

### 用户明确排除
- 8D 报告导出不进入本产品当前路线；交付保留 EDR、受控文档、RACI、版本/A-B 与工作区备份。
