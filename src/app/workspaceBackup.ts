import type { EngineeringProject } from '../core/model/contracts.ts';
import { ACTIVE_PROJECT_STORAGE_KEY } from './projectRepository.ts';

export const WORKSPACE_BACKUP_VERSION = 'autohw-workspace-v2';
export const WORKSPACE_STORAGE_KEYS = {
  activeProject: ACTIVE_PROJECT_STORAGE_KEY,
  devices: 'autohw-core.device-library.v1',
  waveforms: 'autohw-core.waveforms.v1',
  scenarios: 'autohw-core.scenarios.v1',
  analysisVersions: 'autohw-core.analysis-versions.v1',
} as const;

type StorageSnapshot = Record<keyof typeof WORKSPACE_STORAGE_KEYS, string | null>;

export interface WorkspaceBackup {
  backupVersion: string;
  exportedAt: string;
  app: 'AutoHW Core';
  project: EngineeringProject;
  storage: StorageSnapshot;
}

function storage(): Storage | null {
  try { return typeof localStorage !== 'undefined' ? localStorage : null; } catch { return null; }
}

export function buildWorkspaceBackup(project: EngineeringProject, exportedAt = new Date().toISOString()): WorkspaceBackup {
  const s = storage();
  const storageValues = Object.fromEntries(
    Object.entries(WORKSPACE_STORAGE_KEYS).map(([name, key]) => [name, s?.getItem(key) ?? null]),
  ) as StorageSnapshot;
  storageValues.activeProject = JSON.stringify(project);
  return { backupVersion: WORKSPACE_BACKUP_VERSION, exportedAt, app: 'AutoHW Core', project, storage: storageValues };
}

export function parseWorkspaceBackup(text: string): { ok: true; backup: WorkspaceBackup } | { ok: false; error: string } {
  try {
    const parsed: unknown = JSON.parse(text);
    if (!parsed || typeof parsed !== 'object') return { ok: false, error: '备份文件不是 JSON 对象。' };
    const candidate = parsed as Partial<WorkspaceBackup>;
    if (candidate.app !== 'AutoHW Core') return { ok: false, error: '不是 AutoHW Core 工作区备份。' };
    if (candidate.backupVersion !== WORKSPACE_BACKUP_VERSION) return { ok: false, error: `备份版本不匹配：${String(candidate.backupVersion || '未知')}` };
    if (!candidate.project || typeof candidate.project !== 'object' || !candidate.project.meta || !candidate.project.issue) return { ok: false, error: '备份缺少完整工程项目。' };
    if (!candidate.storage || typeof candidate.storage !== 'object') return { ok: false, error: '备份缺少工作区存储快照。' };
    return { ok: true, backup: candidate as WorkspaceBackup };
  } catch (error) {
    return { ok: false, error: `备份 JSON 解析失败：${error instanceof Error ? error.message : String(error)}` };
  }
}

export function restoreWorkspaceBackup(backup: WorkspaceBackup): { project: EngineeringProject; warnings: string[] } {
  const s = storage();
  const warnings: string[] = [];
  if (!s) warnings.push('当前环境没有 localStorage，只能恢复当前工程项目，无法恢复本地库。');
  else {
    for (const [name, key] of Object.entries(WORKSPACE_STORAGE_KEYS) as Array<[keyof typeof WORKSPACE_STORAGE_KEYS, string]>) {
      const value = backup.storage[name];
      if (value === null) continue;
      try { s.setItem(key, value); }
      catch { warnings.push(`本地存储恢复失败：${name}`); }
    }
    try { s.setItem(WORKSPACE_STORAGE_KEYS.activeProject, JSON.stringify(backup.project)); }
    catch { warnings.push('当前工程自动保存失败。'); }
  }
  return { project: backup.project, warnings };
}
