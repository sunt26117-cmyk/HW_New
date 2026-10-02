import type { EngineeringProject } from '../core/model/contracts.ts';

export const ACTIVE_PROJECT_STORAGE_KEY = 'autohw-core.active-project.v1';

function storage(): Storage | null {
  try { return typeof localStorage !== 'undefined' ? localStorage : null; } catch { return null; }
}

export function loadActiveProject(fallback: EngineeringProject): EngineeringProject {
  const s = storage();
  if (!s) return fallback;
  try {
    const parsed: unknown = JSON.parse(s.getItem(ACTIVE_PROJECT_STORAGE_KEY) || 'null');
    if (!parsed || typeof parsed !== 'object') return fallback;
    const project = parsed as Partial<EngineeringProject>;
    if (!project.meta || !project.issue || typeof project.issue !== 'object' || !project.issue.quantities) return fallback;
    return project as EngineeringProject;
  } catch {
    return fallback;
  }
}

export function saveActiveProject(project: EngineeringProject): void {
  const s = storage();
  if (!s) return;
  try { s.setItem(ACTIVE_PROJECT_STORAGE_KEY, JSON.stringify(project)); } catch { /* persistence is best-effort */ }
}

export function clearActiveProject(): void {
  storage()?.removeItem(ACTIVE_PROJECT_STORAGE_KEY);
}
