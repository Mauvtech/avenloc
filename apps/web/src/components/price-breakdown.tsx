import type { Quote } from '@/lib/types';
import { UNIT_LABEL_SHORT } from '@/lib/listing';
import { eur } from '@/lib/format';

export default function PriceBreakdown({ quote }: { quote: Quote }) {
  const unit = UNIT_LABEL_SHORT[quote.pricingUnit] ?? 'unité';
  const rows: [string, string, boolean?][] = [
    [`${eur(quote.basePrice)} × ${quote.unitCount} ${unit}(s)`, eur(quote.baseAmount)],
  ];
  if (Number(quote.cleaningFee) > 0) rows.push(['Frais de ménage', eur(quote.cleaningFee)]);
  rows.push(['Frais de service Aven', eur(quote.serviceFee)]);
  if (Number(quote.taxAmount) > 0) rows.push(['Taxes', eur(quote.taxAmount)]);

  return (
    <div className="space-y-2 text-sm">
      {rows.map(([label, value]) => (
        <div key={label} className="flex justify-between text-muted">
          <span>{label}</span>
          <span className="tabular-nums text-ink">{value}</span>
        </div>
      ))}
      <div className="flex justify-between border-t border-line pt-2 font-bold text-ink">
        <span>Total</span>
        <span className="tabular-nums">{eur(quote.totalAmount)}</span>
      </div>
    </div>
  );
}
