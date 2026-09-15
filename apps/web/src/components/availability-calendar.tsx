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
  // Premier jour cliqué d'une plage à bloquer en une fois (ex. "23 déc → 2 jan").
  const [rangeStart, setRangeStart] = useState<string | null>(null);

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

  async function blockRange(startIso: string, endIsoInclusive: string) {
    setBusyDay(startIso);
    setError(null);
    try {
      const [from, to] =
        startIso <= endIsoInclusive ? [startIso, endIsoInclusive] : [endIsoInclusive, startIso];
      await api.listings.blockDates(listingId, from, toISO(addDays(fromISO(to), 1)));
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action impossible');
    } finally {
      setBusyDay(null);
    }
  }

  async function toggle(iso: string) {
    // Un jour déjà bloqué se débloque toujours au premier clic, sans mode plage.
    const existingId = blocked.get(iso);
    if (existingId) {
      setRangeStart(null);
      setBusyDay(iso);
      setError(null);
      try {
        await api.listings.unblock(listingId, existingId);
        await load();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Action impossible');
      } finally {
        setBusyDay(null);
      }
      return;
    }

    if (!rangeStart) {
      setRangeStart(iso);
      return;
    }
    if (rangeStart === iso) {
      // Deuxième clic sur le même jour : bloque ce seul jour.
      setRangeStart(null);
      await blockRange(iso, iso);
      return;
    }
    const start = rangeStart;
    setRangeStart(null);
    await blockRange(start, iso);
  }

  if (loading) return <PageLoader label="Chargement du calendrier…" />;

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted">
        Cliquez un jour pour le <strong>bloquer</strong>, ou deux jours pour bloquer toute la{' '}
        <strong>plage</strong> entre les deux. Cliquez un jour bloqué pour le{' '}
        <strong>débloquer</strong>. Les jours bloqués n&apos;apparaissent plus comme réservables
        pour les locataires.
      </p>
      {rangeStart && (
        <p className="text-xs text-brand-fg">
          Début de plage sélectionné ({rangeStart}) — cliquez le dernier jour à bloquer.{' '}
          <button type="button" onClick={() => setRangeStart(null)} className="underline">
            Annuler
          </button>
        </p>
      )}

      <MonthCalendar
        months={2}
        onDayClick={toggle}
        dayClassName={(iso) =>
          `${blocked.has(iso) ? 'bg-danger-tint font-semibold text-danger-fg line-through' : ''} ${
            rangeStart === iso ? 'ring-2 ring-brand' : ''
          } ${busyDay === iso ? 'opacity-40' : ''}`
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
