import { STATUS_LABEL } from '@/lib/format';
import type { QuoteStatus } from '@/lib/types';
import { Badge } from './ui';

const TONE: Record<QuoteStatus, Parameters<typeof Badge>[0]['tone']> = {
  NEW: 'cut',
  CONTACTED: 'warn',
  QUOTED: 'neutral',
  APPROVED: 'lime',
  IN_PRODUCTION: 'ink',
  READY: 'ok',
  DELIVERED: 'neutral',
  CANCELLED: 'red',
};

export function StatusBadge({ status }: { status: QuoteStatus }) {
  return <Badge tone={TONE[status]}>{STATUS_LABEL[status]}</Badge>;
}
