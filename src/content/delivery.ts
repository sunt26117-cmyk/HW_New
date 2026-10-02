import type { DocRef } from '../core/model/contracts.ts';

export const DELIVERY_DOCS: Readonly<Record<'RACI'|'EDR'|'CONTROLLED', DocRef>> = {
  RACI: { id: 'RACI', title: '责任分配与行动项' },
  EDR: { id: 'EDR', title: '工程决策记录' },
  CONTROLLED: { id: 'CONTROLLED', title: '受控工程文档' },
} as const;
