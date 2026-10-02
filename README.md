# AutoHW Core

离线优先的车规硬件风险决策副驾。

## 活动架构

```text
src/core    纯 TypeScript：model / physics / derive / patterns / trace / decision / ai
src/app     analyze / versioning / self-check
src/ui      5 屏 React UI / navigation
src/content 静态文字注册表
src/fixtures 验收工况
```

数据流：

`EngineeringProject → derive → physics → Pattern/Trace/VETO → decision → AnalysisResult → UI`

AI 只接收确定性 `facts + judgment`，生成可选 `narrative`；数字必须通过值+单位审计，Trace ID 必须有效。

## 五个屏

1. `home`：决策首页
2. `input`：输入与证据
3. `physics`：物理与机理
4. `plan`：方案与验证
5. `deliver`：交付、版本/A-B、系统自检

## 当前 BLDC 范围

Phase 0–9 活动主线实现；Phase 10 增加物理安全回归守护：

- `BLDC.P001` 母线泵升
- `BLDC.P003` 米勒误导通
- `BLDC.P006` 热-电级联
- `BLDC.P016` Fault-to-Off ↔ SOA
- P006 热模型区分“无稳态热失控”与“仅迭代预算不足”，并对物理输入域做前置校验

## 工程铁律

- Missing 永远是 `missing`，不是 0、经验默认值或 NaN。
- 实测/导入证据覆盖理论/派生值。
- 一个物理量只在 `derive/physics` 有唯一真源。
- VETO 只由 Pattern 产生。
- Candidate 只能从 Pattern `Measure[]` 派生。
- 静态文案进 `content/`；工程数字从结果契约产生。
- 不允许 Pattern 互相 import。
- UI 不做物理/决策计算。
- 旧实现已归档到 `legacy/`，禁止重新 import。

## 安装与验收

Node 20+、可访问 npm registry 的环境：

```bash
npm install
npm run lint
npm test
npm run build
```

离线构建产物：`dist-offline/index.html`。

## 测试边界

当前 `src/fixtures/bldc.ts` 是 synthetic structural fixture。真实台架黄金用例必须由工程师实测数据建立后，再作为物理公式最终终审依据。

完整网络安装/Visual build 尚未在生成环境执行；详见 `docs/AUTOHW_CORE_STATUS.md`。
