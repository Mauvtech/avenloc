'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { addDays, daysBetween, fromISO, toISO } from '@/lib/calendar';
import MonthCalendar from '@/components/month-calendar';
import { PageLoader } from '@/components/ui';

interface Props {
  listingId: string;
}

export default function AvailabilityCalendar({ listingId }: Props) {
  // jour ISO -> id de la ligne ListingAvailability qui le bloque
  const [blocked, setBlocked] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [busyDay, setBusyDay] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const rows = await api.listings.availability(listingId).catch(() => []);
    const map = new Map<string, string>();
    for (const row of rows) {
      if (row.isAvailable) continue;
      for (const day of daysBetween(row.startDate, row.endDate)) map.set(day, row.id);
    }
    setBlocked(map);
  }, [listingId]);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  async function toggle(iso: string) {
    setBusyDay(iso);
    setError(null);
    try {
      const existingId = blocked.get(iso);
      if (existingId) {
        await api.listings.unblock(listingId, existingId);
      } else {
        await api.listings.blockDates(listingId, iso, toISO(addDays(fromISO(iso), 1)));
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action impossible');
    } finally {
      setBusyDay(null);
    }
  }

  if (loading) return <PageLoader label="Chargement du calendrier…" />;

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted">
        Cliquez un jour pour le <strong>bloquer</strong> ou le <strong>débloquer</strong>. Les jours
        bloqués n&apos;apparaissent plus comme réservables pour les locataires.
      </p>

      <MonthCalendar
        months={2}
        onDayClick={toggle}
        dayClassName={(iso) =>
          `${blocked.has(iso) ? 'bg-danger-tint font-semibold text-danger-fg line-through' : ''} ${
            busyDay === iso ? 'opacity-40' : ''
          }`
        }
      />

      {error && <p className="text-sm text-danger-fg">{error}</p>}

      <div className="flex gap-4 text-xs text-muted">
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-surface ring-1 ring-line" /> Disponible
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-danger-tint ring-1 ring-danger/30" /> Bloqué
        </span>
      </div>
    </div>
  );
}
