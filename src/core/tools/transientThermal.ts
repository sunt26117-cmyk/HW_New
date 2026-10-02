export interface FosterStage { r: number; c: number; }

export interface TransientThermalInput {
  ambientTempC: number;
  biasPowerW: number;
  pulsePowerW: number;
  pulseWidthMs: number;
  tjMaxC: number;
  deratingMarginC: number;
  fosterStages: FosterStage[];
}

export interface TransientThermalResult {
  steadyRthJA: number;
  zthPulse: number;
  tempRiseBiasC: number;
  tempRisePulseC: number;
  totalTempRiseC: number;
  peakJunctionTempC: number;
  deratedLimitC: number;
  marginC: number;
  deratingPass: boolean;
  absoluteTjPass: boolean;
  timeSeries: Array<{ timeMs: number; zth: number; tj: number }>;
}

export interface FosterPreset { id: string; name: string; description: string; stages: FosterStage[]; defaultTjMaxC: number; defaultDeratingMarginC: number; }

export const FOSTER_PRESETS: readonly FosterPreset[] = [
  { id: 'd2pak', name: 'D2PAK / TO-263', description: '大功率表贴封装的典型四阶热瞬态起点；必须用实际封装/铜皮热模型替换或校准。', stages: [{ r: 0.25, c: 0.0012 }, { r: 0.85, c: 0.015 }, { r: 3.2, c: 0.18 }, { r: 18.5, c: 1.45 }], defaultTjMaxC: 175, defaultDeratingMarginC: 25 },
  { id: 'powersso', name: 'PowerSSO-36', description: '高边/执行器类功率芯片的四阶热瞬态起点。', stages: [{ r: 0.35, c: 0.0008 }, { r: 1.2, c: 0.009 }, { r: 4.8, c: 0.095 }, { r: 24, c: 0.85 }], defaultTjMaxC: 150, defaultDeratingMarginC: 25 },
  { id: 'powerpak', name: 'PowerPAK 5×6 / SO-8', description: '紧凑型车载电源/执行器 MOSFET 的四阶起点。', stages: [{ r: 0.6, c: 0.0005 }, { r: 2.4, c: 0.006 }, { r: 8.5, c: 0.06 }, { r: 36, c: 0.65 }], defaultTjMaxC: 150, defaultDeratingMarginC: 20 },
  { id: 'to247', name: 'TO-247', description: '大功率分立器件/专用散热器的四阶起点。', stages: [{ r: 0.08, c: 0.0035 }, { r: 0.32, c: 0.045 }, { r: 1.1, c: 0.45 }, { r: 4.5, c: 3.8 }], defaultTjMaxC: 175, defaultDeratingMarginC: 30 },
];

export function validateTransientThermalInput(input: TransientThermalInput): string[] {
  const errors: string[] = [];
  for (const [label, value] of [['环境温度', input.ambientTempC], ['稳态功耗', input.biasPowerW], ['脉冲功耗', input.pulsePowerW], ['脉冲宽度', input.pulseWidthMs], ['TjMax', input.tjMaxC], ['降额裕量', input.deratingMarginC]] as const) {
    if (!Number.isFinite(value)) errors.push(`${label}必须为有限数。`);
  }
  if (input.biasPowerW < 0 || input.pulsePowerW < 0 || input.pulseWidthMs <= 0 || input.deratingMarginC < 0) errors.push('功耗必须 ≥0，脉冲宽度必须 >0，降额裕量必须 ≥0。');
  if (!Number.isFinite(input.tjMaxC) || input.tjMaxC <= input.ambientTempC) errors.push('TjMax 必须高于环境温度。');
  if (!Array.isArray(input.fosterStages) || input.fosterStages.length === 0) errors.push('至少需要一个 Foster RC 阶段。');
  for (const [index, stage] of input.fosterStages.entries()) {
    if (!Number.isFinite(stage.r) || stage.r <= 0 || !Number.isFinite(stage.c) || stage.c <= 0) errors.push(`Foster 第 ${index + 1} 阶 R/C 必须 >0。`);
  }
  return errors;
}

export function calculateTransientThermal(input: TransientThermalInput): TransientThermalResult {
  const errors = validateTransientThermalInput(input);
  if (errors.length) throw new Error(errors.join('；'));

  const steadyRthJA = input.fosterStages.reduce((sum, stage) => sum + stage.r, 0);
  const pulseSeconds = input.pulseWidthMs / 1000;
  const zthPulse = input.fosterStages.reduce((sum, stage) => {
    const tau = stage.r * stage.c;
    return sum + stage.r * (1 - Math.exp(-pulseSeconds / tau));
  }, 0);
  const tempRiseBiasC = input.biasPowerW * steadyRthJA;
  const tempRisePulseC = input.pulsePowerW * zthPulse;
  const totalTempRiseC = tempRiseBiasC + tempRisePulseC;
  const peakJunctionTempC = input.ambientTempC + totalTempRiseC;
  const deratedLimitC = input.tjMaxC - input.deratingMarginC;
  const marginC = deratedLimitC - peakJunctionTempC;

  const timeSeries: Array<{ timeMs: number; zth: number; tj: number }> = [];
  for (let index = 0; index <= 60; index += 1) {
    const logMs = -2 + (index / 60) * 7;
    const timeMs = 10 ** logMs;
    const seconds = timeMs / 1000;
    const zth = input.fosterStages.reduce((sum, stage) => {
      const tau = stage.r * stage.c;
      return sum + stage.r * (1 - Math.exp(-seconds / tau));
    }, 0);
    const tj = input.ambientTempC + tempRiseBiasC + input.pulsePowerW * zth;
    timeSeries.push({ timeMs: Number(timeMs.toFixed(3)), zth: Number(zth.toFixed(4)), tj: Number(tj.toFixed(2)) });
  }

  return {
    steadyRthJA: Number(steadyRthJA.toFixed(3)),
    zthPulse: Number(zthPulse.toFixed(4)),
    tempRiseBiasC: Number(tempRiseBiasC.toFixed(2)),
    tempRisePulseC: Number(tempRisePulseC.toFixed(2)),
    totalTempRiseC: Number(totalTempRiseC.toFixed(2)),
    peakJunctionTempC: Number(peakJunctionTempC.toFixed(2)),
    deratedLimitC: Number(deratedLimitC.toFixed(2)),
    marginC: Number(marginC.toFixed(2)),
    deratingPass: marginC >= 0,
    absoluteTjPass: peakJunctionTempC <= input.tjMaxC,
    timeSeries,
  };
}
