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

Phase 0–11 活动主线实现；Phase 10 增加物理安全回归守护，Phase 11/v4 把旧版成熟工程能力重新接回新架构：5 个主屏幕（工程能力工作台）只是导航组织，不是功能删减：

- `BLDC.P001` 母线泵升
- `BLDC.P003` 米勒误导通
- `BLDC.P006` 热-电级联
- `BLDC.P016` Fault-to-Off ↔ SOA
- P006 热模型区分“无稳态热失控”与“仅迭代预算不足”，并对物理输入域做前置校验
- 示波器 CSV/TXT 导入、Vbus/Vgs/Vds 角色映射、20–80% dv/dt、基线、振铃、均匀采样 FFT、实测证据回填与本地留存
- 器件/规格书 JSON/TXT 导入、参数候选、人工确认/映射、实测保护、器件库与器件对比
- 工况案卷、WCCA/Foster/电压裕量/换相/安全链工具、Verification Loop、评审回归、版本/A-B 与完整工作区备份
- BLDC 输入 catalog 共 70 个 canonical 数值字段，按 Pattern 关系分组，并支持字段搜索/只看缺失；不产生数字默认值
- 规格书工作台当前活动边界为结构化 JSON/TXT（可来自 AI/OCR 提取），直接值/派生/曲线/未映射严格分层

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

当前 `src/fixtures/bldc.ts` 是 synthetic structural fixture。真实台架黄金用例必须由工程师实测数据建立后，再作为物理公式最终终审依据。当前规格书工作台接收结构化 JSON/TXT（含 AI/OCR 提取结果）；原始 PDF/扫描件解析器尚未作为活动核心接入。

完整网络安装/Visual build 尚未在生成环境执行；详见 `docs/AUTOHW_CORE_STATUS.md`。
