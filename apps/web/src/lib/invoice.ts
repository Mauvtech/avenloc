import { dateLongUTC, dateShort, eur, timeLabel } from '@/lib/format';
import type { Booking } from '@/lib/types';
import type { PaymentHistoryItem } from '@/lib/api';

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/**
 * Génère une facture HTML autonome (imprimable / exportable en PDF via le
 * navigateur) pour un encaissement, et déclenche son téléchargement.
 */
export function downloadInvoice(payment: PaymentHistoryItem, booking: Booking, hostName?: string) {
  const issued = payment.capturedAt ?? payment.createdAt;
  const reference = payment.id.slice(0, 8).toUpperCase();
  const tenantName = `${payment.booking.tenant.firstName} ${payment.booking.tenant.lastName}`;

  const rows: [string, string][] = [
    ['Sous-total', eur(booking.baseAmount)],
  ];
  if (Number(booking.cleaningFee) > 0) rows.push(['Frais de ménage', eur(booking.cleaningFee)]);
  rows.push(['Frais de service', eur(booking.serviceFee)]);
  if (Number(booking.taxAmount) > 0) rows.push(['Taxes', eur(booking.taxAmount)]);

  const html = `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<title>Facture ${esc(reference)} — Sppot by Aven</title>
<style>
  :root { color-scheme: light; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #14171A; max-width: 640px; margin: 48px auto; padding: 0 24px; }
  header { display: flex; justify-content: space-between; align-items: baseline; border-bottom: 1px solid #E7E7E7; padding-bottom: 20px; margin-bottom: 28px; }
  .brand { font-size: 20px; font-weight: 700; }
  .brand span { color: #6B7280; font-weight: 500; font-size: 13px; }
  h1 { font-size: 18px; margin: 0 0 4px; }
  .muted { color: #6B7280; font-size: 13px; }
  .parties { display: flex; justify-content: space-between; margin-bottom: 28px; gap: 24px; }
  .parties div { font-size: 13px; }
  .parties p { margin: 2px 0; }
  table { width: 100%; border-collapse: collapse; font-size: 14px; margin-bottom: 24px; }
  td { padding: 8px 0; border-bottom: 1px solid #E7E7E7; }
  td:last-child { text-align: right; }
  tfoot td { border-bottom: none; border-top: 1px solid #14171A; font-weight: 700; font-size: 15px; padding-top: 12px; }
  .payout { font-size: 12px; color: #6B7280; margin-top: -12px; margin-bottom: 24px; }
  footer { font-size: 11px; color: #6B7280; border-top: 1px solid #E7E7E7; padding-top: 16px; }
  @media print { body { margin: 0; } }
</style>
</head>
<body>
  <header>
    <div class="brand">Sppot <span>by Aven</span></div>
    <div class="muted">Facture n° ${esc(reference)}</div>
  </header>

  <h1>${esc(booking.listing?.title ?? payment.booking.listing.title)}</h1>
  <p class="muted">
    ${esc(dateLongUTC(payment.booking.startAt))} · ${timeLabel(payment.booking.startAt)}–${timeLabel(payment.booking.endAt)}
  </p>

  <div class="parties">
    <div>
      <p class="muted">Émise par</p>
      <p><strong>${esc(hostName ?? 'Hôte Sppot')}</strong></p>
    </div>
    <div>
      <p class="muted">Client</p>
      <p><strong>${esc(tenantName)}</strong></p>
    </div>
    <div>
      <p class="muted">Date d'émission</p>
      <p><strong>${esc(dateShort(issued))}</strong></p>
    </div>
  </div>

  <table>
    <tbody>
      ${rows.map(([label, value]) => `<tr><td>${esc(label)}</td><td>${esc(value)}</td></tr>`).join('\n      ')}
    </tbody>
    <tfoot>
      <tr><td>Total payé par le client</td><td>${esc(eur(booking.totalAmount))}</td></tr>
    </tfoot>
  </table>

  <p class="payout">
    Commission Sppot : ${esc(eur(payment.platformFee))} · Reversé à l'hôte : ${esc(eur(payment.hostPayout))}
  </p>

  <footer>
    Facture générée automatiquement par Sppot by Aven pour la réservation ${esc(payment.booking.id.slice(0, 8))}.
  </footer>
</body>
</html>`;

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `facture-${reference}.html`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
