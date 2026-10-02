export type Screen = 'home' | 'input' | 'physics' | 'plan' | 'deliver';
export type AppRoute = { screen: Screen; sub?: string };

export const SCREEN_SUBS: Readonly<Record<Screen, readonly string[]>> = {
  home: [],
  input: ['bldc'],
  physics: ['patterns'],
  plan: ['options'],
  deliver: ['package'],
};

export function isScreen(value: string): value is Screen {
  return value === 'home' || value === 'input' || value === 'physics' || value === 'plan' || value === 'deliver';
}

export function normalizeRoute(candidate: { screen?: unknown; sub?: unknown }): AppRoute {
  if (typeof candidate.screen !== 'string' || !isScreen(candidate.screen)) return { screen: 'home' };
  // sub 来自 hash/外部输入，签名里是 unknown；必须先收窄成字符串才能参与校验与返回，
  // 否则 tsc 会在 includes() 与返回值两处报 '{} | null' 不可赋给 string。
  if (typeof candidate.sub !== 'string') return { screen: candidate.screen };
  return SCREEN_SUBS[candidate.screen].includes(candidate.sub) ? { screen: candidate.screen, sub: candidate.sub } : { screen: 'home' };
}

export function parseHash(hash: string): AppRoute {
  const raw = hash.replace(/^#/, '').replace(/^\//, '');
  if (!raw) return { screen: 'home' };
  const [screenRaw, subRaw] = raw.split('/');
  return normalizeRoute({ screen: screenRaw, sub: subRaw });
}
