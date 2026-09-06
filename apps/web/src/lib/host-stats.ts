import type { Booking } from './types';
import { eur, eurRound } from './format';

const num = (v: string | number | null | undefined): number =>
  typeof v === 'number' ? v : parseFloat(v ?? '') || 0;

/** Montant net reversé à l'hôte (total encaissé − commission Aven). */
export const netAmount = (b: Booking): number => num(b.totalAmount) - num(b.serviceFee);

// Alias historiques → délèguent au formatage centralisé (lib/format).
export const fmtEUR = eurRound;
export const fmtEUR2 = eur;

export interface HostStats {
  revenueNet: number;
  revenueMonth: number;
  upcomingRevenue: number;
  avgBasket: number;
  platformFees: number;
  nightsUpcoming: number;
  counts: {
    total: number;
    pending: number;
    confirmed: number;
    completed: number;
    cancelled: number;
  };
  confirmationRate: number | null;
}

const EARNED = new Set(['CONFIRMED', 'COMPLETED']);

export function computeHostStats(bookings: Booking[]): HostStats {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  let revenueNet = 0;
  let revenueMonth = 0;
  let upcomingRevenue = 0;
  let platformFees = 0;
  let nightsUpcoming = 0;
  let earnedCount = 0;

  const counts = {
    total: bookings.length,
    pending: 0,
    confirmed: 0,
    completed: 0,
    cancelled: 0,
  };

  for (const b of bookings) {
    const net = netAmount(b);
    const start = new Date(b.startDate);
    const end = new Date(b.endDate);
    const nights = Math.max(
      1,
      Math.round((end.getTime() - start.getTime()) / 86_400_000),
    );

    if (b.status === 'PENDING') counts.pending++;
    else if (b.status === 'CONFIRMED') counts.confirmed++;
    else if (b.status === 'COMPLETED') counts.completed++;
    else if (b.status === 'CANCELLED') counts.cancelled++;

    if (EARNED.has(b.status)) {
      revenueNet += net;
      platformFees += num(b.serviceFee);
      earnedCount++;
      if (start >= monthStart && start < monthEnd) revenueMonth += net;
      if (b.status === 'CONFIRMED' && start >= today) {
        upcomingRevenue += net;
        nightsUpcoming += nights;
      }
    }
  }

  const settled = counts.confirmed + counts.completed + counts.cancelled;

  return {
    revenueNet,
    revenueMonth,
    upcomingRevenue,
    avgBasket: earnedCount ? revenueNet / earnedCount : 0,
    platformFees,
    nightsUpcoming,
    counts,
    confirmationRate: settled
      ? (counts.confirmed + counts.completed) / settled
      : null,
  };
}
