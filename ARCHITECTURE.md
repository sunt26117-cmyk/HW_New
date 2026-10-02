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

## Rich engineering workspaces (v4 fusion)

The five-screen rule is a navigation rule, not a feature-removal rule. Mature engineering capabilities are hosted inside those screens:

- Input & Evidence: scope CSV/TXT import, channel-role mapping, waveform metrics/FFT, saved measured evidence, device/spec JSON import, candidate mapping/confirmation, device library, device comparison, scenario templates and local cases.
- Physics & Mechanism: deterministic Pattern/Trace plus an engineering toolbox (bus pumping, Miller, thermal cascade, protection/SOA, snubber, deadtime, bandwidth/resonance, WCCA, Foster transient thermal, DC voltage margin, commutation and safety-chain timing).
- Plan & Verification: option comparison, Verification Loop, regression review and deterministic re-run entry points.
- Delivery: analysis export, technical RACI, EDR/8D/controlled-document material, version/A-B history and complete workspace backup/restore.

The rule remains: these workspaces may read current project/evidence data, but they do not create a second deterministic source of truth for formal risk conclusions.
