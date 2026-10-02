export interface WccaComponent {
  id: string;
  name: string;
  nominal: number;
  initTolPercent: number;
  tempDriftPercent: number;
  agingPercent: number;
  distribution: 'gaussian' | 'uniform';
}

export interface WccaInput {
  components: WccaComponent[];
  targetErrorLimitPercent: number;
  iterations: number;
  seed: number;
}

export interface WccaStats {
  iterations: number;
  meanPercent: number;
  sigmaPercent: number;
  minPercent: number;
  maxPercent: number;
  lslPercent: number;
  uslPercent: number;
  cp: number;
  cpk: number;
  ppm: number;
  passRatePercent: number;
  rssPercent: number;
  extremeWorstCasePercent: number;
  percentiles: { p01: number; p05: number; p50: number; p95: number; p99: number };
  histogram: Array<{ x0: number; x1: number; count: number; outOfSpec: boolean }>;
}

export interface WccaValidation {
  valid: boolean;
  errors: string[];
}

function finitePositive(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}

export function validateWccaInput(input: WccaInput): WccaValidation {
  const errors: string[] = [];
  if (!Array.isArray(input.components) || input.components.length === 0) errors.push('至少需要 1 个误差预算项。');
  if (!finitePositive(input.targetErrorLimitPercent)) errors.push('目标误差上限必须为正数。');
  if (!Number.isInteger(input.iterations) || input.iterations < 100) errors.push('抽样次数必须是 ≥100 的整数。');
  if (!Number.isFinite(input.seed)) errors.push('Seed 必须是有限数。');

  for (const component of input.components) {
    if (!component.name.trim()) errors.push(`误差项 ${component.id} 缺少名称。`);
    if (!Number.isFinite(component.nominal)) errors.push(`误差项 ${component.name || component.id} 的 nominal 非有限数。`);
    for (const [label, value] of [['初始公差', component.initTolPercent], ['温漂', component.tempDriftPercent], ['老化', component.agingPercent] ] as const) {
      if (!Number.isFinite(value) || value < 0) errors.push(`误差项 ${component.name || component.id} 的${label}必须 ≥0。`);
    }
  }
  return { valid: errors.length === 0, errors };
}

function mulberry32(seed: number): () => number {
  let state = (Math.trunc(seed) >>> 0);
  return () => {
    state += 0x6d2b79f5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function gaussian(rand: () => number): number {
  let u1 = rand();
  while (u1 <= Number.EPSILON) u1 = rand();
  const u2 = rand();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

function percentile(sorted: number[], ratio: number): number {
  const index = Math.min(sorted.length - 1, Math.max(0, Math.floor((sorted.length - 1) * ratio)));
  return sorted[index];
}

export function runWcca(input: WccaInput, numBins = 40): WccaStats {
  const validation = validateWccaInput(input);
  if (!validation.valid) throw new Error(validation.errors.join('；'));

  const totalTolerance = (component: WccaComponent) =>
    Math.abs(component.initTolPercent) + Math.abs(component.tempDriftPercent) + Math.abs(component.agingPercent);

  const extremeWorstCasePercent = input.components.reduce((sum, component) => sum + totalTolerance(component), 0);
  const rssPercent = Math.sqrt(input.components.reduce((sum, component) => sum + totalTolerance(component) ** 2, 0));
  const random = mulberry32(input.seed);
  const samples = new Array<number>(input.iterations);

  let sum = 0;
  let sumSq = 0;
  for (let i = 0; i < input.iterations; i += 1) {
    let sample = 0;
    for (const component of input.components) {
      const total = totalTolerance(component);
      let deviation = 0;
      if (component.distribution === 'gaussian') {
        deviation = gaussian(random) * (total / 3);
      } else {
        deviation = (2 * random() - 1) * total;
      }
      sample += deviation;
    }
    samples[i] = sample;
    sum += sample;
    sumSq += sample * sample;
  }

  samples.sort((a, b) => a - b);
  const mean = sum / input.iterations;
  const variance = input.iterations > 1 ? Math.max(0, (sumSq - (sum * sum) / input.iterations) / (input.iterations - 1)) : 0;
  const sigma = Math.sqrt(variance);
  const usl = Math.abs(input.targetErrorLimitPercent);
  const lsl = -usl;
  const safeSigma = sigma > 1e-12 ? sigma : 1e-12;
  const cp = (usl - lsl) / (6 * safeSigma);
  const cpk = Math.min((usl - mean) / (3 * safeSigma), (mean - lsl) / (3 * safeSigma));
  const outOfSpec = samples.filter((value) => value < lsl || value > usl).length;

  const binMin = Math.min(samples[0], lsl * 1.2);
  const binMax = Math.max(samples[samples.length - 1], usl * 1.2);
  const span = binMax - binMin;
  const binWidth = span > 0 ? span / numBins : 1;
  const histogram = Array.from({ length: numBins }, (_, index) => {
    const x0 = binMin + index * binWidth;
    return { x0, x1: x0 + binWidth, count: 0, outOfSpec: x0 + binWidth / 2 < lsl || x0 + binWidth / 2 > usl };
  });
  for (const value of samples) {
    const index = Math.min(numBins - 1, Math.max(0, Math.floor((value - binMin) / binWidth)));
    histogram[index].count += 1;
  }

  const rounded = (value: number, digits = 3) => Number(value.toFixed(digits));
  return {
    iterations: input.iterations,
    meanPercent: rounded(mean),
    sigmaPercent: rounded(sigma),
    minPercent: rounded(samples[0]),
    maxPercent: rounded(samples[samples.length - 1]),
    lslPercent: rounded(lsl),
    uslPercent: rounded(usl),
    cp: rounded(cp, 2),
    cpk: rounded(cpk, 2),
    ppm: Math.round((outOfSpec / input.iterations) * 1_000_000),
    passRatePercent: rounded(((input.iterations - outOfSpec) / input.iterations) * 100, 2),
    rssPercent: rounded(rssPercent),
    extremeWorstCasePercent: rounded(extremeWorstCasePercent),
    percentiles: {
      p01: rounded(percentile(samples, 0.01)),
      p05: rounded(percentile(samples, 0.05)),
      p50: rounded(percentile(samples, 0.5)),
      p95: rounded(percentile(samples, 0.95)),
      p99: rounded(percentile(samples, 0.99)),
    },
    histogram,
  };
}
