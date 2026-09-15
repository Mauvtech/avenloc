import Link from 'next/link';
import type { ReactNode } from 'react';

/* ── Badge identité vérifiée ─────────────────────────────────────────── */
export function VerifiedBadge({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium text-ink ${className}`}>
      <svg width="12" height="12" viewBox="0 0 10 10" fill="none" aria-hidden>
        <circle cx="5" cy="5" r="5" className="fill-brand" />
        <path
          d="M2.8 5.1L4.2 6.5L7.2 3.3"
          stroke="white"
          strokeWidth="1.1"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      Vérifié
    </span>
  );
}

/* ── Skeleton ────────────────────────────────────────────────────────── */
export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`skeleton ${className}`} />;
}

export function ListingCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-lg border border-line bg-surface">
      <Skeleton className="h-44 w-full rounded-none" />
      <div className="space-y-2 p-3">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="h-3 w-2/5" />
        <Skeleton className="h-4 w-1/3" />
      </div>
    </div>
  );
}

/* ── Empty state ─────────────────────────────────────────────────────── */
export function EmptyState({
  icon = '✦',
  title,
  children,
  action,
}: {
  icon?: ReactNode;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="card flex flex-col items-center gap-3 px-6 py-14 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-tint text-lg text-brand-fg">
        {icon}
      </div>
      <div>
        <p className="font-bold text-ink">{title}</p>
        {children && <p className="mt-1 text-sm text-muted">{children}</p>}
      </div>
      {action}
    </div>
  );
}

/* ── Page header ─────────────────────────────────────────────────────── */
export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-extrabold sm:text-[28px]">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

/* ── Lien retour (avec destination sûre si pas d'historique) ─────────── */
export function BackLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1 text-sm text-muted transition-colors hover:text-ink"
    >
      <span aria-hidden>←</span>
      {children}
    </Link>
  );
}

/* ── Interrupteur (pilule) ───────────────────────────────────────────── */
export function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative h-[22px] w-[38px] flex-none rounded-full transition-colors ${
        checked ? 'bg-ink' : 'bg-line'
      }`}
    >
      <span
        className={`absolute top-0.5 h-[18px] w-[18px] rounded-full bg-white transition-all ${
          checked ? 'left-[18px]' : 'left-0.5'
        }`}
      />
    </button>
  );
}

/* ── Fil d'Ariane ────────────────────────────────────────────────────── */
export function Breadcrumbs({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <nav className="flex flex-wrap items-center gap-1.5 text-sm text-muted">
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-1.5">
          {i > 0 && <span aria-hidden>/</span>}
          {item.href ? (
            <Link href={item.href} className="transition-colors hover:text-ink hover:underline">
              {item.label}
            </Link>
          ) : (
            <span className="text-ink">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

/* ── Chargement plein bloc (cohérent partout) ───────────────────────── */
export function Spinner({ className = '' }: { className?: string }) {
  return (
    <span
      className={`inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent ${className}`}
      role="status"
      aria-label="Chargement"
    />
  );
}

export function PageLoader({ label = 'Chargement…' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center gap-3 py-20 text-sm text-muted">
      <Spinner className="text-brand" />
      {label}
    </div>
  );
}

/* ── Fil d'étapes ───────────────────────────────────────────────────── */
export function Stepper({ steps, current }: { steps: string[]; current: number }) {
  return (
    <ol className="flex items-center gap-2 text-xs font-semibold">
      {steps.map((label, i) => {
        const state = i < current ? 'done' : i === current ? 'current' : 'todo';
        return (
          <li key={label} className="flex items-center gap-2">
            <span
              className={`flex h-5 w-5 flex-none items-center justify-center rounded-full text-[11px] ${
                state === 'done'
                  ? 'bg-success text-white'
                  : state === 'current'
                    ? 'bg-brand text-white'
                    : 'bg-canvas text-muted'
              }`}
            >
              {state === 'done' ? '✓' : i + 1}
            </span>
            <span className={state === 'todo' ? 'text-muted' : 'text-ink'}>{label}</span>
            {i < steps.length - 1 && <span className="mx-1 h-px w-5 bg-line sm:w-8" />}
          </li>
        );
      })}
    </ol>
  );
}

/* ── Note en étoiles (lecture seule ou saisie) ──────────────────────── */
export function StarRating({
  value,
  onChange,
  size = 22,
  readOnly = false,
}: {
  value: number;
  onChange?: (v: number) => void;
  size?: number;
  readOnly?: boolean;
}) {
  return (
    <div className="inline-flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={readOnly}
          onClick={() => onChange?.(n)}
          aria-label={`${n} étoile${n > 1 ? 's' : ''}`}
          className={`${readOnly ? 'cursor-default' : 'cursor-pointer transition-transform hover:scale-110'} ${
            n <= value ? 'text-warn' : 'text-line'
          }`}
          style={{ fontSize: size, lineHeight: 1 }}
        >
          ★
        </button>
      ))}
    </div>
  );
}
