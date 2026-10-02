import type { EngineeringProject } from '../../core/model/contracts.ts';

export interface SavedScenario { id: string; name: string; savedAt: string; project: EngineeringProject; }
const STORAGE_KEY = 'autohw-core.scenarios.v1';
function storage(): Storage | null { try { return typeof localStorage !== 'undefined' ? localStorage : null; } catch { return null; } }
export function loadSavedScenarios(): SavedScenario[] {
  const s = storage(); if (!s) return [];
  try { const parsed: unknown = JSON.parse(s.getItem(STORAGE_KEY) || '[]'); return Array.isArray(parsed) ? parsed as SavedScenario[] : []; } catch { return []; }
}
export function saveScenario(name: string, project: EngineeringProject): SavedScenario[] {
  const entry: SavedScenario = { id: `scenario_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`, name: name.trim() || '未命名工况', savedAt: new Date().toISOString(), project: structuredClone(project) };
  const next = [entry, ...loadSavedScenarios().filter((x) => x.name !== entry.name)].slice(0, 20);
  try { storage()?.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* keep in-memory return */ }
  return next;
}
export function deleteScenario(id: string): SavedScenario[] {
  const next = loadSavedScenarios().filter((x) => x.id !== id); try { storage()?.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* no-op */ } return next;
}
