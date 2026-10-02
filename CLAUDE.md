# AutoHW Core 开发铁律

本项目严格以 `docs/AutoHW-Core-AI开发指南.md` 为上位规范。活动代码只允许使用 `src/core` → `src/app` → `src/ui` 单向主链，`src/content` 提供静态文案注册表，`src/fixtures` 提供验收工况。

1. 缺输入不得伪造：物理函数缺参返回 `insufficient_input`；禁止默认值、`|| 0`、`?? 0`、NaN/Infinity 传播。`diverged` 只允许表示物理模型在其有效域内无稳态解等确定性物理结论，不得把求解预算不足或模型越界伪装成热失控。
2. 实测覆盖理论：`MEASURED/IMPORTED` 高于 `DATASHEET/DERIVED/TEXT_INFERRED/ASSUMED`，并保留 Trace。
3. 一个物理量一处真源：取值优先级与单位解析集中在 `core/derive`；Pattern 不得二次解析。
4. confidence/degraded 由 Trace 自动推导，Pattern 作者不得手填。
5. VETO 只由 Pattern 产生；decision / UI / AI 不能新增、撤销或重算。
6. 一个 Pattern 一个文件；Pattern 之间互不 import，统一由 registry 编排。
7. 每个 Pattern 必须有触发 / 不触发 / 缺输入三态测试。
8. `core/` 零 React / DOM / 网络；物理函数必须是纯函数。
9. 带数字的工程结论不能写成静态文案；静态说明只进入 `content/`。
10. AI 只消费确定性 facts + judgment；数字与单位必须通过审计；审计失败回退 deterministic-only。
11. 导航只通过 `navigate({screen, sub})`；二级页状态放外部 store。
12. 版本结果必须带 `analysisId + inputHash + engineVersion`。
13. 默认 `npm run build` 生成单文件离线 HTML；产品运行不依赖 Express server。
14. 每个阶段完成后必须执行 `npm run lint`、`npm test`、`npm run build`；任何未执行项必须明确标记。
15. 不确定公式/标准标记“待工程师确认”，不得编造。
16. 新增功能先测试后代码；超出当前指南阶段的发现写入 `TODO.md`，不要顺手跨阶段修改。
