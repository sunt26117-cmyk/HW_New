# AutoHW Core 数据流

```text
EngineeringProject
       │
       ▼
app/analyze
       │
       ├── core/derive      → 唯一输入派生 / evidence priority
       │
       ├── core/physics     → 唯一物理真源
       │
       ├── core/patterns    → P001/P003/P006/P016 + registry
       │          │
       │          └─────────→ Trace / VETO / measures / verification
       │
       └── core/decision    → ROOT_FIX / COMBINED / TEMPORARY
                              C-T-S-Q-L / 双时间轴
       │
       ▼
AnalysisResult
facts → judgment → action
       │
       ├── ui/               → 5 屏只读结果
       ├── app/versioning    → analysisId / inputHash / A-B
       └── core/ai           → 可选叙述；数字 + Trace 审计
```

唯一原则：UI 不重新计算，Decision 不产生 VETO，AI 不产生工程数字。
