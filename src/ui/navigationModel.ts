export type Screen = 'home' | 'input' | 'physics' | 'plan' | 'deliver';
export type AppRoute = { screen: Screen; sub?: string };

export const SCREEN_SUBS: Readonly<Record<Screen, readonly string[]>> = {
  home: [],
  input: ['parameters', 'waveform', 'device', 'scenario'],
  physics: ['patterns', 'calculators', 'sensitivity'],
  plan: ['options', 'verification', 'regression'],
  deliver: ['package', 'raci', 'docs', 'versions', 'backup'],
};

export function isScreen(value: string): value is Screen {
  return value === 'home' || value === 'input' || value === 'physics' || value === 'plan' || value === 'deliver';
}

export function normalizeRoute(candidate: { screen?: unknown; sub?: unknown }): AppRoute {
  if (typeof candidate.screen !== 'string' || !isScreen(candidate.screen)) return { screen: 'home' };
  if (candidate.sub === undefined) return { screen: candidate.screen };
  return typeof candidate.sub === 'string' && SCREEN_SUBS[candidate.screen].includes(candidate.sub)
    ? { screen: candidate.screen, sub: candidate.sub }
    : { screen: 'home' };
}

export function parseHash(hash: string): AppRoute {
  const raw = hash.replace(/^#/, '').replace(/^\//, '');
  if (!raw) return { screen: 'home' };
  const [screenRaw, subRaw] = raw.split('/');
  return normalizeRoute({ screen: screenRaw, sub: subRaw });
}
