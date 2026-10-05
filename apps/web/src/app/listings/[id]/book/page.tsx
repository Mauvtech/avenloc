'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { isAuthenticated, loginHref, registerHref } from '@/lib/auth';
import SlotPicker, { type SlotSelection } from '@/components/slot-picker';
import PriceBreakdown from '@/components/price-breakdown';
import { BackLink, PageLoader, Skeleton } from '@/components/ui';
import { eur, eurRound } from '@/lib/format';
import { UNIT_LABEL_SHORT } from '@/lib/listing';
import { cancellationPolicyDetail } from '@/lib/cancellation-policies';
import type { Listing, Quote } from '@/lib/types';

/** Ligne label/valeur du récapitulatif, façon InfoRow du prototype. */
function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 py-1 text-sm">
      <span className="text-muted">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}

const WEEKDAY_LONG = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

export default function BookListingPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const pathname = usePathname();

  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [loggedIn, setLoggedIn] = useState(false);

  const [slot, setSlot] = useState<SlotSelection | null>(null);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [form, setForm] = useState({
    guestCount: '1',
    arrivalTime: '',
    guestNote: '',
    activityDescription: '',
    rcProAccepted: false,
    houseRulesAccepted: false,
  });
  const [showHouseRules, setShowHouseRules] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setLoggedIn(isAuthenticated());
    api.listings
      .getById(id)
      .then(setListing)
      .catch(() => router.replace(`/listings/${id}`))
      .finally(() => setLoading(false));

    try {
      const raw = sessionStorage.getItem(`aven:draft:${id}`);
      if (raw) {
        const draft = JSON.parse(raw) as { slot?: SlotSelection; form?: typeof form };
        if (draft.slot) setSlot(draft.slot);
        if (draft.form) setForm(draft.form);
        sessionStorage.removeItem(`aven:draft:${id}`);
      }
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, router]);

  useEffect(() => {
    if (!slot) {
      setQuote(null);
      return;
    }
    let cancelled = false;
    setQuoting(true);
    api.bookings
      .quote({ listingId: id, date: slot.date, startTime: slot.startTime, endTime: slot.endTime })
      .then((q) => !cancelled && setQuote(q))
      .catch(() => !cancelled && setQuote(null))
      .finally(() => !cancelled && setQuoting(false));
    return () => {
      cancelled = true;
    };
  }, [slot, id]);

  function saveDraft() {
    try {
      sessionStorage.setItem(`aven:draft:${id}`, JSON.stringify({ slot, form }));
    } catch {
      /* ignore */
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isAuthenticated()) return router.push(loginHref(pathname));
    if (!slot) {
      setError('Choisissez un créneau.');
      return;
    }
    if (!form.houseRulesAccepted) {
      setError("Merci d'accepter le règlement intérieur de l'annonce.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const booking = await api.bookings.create({
        listingId: id,
        date: slot.date,
        startTime: slot.startTime,
        endTime: slot.endTime,
        guestCount: parseInt(form.guestCount, 10),
        arrivalTime: form.arrivalTime || undefined,
        guestNote: form.guestNote || undefined,
        activityDescription: form.activityDescription || undefined,
        rcProAccepted: form.rcProAccepted,
        houseRulesAccepted: form.houseRulesAccepted,
      });
      router.push(`/bookings/${booking.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la réservation');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <PageLoader />;
  if (!listing) return null;

  const unit = UNIT_LABEL_SHORT[listing.pricingUnit] ?? listing.pricingUnit;
  const activiteOk = !listing.activityValidationRequired || form.activityDescription.trim().length > 0;
  const rcProOk = !listing.rcProRequired || form.rcProAccepted;
  const canSubmit = !!slot && activiteOk && rcProOk && form.houseRulesAccepted;
  const paymentsReady = listing.hostPaymentsReady !== false;

  return (
    <div className="space-y-6">
      <BackLink href={`/listings/${id}`}>{listing.title}</BackLink>

      <div className="marketplace-detail">
        {/* Colonne principale */}
        <div className="space-y-5">
          <h1 className="text-xl font-bold">Choisissez un créneau</h1>

          <SlotPicker listingId={listing.id} value={slot} onChange={setSlot} />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Locataires</label>
              <input
                type="number"
                min="1"
                required
                value={form.guestCount}
                onChange={(e) => setForm((f) => ({ ...f, guestCount: e.target.value }))}
                className="field"
              />
            </div>
            <div>
              <label className="label">Arrivée</label>
              <input
                type="time"
                value={form.arrivalTime}
                onChange={(e) => setForm((f) => ({ ...f, arrivalTime: e.target.value }))}
                className="field"
              />
            </div>
          </div>

          <div>
            <label className="label">
              Message pour l&apos;hôte <span className="font-normal">(optionnel)</span>
            </label>
            <textarea
              rows={2}
              value={form.guestNote}
              onChange={(e) => setForm((f) => ({ ...f, guestNote: e.target.value }))}
              className="field resize-y"
            />
          </div>

          {listing.activityValidationRequired && (
            <div>
              <p className="label mb-1.5">Décrivez l&apos;activité et l&apos;usage prévus de l&apos;espace</p>
              <p className="mb-2 text-xs text-muted">
                L&apos;hôte valide chaque demande selon l&apos;activité déclarée avant de confirmer la
                réservation.
              </p>
              <textarea
                rows={3}
                required
                placeholder="ex. Tournage photo pour une marque de vêtements, 4 personnes sur place"
                value={form.activityDescription}
                onChange={(e) => setForm((f) => ({ ...f, activityDescription: e.target.value }))}
                className="field resize-y"
              />
            </div>
          )}

          {listing.rcProRequired && (
            <label className="flex items-start gap-2.5 text-sm">
              <input
                type="checkbox"
                checked={form.rcProAccepted}
                onChange={(e) => setForm((f) => ({ ...f, rcProAccepted: e.target.checked }))}
                className="mt-0.5"
              />
              Je certifie disposer d&apos;une assurance responsabilité civile professionnelle (RC Pro) en
              cours de validité.
            </label>
          )}

          <div>
            <label className="flex items-start gap-2.5 text-sm">
              <input
                type="checkbox"
                checked={form.houseRulesAccepted}
                onChange={(e) => setForm((f) => ({ ...f, houseRulesAccepted: e.target.checked }))}
                className="mt-0.5"
              />
              J&apos;ai lu et j&apos;accepte le règlement intérieur de l&apos;espace.
            </label>
            {listing.houseRules && (
              <details className="mt-1.5 ml-6">
                <summary className="cursor-pointer text-xs text-muted">Lire le règlement intérieur</summary>
                <p className="mt-1.5 whitespace-pre-wrap text-xs text-muted">{listing.houseRules}</p>
              </details>
            )}
          </div>
        </div>

        {/* Colonne latérale */}
        <div>
          <div className="card sticky top-5 space-y-1 p-[22px]">
            <p className="section-title mb-2.5">Récapitulatif</p>
            <InfoRow label="Espace" value={listing.title} />
            <InfoRow
              label="Date"
              value={slot ? WEEKDAY_LONG.format(new Date(`${slot.date}T00:00:00`)) : '—'}
            />
            <InfoRow label="Créneau" value={slot ? `${slot.startTime} – ${slot.endTime}` : '—'} />
            <InfoRow label="Annulation" value={cancellationPolicyDetail(listing.cancellationPolicy).label} />
            {listing.depositAmount && (
              <InfoRow label="Caution" value={`${eurRound(listing.depositAmount)} (empreinte)`} />
            )}

            {quoting && <Skeleton className="mt-3 h-16 w-full" />}
            {quote && !quoting && (
              <div className="mt-2 border-t border-line pt-2.5">
                <PriceBreakdown quote={quote} />
              </div>
            )}
            {!quote && !quoting && (
              <div className="mt-2 flex justify-between border-t border-line pt-2.5 text-[15px] font-bold">
                <span>Total</span>
                <span>
                  {eurRound(listing.basePrice)} / {unit}
                </span>
              </div>
            )}

            {error && <p className="text-xs text-danger-fg">{error}</p>}

            {loggedIn ? (
              <>
                <button
                  onClick={handleSubmit}
                  disabled={submitting || !paymentsReady || !canSubmit}
                  className="btn-primary w-full"
                >
                  {submitting
                    ? 'Envoi…'
                    : listing.activityValidationRequired
                      ? 'Envoyer la demande de réservation'
                      : 'Réserver'}
                </button>
                {!canSubmit && slot && (
                  <p className="text-xs text-muted">
                    {!activiteOk && "Décrivez l'activité prévue. "}
                    {!rcProOk && 'Confirmez votre assurance RC Pro. '}
                    {!form.houseRulesAccepted && 'Acceptez le règlement intérieur.'}
                  </p>
                )}
              </>
            ) : (
              <div className="rounded-md border border-brand/25 bg-brand-tint/40 p-3.5 text-center">
                <p className="text-sm font-semibold text-ink">Connectez-vous pour réserver</p>
                <p className="mt-1 text-xs text-muted">
                  Créez un compte ou connectez-vous pour finaliser cette réservation. Vos dates et
                  informations restent enregistrées ici.
                </p>
                <div className="mt-3 flex gap-2">
                  <Link
                    href={loginHref(pathname)}
                    onClick={saveDraft}
                    className="btn-primary flex-1 justify-center"
                  >
                    Se connecter
                  </Link>
                  <Link
                    href={registerHref(pathname)}
                    onClick={saveDraft}
                    className="btn-ghost flex-1 justify-center"
                  >
                    Créer un compte
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
