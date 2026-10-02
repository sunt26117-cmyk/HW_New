import type { DeviceEntry } from './deviceModel.ts';
import { buildDeviceParameterCandidates } from './deviceParameterCandidates.ts';

export interface DeviceComparisonRow {
  targetKey: string;
  label: string;
  unit: string;
  left: Array<{ value: number | string; source: string; confidence: number; sourceRef?: string }>;
  right: Array<{ value: number | string; source: string; confidence: number; sourceRef?: string }>;
  status: 'MATCH' | 'DIFFER' | 'LEFT_ONLY' | 'RIGHT_ONLY' | 'UNKNOWN';
}

export interface DeviceComparison {
  left: Pick<DeviceEntry, 'id' | 'partNumber' | 'manufacturer'>;
  right: Pick<DeviceEntry, 'id' | 'partNumber' | 'manufacturer'>;
  rows: DeviceComparisonRow[];
}

function keyOfCandidate(candidate: { targetKey: string | null }): string | null {
  return candidate.targetKey && candidate.targetKey.trim() ? candidate.targetKey : null;
}

function signature(values: Array<{ value: number | string }>): string | null {
  if (!values.length) return null;
  return values.map((item) => String(item.value)).sort().join('|');
}

export function compareDevices(leftDevice: DeviceEntry, rightDevice: DeviceEntry, currentFieldKeys: ReadonlySet<string>): DeviceComparison {
  const leftCandidates = buildDeviceParameterCandidates(leftDevice, currentFieldKeys).filter((candidate) => keyOfCandidate(candidate));
  const rightCandidates = buildDeviceParameterCandidates(rightDevice, currentFieldKeys).filter((candidate) => keyOfCandidate(candidate));
  const rowsByKey = new Map<string, DeviceComparisonRow>();

  const add = (side: 'left' | 'right', candidate: typeof leftCandidates[number]) => {
    const targetKey = keyOfCandidate(candidate);
    if (!targetKey) return;
    const current: DeviceComparisonRow = rowsByKey.get(targetKey) ?? {
      targetKey,
      label: candidate.label,
      unit: candidate.unit ?? '',
      left: [],
      right: [],
      status: 'UNKNOWN',
    };
    current[side].push({ value: candidate.value, source: candidate.sourceType, confidence: candidate.confidence, sourceRef: candidate.sourceRef });
    rowsByKey.set(targetKey, current);
  };

  leftCandidates.forEach((candidate) => add('left', candidate));
  rightCandidates.forEach((candidate) => add('right', candidate));

  const rows = [...rowsByKey.values()].map((row) => {
    const leftSig = signature(row.left);
    const rightSig = signature(row.right);
    let status: DeviceComparisonRow['status'];
    if (leftSig !== null && rightSig !== null) status = leftSig === rightSig ? 'MATCH' : 'DIFFER';
    else if (leftSig !== null) status = 'LEFT_ONLY';
    else if (rightSig !== null) status = 'RIGHT_ONLY';
    else status = 'UNKNOWN';
    return { ...row, status };
  }).sort((a, b) => a.label.localeCompare(b.label, 'zh-CN'));

  return {
    left: { id: leftDevice.id, partNumber: leftDevice.partNumber, manufacturer: leftDevice.manufacturer },
    right: { id: rightDevice.id, partNumber: rightDevice.partNumber, manufacturer: rightDevice.manufacturer },
    rows,
  };
}
