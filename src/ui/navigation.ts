import { useSyncExternalStore } from 'react';
import { normalizeRoute, parseHash, SCREEN_SUBS, type AppRoute, type Screen } from './navigationModel.ts';
export type { AppRoute, Screen } from './navigationModel.ts';

let route: AppRoute = parseHash(typeof window === 'undefined' ? '' : window.location.hash);
const listeners = new Set<() => void>();

function emitHash(next: AppRoute) {
  if (typeof window === 'undefined') return;
  const encoded = next.sub ? `#${next.screen}/${encodeURIComponent(next.sub)}` : `#${next.screen}`;
  if (window.location.hash !== encoded) window.history.pushState({}, '', encoded);
}

export function navigate(next: AppRoute): void {
  const normalized = normalizeRoute(next);
  // Secondary selection is written before the outer screen so a keyed ErrorBoundary
  // cannot remount a screen before its intended sub-route exists.
  if (normalized.sub) route = { ...route, sub: normalized.sub };
  route = normalized;
  emitHash(route);
  for (const listener of listeners) listener();
}

export const navigation = {
  getSnapshot: () => route,
  subscribe(listener: () => void) { listeners.add(listener); return () => listeners.delete(listener); },
};

export function useNavigation(): AppRoute {
  return useSyncExternalStore(navigation.subscribe, navigation.getSnapshot, navigation.getSnapshot);
}

if (typeof window !== 'undefined') {
  const syncFromLocation = () => { route = parseHash(window.location.hash); for (const listener of listeners) listener(); };
  window.addEventListener('popstate', syncFromLocation);
  window.addEventListener('hashchange', syncFromLocation);
}

export function routeTable(): Readonly<Record<Screen, readonly string[]>> { return SCREEN_SUBS; }
