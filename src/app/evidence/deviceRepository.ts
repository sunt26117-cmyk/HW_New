import type { DeviceEntry, CandidateDecisionType } from '../../core/evidence/deviceModel.ts';
import { readCurvePoint, linearInterp, getDeviceCurve, type DeviceCurvePoint } from '../../core/evidence/deviceModel.ts';
import { validateDeviceCompleteness } from './deviceValidation.ts';

const STORAGE_KEY = 'autohw-core.device-library.v1';

function loadRaw(): DeviceEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((device) => {
      const d = device as Partial<DeviceEntry>;
      return {
        ...d,
        candidateDecisions: d.candidateDecisions && typeof d.candidateDecisions === 'object' ? d.candidateDecisions : {},
        candidateRequests: d.candidateRequests && typeof d.candidateRequests === 'object' ? d.candidateRequests : {},
      } as DeviceEntry;
    });
  } catch { return []; }
}
function saveRaw(list: DeviceEntry[]): DeviceEntry[] {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); } catch { /* keep in-memory result */ }
  return list;
}
export function loadDevices(): DeviceEntry[] { return loadRaw(); }
export function saveDevice(entry: DeviceEntry): DeviceEntry[] {
  const current = loadRaw();
  const updated = { ...entry, updatedAt: new Date().toISOString() };
  const idx = current.findIndex((d) => d.id === entry.id);
  const next = idx >= 0 ? current.map((d, i) => i === idx ? updated : d) : [updated, ...current];
  return saveRaw(next);
}
export function deleteDevice(id: string): DeviceEntry[] { return saveRaw(loadRaw().filter((d) => d.id !== id)); }
export function importDeviceFromJson(jsonText: string): { device?: DeviceEntry; warnings?: string[]; error?: string } {
  let parsed: Record<string, unknown>;
  try { parsed = JSON.parse(jsonText) as Record<string, unknown>; } catch (error) { return { error: `JSON 解析失败：${error instanceof Error ? error.message : String(error)}` }; }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return { error: 'JSON 不是有效对象。' };
  const partNumber = typeof parsed.partNumber === 'string' ? parsed.partNumber.trim() : '';
  if (!partNumber) return { error: '缺少 partNumber（料号），无法保存。' };
  const now = new Date().toISOString();
  const device: DeviceEntry = {
    id: `dev_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    deviceType: typeof parsed.deviceType === 'string' ? parsed.deviceType.trim() : '',
    partNumber,
    manufacturer: typeof parsed.manufacturer === 'string' ? parsed.manufacturer.trim() : '',
    package: typeof parsed.package === 'string' ? parsed.package.trim() : '',
    aecqGrade: typeof parsed.aecqGrade === 'string' ? parsed.aecqGrade.trim() : '',
    channelType: typeof parsed.channelType === 'string' ? parsed.channelType.trim() : '',
    raw: parsed,
    candidateDecisions: {},
    candidateRequests: {},
    createdAt: now,
    updatedAt: now,
  };
  return { device, warnings: validateDeviceCompleteness(device) };
}
export function updateDeviceCandidateDecision(deviceId: string, rawPath: string, decision: CandidateDecisionType, mappedKey?: string): DeviceEntry[] {
  const device = loadRaw().find((d) => d.id === deviceId); if (!device) return loadRaw();
  return saveDevice({ ...device, candidateDecisions: { ...device.candidateDecisions, [rawPath]: { decision, ...(mappedKey ? { mappedKey } : {}), decidedAt: new Date().toISOString() } } });
}
export function clearDeviceCandidateDecision(deviceId: string, rawPath: string): DeviceEntry[] {
  const device = loadRaw().find((d) => d.id === deviceId); if (!device) return loadRaw();
  const decisions = { ...device.candidateDecisions }; delete decisions[rawPath];
  return saveDevice({ ...device, candidateDecisions: decisions });
}
export function requestDeviceCandidateParameter(deviceId: string, rawPath: string, label: string, category: string): DeviceEntry[] {
  const device = loadRaw().find((d) => d.id === deviceId); if (!device) return loadRaw();
  return saveDevice({ ...device, candidateRequests: { ...device.candidateRequests, [rawPath]: { label, category, requestedAt: new Date().toISOString() } } });
}
export function applyCandidateDecisions<T extends { rawPath: string; targetKey: string | null; value: number | string; importable: boolean; mappingStatus: 'mapped' | 'unmapped' | 'ambiguous' | 'rejected'; note?: string }>(candidates: T[], decisions: DeviceEntry['candidateDecisions'] | undefined, currentFieldKeys: ReadonlySet<string>): T[] {
  if (!decisions) return candidates;
  return candidates.map((candidate) => {
    const decision = decisions[candidate.rawPath]; if (!decision) return candidate;
    if (decision.decision === 'skipped') return { ...candidate, importable: false };
    if ((decision.decision === 'mapped_to' || decision.decision === 'imported') && decision.mappedKey) {
      const mapped = currentFieldKeys.has(decision.mappedKey);
      return { ...candidate, targetKey: decision.mappedKey, mappingStatus: mapped ? 'mapped' : 'unmapped', importable: mapped && (typeof candidate.value === 'number' || typeof candidate.value === 'string'), manuallyDecided: true, note: `${candidate.note ? `${candidate.note} ` : ''}工程师已人工映射至 ${decision.mappedKey}。` };
    }
    return candidate;
  });
}

export { readCurvePoint, linearInterp, getDeviceCurve, type DeviceCurvePoint };
