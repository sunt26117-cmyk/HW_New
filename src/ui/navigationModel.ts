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

export function normalizeRoute(candidate: Partial<AppRoute>): AppRoute {
  if (typeof candidate.screen !== 'string' || !isScreen(candidate.screen)) return { screen: 'home' };
  if (candidate.sub === undefined) return { screen: candidate.screen };
  return SCREEN_SUBS[candidate.screen].includes(candidate.sub) ? { screen: candidate.screen, sub: candidate.sub } : { screen: 'home' };
}

export function parseHash(hash: string): AppRoute {
  const raw = hash.replace(/^#/, '').replace(/^\//, '');
  if (!raw) return { screen: 'home' };
  const [screenRaw, subRaw] = raw.split('/');
  return normalizeRoute({ screen: screenRaw, sub: subRaw });
}
