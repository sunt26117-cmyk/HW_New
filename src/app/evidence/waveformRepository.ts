import type { ChannelReport, ParsedScope, WaveformMarker } from '../../core/evidence/waveform.ts';
import { buildMarkers, downsampleMinMax } from '../../core/evidence/waveform.ts';

export interface StoredWaveform {
  id: string;
  fileName: string;
  channelName: string;
  role: string;
  savedAt: string;
  time: number[];
  samples: number[];
  markers: WaveformMarker[];
  metrics: {
    peak: number;
    valley: number;
    dvDtMaxVns: number;
    dvDtMethod?: string;
    ringingHz: number | null;
    baselineLevel?: number;
    warnings: string[];
  };
}

const STORAGE_KEY = 'autohw-core.waveforms.v1';
const MAX_STORED = 12;
const MAX_POINTS = 1600;

function storage(): Storage | null {
  try { return typeof localStorage !== 'undefined' ? localStorage : null; } catch { return null; }
}

export function loadWaveforms(): StoredWaveform[] {
  const s = storage(); if (!s) return [];
  try { const parsed: unknown = JSON.parse(s.getItem(STORAGE_KEY) || '[]'); return Array.isArray(parsed) ? parsed as StoredWaveform[] : []; } catch { return []; }
}
function persist(list: StoredWaveform[]): StoredWaveform[] {
  const s = storage(); const next = list.slice(-MAX_STORED);
  if (!s) return next;
  try { s.setItem(STORAGE_KEY, JSON.stringify(next)); return next; } catch {
    const trimmed = next.slice(Math.max(0, next.length - Math.floor(next.length / 2)));
    try { s.setItem(STORAGE_KEY, JSON.stringify(trimmed)); } catch { /* no-op */ }
    return trimmed;
  }
}
export function makeStoredWaveform(report: ChannelReport, parsed: ParsedScope, fileName: string, savedAt: string): StoredWaveform {
  const raw = parsed.channels[report.channelIndex].samples;
  const ds = downsampleMinMax(parsed.time, raw, MAX_POINTS);
  return {
    id: report.evidenceId, fileName, channelName: report.channelName, role: report.role, savedAt,
    time: ds.time, samples: ds.samples, markers: buildMarkers(parsed.time, raw, report.metrics),
    metrics: {
      peak: report.metrics.peak, valley: report.metrics.valley, dvDtMaxVns: report.metrics.dvDtMaxVns,
      dvDtMethod: report.metrics.dvDtMethod, ringingHz: report.metrics.ringingHz,
      baselineLevel: report.metrics.baselineLevel, warnings: report.metrics.warnings || [],
    },
  };
}
export function addWaveforms(items: StoredWaveform[]): StoredWaveform[] {
  const current = loadWaveforms();
  const next = [...current.filter((item) => !items.some((x) => x.id === item.id)), ...items];
  return persist(next);
}
export function removeWaveform(id: string): StoredWaveform[] { return persist(loadWaveforms().filter((item) => item.id !== id)); }
