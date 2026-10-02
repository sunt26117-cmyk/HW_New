export interface DeviceParamPoint { x: number; y: number | null; }
export type CandidateDecisionType = 'imported' | 'skipped' | 'mapped_to';
export interface CandidateDecision { decision: CandidateDecisionType; mappedKey?: string; decidedAt: string; }
export interface DeviceEntry {
  id: string;
  deviceType: string;
  partNumber: string;
  manufacturer: string;
  package: string;
  aecqGrade: string;
  channelType: string;
  raw: Record<string, unknown>;
  candidateDecisions: Record<string, CandidateDecision>;
  candidateRequests: Record<string, { label: string; category: string; requestedAt: string }>;
  createdAt: string;
  updatedAt: string;
}

export const CURVE_POINT_ALIASES: Record<string, { x: string[]; y: string[] }> = {
  'staticParams.rdsOn': { x: ['x', 'tj'], y: ['y', 'rdsOn'] },
  'staticParams.vth': { x: ['x', 'tj'], y: ['y', 'vth'] },
  'capacitanceParams.crss': { x: ['x', 'vds'], y: ['y', 'crss'] },
};

export function readCurvePoint(rawPath: string, point: unknown): { x?: number; y?: number } {
  if (!point || typeof point !== 'object') return {};
  const map = CURVE_POINT_ALIASES[rawPath] ?? { x: ['x'], y: ['y'] };
  const pick = (keys: string[]): number | undefined => {
    for (const key of keys) {
      const raw = (point as Record<string, unknown>)[key];
      if (raw === null || raw === undefined || raw === '') continue;
      const parsed = Number(raw);
      if (Number.isFinite(parsed)) return parsed;
    }
    return undefined;
  };
  return { x: pick(map.x), y: pick(map.y) };
}

export interface DeviceCurvePoint { x: number; y: number; }
export function linearInterp(curve: DeviceCurvePoint[], x: number): { value: number; extrapolated: boolean } {
  const pts = curve.filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y)).sort((a, b) => a.x - b.x);
  if (pts.length === 0) return { value: Number.NaN, extrapolated: true };
  if (x <= pts[0].x) return { value: pts[0].y, extrapolated: x < pts[0].x };
  if (x >= pts[pts.length - 1].x) return { value: pts[pts.length - 1].y, extrapolated: x > pts[pts.length - 1].x };
  for (let i = 0; i < pts.length - 1; i += 1) {
    const a = pts[i]; const b = pts[i + 1];
    if (x >= a.x && x <= b.x) {
      const t = (x - a.x) / (b.x - a.x);
      return { value: a.y + t * (b.y - a.y), extrapolated: false };
    }
  }
  return { value: pts[pts.length - 1].y, extrapolated: true };
}

export function getDeviceCurve(device: DeviceEntry, key: 'rdsOn' | 'crss' | 'vth'): DeviceCurvePoint[] {
  const rawPath = key === 'rdsOn' ? 'staticParams.rdsOn' : key === 'crss' ? 'capacitanceParams.crss' : 'staticParams.vth';
  const obj = rawPath.split('.').reduce<unknown>((acc, part) => (acc && typeof acc === 'object' ? (acc as Record<string, unknown>)[part] : undefined), device.raw);
  const points = obj && typeof obj === 'object' && Array.isArray((obj as Record<string, unknown>).points)
    ? (obj as Record<string, unknown>).points as unknown[]
    : [];
  return points.flatMap((point) => {
    const p = readCurvePoint(rawPath, point);
    return p.x !== undefined && p.y !== undefined ? [{ x: p.x, y: p.y }] : [];
  });
}
