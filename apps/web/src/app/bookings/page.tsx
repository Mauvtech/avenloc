'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { isAuthenticated } from '@/lib/auth';
import CategoryIcon from '@/components/category-icon';
import { EmptyState, PageHeader, Skeleton } from '@/components/ui';
import type { Booking } from '@/lib/types';

const STATUS: Record<string, { label: string; cls: string }> = {
  PENDING: { label: 'En attente', cls: 'bg-warn-tint text-warn-fg' },
  CONFIRMED: { label: 'Confirmée', cls: 'bg-success-tint text-success-fg' },
  CANCELLED: { label: 'Annulée', cls: 'bg-danger-tint text-danger-fg' },
  COMPLETED: { label: 'Terminée', cls: 'bg-canvas text-muted' },
};

const fdate = (s: string) => new Date(s).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });

export default function BookingsPage() {
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[] | null>(null);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace('/auth/login');
      return;
    }
    api.bookings.mine().then(setBookings).catch(() => setBookings([]));
  }, [router]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title="Mes réservations" />

      {bookings === null ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))}
        </div>
      ) : bookings.length === 0 ? (
        <EmptyState
          icon="🗓"
          title="Aucune réservation"
          action={
            <Link href="/" className="btn-primary">
              Trouver un espace
            </Link>
          }
        >
          Vos réservations à venir et passées apparaîtront ici.
        </EmptyState>
      ) : (
        <div className="space-y-3">
          {bookings.map((b) => (
            <Link
              key={b.id}
              href={`/bookings/${b.id}`}
              className="card card-hover flex items-center gap-3 p-3.5"
            >
              <CategoryIcon type={b.listing?.type ?? 'OTHER'} size={22} className="text-brand-fg" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold">{b.listing?.title ?? 'Annonce'}</p>
                <p className="text-xs text-muted">
                  {fdate(b.startDate)} → {fdate(b.endDate)} · {b.guestCount} loc. ·{' '}
                  {Number(b.totalAmount).toLocaleString('fr-FR', {
                    style: 'currency',
                    currency: 'EUR',
                  })}
                </p>
              </div>
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                  STATUS[b.status]?.cls ?? 'bg-canvas text-muted'
                }`}
              >
                {STATUS[b.status]?.label ?? b.status}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
