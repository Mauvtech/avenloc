
'use client';
import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { toISO } from '@/lib/calendar';
import { parisDay, parisHour, overlapsHour } from '@/lib/host-calendar';
import { eurRound } from '@/lib/format';
import type { Booking, Listing, ListingAvailability } from '@/lib/types';
const BORDER = '#E7E7E7', INK = '#14171A', GRAY = '#6B7280', ACCENT = '#2454FF';
function StatusPill({ statut }: { statut: string }) {
  const colors = statut === 'confirmée' ? ['#EEF2FF', ACCENT] : statut === 'en attente' ? ['#FFF4E5', '#B45309'] : ['#F1F1EF', GRAY];
  return <span style={{ fontSize: 12, fontWeight: 500, borderRadius: 999, padding: '4px 10px', background: colors[0], color: colors[1] }}>{statut}</span>;
}
export default function HostCalendar({ bookings, spaces }: { bookings: Booking[]; spaces: Listing[] }) {
  const todayStr = parisDay(new Date().toISOString());
  const currentHour = parisHour(new Date().toISOString());
  const [viewDate, setViewDate] = useState(() => new Date(todayStr + 'T12:00:00'));
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [selectedSlots, setSelectedSlots] = useState<number[]>([]);
  const [selectedSpaceId, setSelectedSpaceId] = useState('');
  const [availability, setAvailability] = useState<ListingAvailability[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const published = useMemo(() => spaces.filter((space) => space.status === 'PUBLISHED'), [spaces]);
  useEffect(() => {
    if (!published.some((space) => space.id === selectedSpaceId)) setSelectedSpaceId(published[0]?.id ?? '');
  }, [published, selectedSpaceId]);
  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all(published.map((space) => api.listings.availability(space.id)))
      .then((items) => { if (active) setAvailability(items.flat()); })
      .catch(() => { if (active) setError('Impossible de charger les disponibilités. Rechargez la page avant de bloquer un créneau.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [published]);
  const year = viewDate.getFullYear(), month = viewDate.getMonth();
  const startOffset = (new Date(year, month, 1).getDay() + 6) % 7;
  const cells: (number | null)[] = [...Array(startOffset).fill(null), ...Array.from({ length: new Date(year, month + 1, 0).getDate() }, (_, i) => i + 1)];
  const monthLabel = viewDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  function bookingsForDate(date: string) {
    return bookings.filter((booking) => booking.status !== 'CANCELLED' && parisDay(booking.startAt) <= date && parisDay(new Date(new Date(booking.endAt).getTime() - 1).toISOString()) >= date).map((booking) => ({
      id: booking.id, space: booking.listing?.title ?? spaces.find((space) => space.id === booking.listingId)?.title ?? 'Espace',
      statut: booking.status === 'CONFIRMED' ? 'confirmée' : booking.status === 'PENDING' ? 'en attente' : 'terminée',
      heure: [booking.startAt, booking.endAt].map((date) => new Date(date).toLocaleTimeString('fr-FR', { timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit' })).join('–'),
      montant: Number(booking.totalAmount), raw: booking,
    }));
  }
  function selectDate(date: string) { setSelectedDate(date); setSelectedSlots([]); }
  function toggleSlot(hour: number) { setSelectedSlots((previous) => previous.includes(hour) ? previous.filter((value) => value !== hour) : [...previous, hour].sort((a,b) => a-b)); }
  async function blockSelected() {
    if (!selectedSlots.length || !selectedSpaceId || error || saving) return;
    setSaving(true);
    try {
      for (const hour of selectedSlots) {
        const block = await api.listings.blockSlot(selectedSpaceId, selectedDate, `${String(hour).padStart(2, '0')}:00`, `${String(hour + 1).padStart(2, '0')}:00`);
        setAvailability((previous) => [...previous.filter((item) => item.id !== block.id), block]);
      }
      setSelectedSlots([]);
    } catch (error) { setError(error instanceof Error ? error.message : 'Impossible de bloquer les créneaux. Rechargez le calendrier pour vérifier les disponibilités.'); }
    finally { setSaving(false); }
  }
  const selectedBookings = bookingsForDate(selectedDate);
  const selectedLabel = new Date(selectedDate + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  const daySlots = Array.from({ length: 11 }, (_, i) => ({ start: i + 8 }));
  const blockedForDay = daySlots.filter((slot) => availability.some((item) => item.listingId === selectedSpaceId && !item.isAvailable && overlapsHour(item.startAt, item.endAt, selectedDate, slot.start))).map((slot) => slot.start);
  return (
    <div>
      <div style={{ fontSize: 14, fontWeight: 600, color: INK, marginBottom: 12 }}>Calendrier</div>
      <div className="mkt-calendar-split" style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: 28 }}>
        <div style={{ border: `1px solid ${BORDER}`, borderRadius: 12, padding: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <button type="button" aria-label="Mois précédent du calendrier hôte" onClick={() => setViewDate(new Date(year, month - 1, 1))} style={{ border: `1px solid ${BORDER}`, background: "white", cursor: "pointer", fontSize: 13, color: INK, width: 28, height: 28, borderRadius: 6 }}>
              ‹
            </button>
            <div style={{ fontSize: 14, fontWeight: 600, color: INK, textTransform: "capitalize" }}>{monthLabel}</div>
            <button type="button" aria-label="Mois suivant du calendrier hôte" onClick={() => setViewDate(new Date(year, month + 1, 1))} style={{ border: `1px solid ${BORDER}`, background: "white", cursor: "pointer", fontSize: 13, color: INK, width: 28, height: 28, borderRadius: 6 }}>
              ›
            </button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 5, fontSize: 11, color: GRAY, marginBottom: 6 }}>
            {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((d) => (
              <div key={d} style={{ textAlign: "center" }}>{d}</div>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 5 }}>
            {cells.map((d, i) => {
              if (!d) return <div key={i} />;
              const dateObj = new Date(year, month, d);
              const dateStr = toISO(dateObj);
              const dayBookings = bookingsForDate(dateStr);
              const isSelected = dateStr === selectedDate;
              const isToday = dateStr === todayStr;
              return (
                <button type="button"
                  key={i}
                  aria-label={dateStr} aria-pressed={isSelected} onClick={() => selectDate(dateStr)}
                  style={{
                    border: isToday && !isSelected ? `1px solid ${INK}` : "1px solid transparent",
                    background: isSelected ? INK : "transparent",
                    color: isSelected ? "white" : INK,
                    borderRadius: 8,
                    height: 48,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    fontSize: 12,
                  }}
                >
                  {d}
                  <div style={{ display: "flex", gap: 2, marginTop: 3, height: 5 }}>
                    {dayBookings.slice(0, 3).map((b, bi) => (
                      <span key={bi} style={{ width: 5, height: 5, borderRadius: "50%", background: isSelected ? "white" : ACCENT }} />
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: INK, marginBottom: 10, textTransform: "capitalize" }}>{selectedLabel}</div>

          {selectedBookings.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              {selectedBookings.map((b) => (
                <div key={b.id} style={{ border: `1px solid ${BORDER}`, borderRadius: 10, padding: 12, marginBottom: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: INK }}>{b.space}</div>
                    <StatusPill statut={b.statut} />
                  </div>
                  <div style={{ fontSize: 12, color: GRAY, marginTop: 3 }}>{b.heure} · {eurRound(b.montant)}</div>
                </div>
              ))}
            </div>
          )}

          <label htmlFor="host-calendar-space" style={{ fontSize: 12, color: GRAY, display: "block", marginBottom: 6 }}>
            Bloquer des créneaux pour
          </label>
          <select
            id="host-calendar-space"
            value={selectedSpaceId}
            onChange={(e) => { setSelectedSpaceId(e.target.value); setSelectedSlots([]); }}
            disabled={!published.length}
            style={{ display: "block", width: "100%", border: `1px solid ${BORDER}`, borderRadius: 8, padding: "8px 10px", fontSize: 13, color: INK, marginBottom: 12 }}
          >
            {!published.length && <option value="">Aucun espace publié</option>}
            {published.map((space) => (
              <option key={space.id} value={space.id}>{space.title}</option>
            ))}
          </select>
          <div style={{ fontSize: 12, color: GRAY, marginBottom: 8 }}>
            Sélectionnez un ou plusieurs créneaux pour les bloquer manuellement
          </div>
          <div className="mkt-photo-thumbs" style={{ display: "grid", gap: 8 }}>
            {daySlots.map((slot) => {
              const isBooked = selectedBookings.some((b) => {
                return b.raw.listingId === selectedSpaceId && overlapsHour(b.raw.startAt, b.raw.endAt, selectedDate, slot.start);
              });
              const isBlocked = blockedForDay.includes(slot.start);
              const isSelected = selectedSlots.includes(slot.start);
              const disabled = isBooked || isBlocked || loading || saving || Boolean(error) || !selectedSpaceId || selectedDate < todayStr || (selectedDate === todayStr && slot.start <= currentHour);
              return (
                <button type="button"
                  key={slot.start}
                  disabled={disabled}
                  aria-pressed={isSelected} onClick={() => toggleSlot(slot.start)}
                  style={{
                    border: `1px solid ${isSelected ? INK : disabled ? BORDER : BORDER}`,
                    background: isSelected ? INK : isBooked ? "#F1F1EF" : isBlocked ? "#FBEAEA" : "white",
                    color: isSelected ? "white" : disabled ? GRAY : INK,
                    borderRadius: 8,
                    padding: "9px 4px",
                    fontSize: 12,
                    cursor: disabled ? "not-allowed" : "pointer",
                  }}
                >
                  {String(slot.start).padStart(2, "0")}:00
                  <div style={{ fontSize: 9, marginTop: 2, opacity: 0.75 }}>
                    {isBooked ? "réservé" : isBlocked ? "bloqué" : isSelected ? "sélectionné" : ""}
                  </div>
                </button>
              );
            })}
          </div>

          {error && <p role="alert" className="mt-3 text-[13px] text-danger-fg">{error}</p>}
          <button type="button"
            disabled={selectedSlots.length === 0 || saving || loading || Boolean(error)}
            onClick={blockSelected}
            style={{
              marginTop: 14,
              width: "100%",
              border: "none",
              background: selectedSlots.length === 0 ? "#F1F1EF" : INK,
              color: selectedSlots.length === 0 ? GRAY : "white",
              borderRadius: 8,
              padding: "10px 0",
              fontSize: 13,
              fontWeight: 600,
              cursor: selectedSlots.length === 0 ? "not-allowed" : "pointer",
            }}
          >
            {saving ? "Enregistrement…" : selectedSlots.length === 0 ? "Sélectionnez des créneaux" : `Bloquer ${selectedSlots.length} créneau${selectedSlots.length > 1 ? "x" : ""}`}
          </button>
        </div>
      </div>
    </div>
  );
}
