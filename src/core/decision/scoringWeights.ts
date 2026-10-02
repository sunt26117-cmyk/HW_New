/** Phase-4 decision policy weights. These are decision-policy parameters, not physics facts. */
export const STANDARD_TSCQL_WEIGHTS = { T: 25, S: 25, C: 15, Q: 20, L: 15 } as const;

export type TscqlWeights = { T: number; S: number; C: number; Q: number; L: number };
