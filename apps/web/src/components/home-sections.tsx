import Link from 'next/link';
import CategoryIcon from '@/components/category-icon';
import { BROWSE_TYPES, typeLabel } from '@/lib/listing';

export function Hero({ children }: { children: React.ReactNode }) {
  return (
    <section className="relative -mx-4 overflow-hidden rounded-none border-b border-line bg-brand-tint/50 px-4 pb-8 pt-8 sm:-mx-6 sm:rounded-2xl sm:border sm:px-10 sm:pb-10 sm:pt-14">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-brand/10 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-32 -left-16 h-72 w-72 rounded-full bg-brand/10 blur-3xl"
      />
      <div className="relative mx-auto max-w-2xl text-center">
        <h1 className="text-3xl font-extrabold leading-[1.1] sm:text-[42px]">
          L’espace qu’il vous faut, réservé en quelques clics
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-muted">
          Appartements, bureaux, salles de réunion, ateliers, entrepôts et parkings — partout en
          France, entre particuliers et professionnels.
        </p>
      </div>
      <div className="relative mx-auto mt-6 max-w-3xl">{children}</div>
    </section>
  );
}

export function CategoryTiles() {
  return (
    <section className="space-y-3">
      <h2 className="section-title">Explorer par type d’espace</h2>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {BROWSE_TYPES.map((t) => (
          <Link
            key={t}
            href={`/?type=${t}`}
            className="card card-hover flex items-center gap-2.5 p-3 text-sm font-semibold"
          >
            <span className="flex h-9 w-9 flex-none items-center justify-center rounded-md bg-brand-tint text-brand-fg">
              <CategoryIcon type={t} size={18} />
            </span>
            {typeLabel(t)}
          </Link>
        ))}
      </div>
    </section>
  );
}

const STEPS = [
  {
    t: 'Trouvez',
    d: 'Filtrez par type, ville, dates et budget. Chaque annonce affiche prix, équipements et disponibilités.',
  },
  {
    t: 'Réservez',
    d: 'Réservation instantanée ou sur validation de l’hôte. Vous n’êtes débité qu’après confirmation.',
  },
  {
    t: 'Échangez',
    d: 'Une messagerie s’ouvre avec l’hôte dès la confirmation pour organiser l’arrivée.',
  },
];

export function HowItWorks() {
  return (
    <section className="space-y-3">
      <h2 className="section-title">Comment ça marche</h2>
      <div className="grid gap-3 sm:grid-cols-3">
        {STEPS.map((s, i) => (
          <div key={s.t} className="card p-4">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand text-sm font-bold text-white">
              {i + 1}
            </span>
            <p className="mt-2.5 font-bold">{s.t}</p>
            <p className="mt-1 text-sm text-muted">{s.d}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
