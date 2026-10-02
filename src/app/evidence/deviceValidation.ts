import type { DeviceEntry } from '../../core/evidence/deviceModel.ts';
import { readCurvePoint } from '../../core/evidence/deviceModel.ts';
export function validateDeviceCompleteness(device: DeviceEntry): string[] {
  const warnings: string[] = [];
  const raw = device.raw as Record<string, any>;
  const curveCount = (obj: unknown, path: string): Array<{x:number;y:number}> => {
    if (!obj || typeof obj !== 'object') return [];
    const points = (obj as { points?: unknown }).points;
    if (!Array.isArray(points)) return [];
    return points.flatMap((point: unknown) => {
      const parsed = readCurvePoint(path, point);
      return parsed.x !== undefined && parsed.y !== undefined ? [{ x: parsed.x, y: parsed.y }] : [];
    });
  };
  const rds = curveCount(raw.staticParams?.rdsOn, 'staticParams.rdsOn');
  if (rds.length < 2) warnings.push('Rds(on) 曲线点数不足（<2），无法进行温度插值。');
  else if (!rds.some((p) => p.x >= 125)) warnings.push('Rds(on) 缺少 ≥125°C 数据点，高温降额可信度有限。');
  const crss = curveCount(raw.capacitanceParams?.crss, 'capacitanceParams.crss');
  if (crss.length < 2) warnings.push('Crss/Cgd 曲线点数不足（<2），米勒模型只能使用更弱证据。');
  const vth = curveCount(raw.staticParams?.vth, 'staticParams.vth');
  if (vth.length < 2) warnings.push('Vth 温度曲线点数不足（<2），无法检查温漂。');
  if (raw.maxRatings?.vds?.value == null) warnings.push('缺少 VDS 额定耐压。');
  if (raw.thermalParams?.rthJc?.value == null && raw.thermalParams?.rthJa?.value == null) warnings.push('缺少 RθJC/RθJA。');
  return warnings;
}
