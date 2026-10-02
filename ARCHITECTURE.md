# AutoHW Core Architecture

本文件与 `docs/AutoHW-Core-AI开发指南.md` 同步；该指南是架构与开发规则的唯一上位规范。

## Layers

```text
ui/      React rendering only; reads AnalysisResult and writes user input/navigation
  ↓
app/     orchestration, persistence, import/export, browser self-check
  ↓
core/    pure TypeScript: model / physics / derive / patterns / trace / decision / ai
  ↓
content/ static copy registry only
fixtures/ acceptance scenarios; synthetic structural fixtures now, real bench gold later
```

`core/` has no React/DOM/network dependencies. `core/patterns/*` do not import each other. Physical calculations have one source of truth under `core/physics`. `PhysicsResult.diverged` means the deterministic physical model has no valid steady-state solution; solver-budget exhaustion is not itself a VETO trigger.

## Five screens

`home` → decision, `input` → evidence, `physics` → mechanisms/Trace, `plan` → options/verification, `deliver` → version/export/self-check.

## Result contract

`AnalysisResult = facts → judgment → action (+ optional audited narrative)`.
Every VETO is created by a Pattern. Every numeric AI statement must match deterministic facts/judgment by value + unit and cite valid Trace IDs.

## Current scope

BLDC deep-first Phase 0–9 implementation covers P001/P003/P006/P016; Phase 10 adds physics-safety regression guards for thermal runaway semantics and numeric input-domain validation. Other legacy domains are archived under `legacy/` and are not part of the active application or build.
