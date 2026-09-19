import Link from 'next/link';
import CategoryIcon from '@/components/category-icon';
import { BROWSE_TYPES, typeLabel } from '@/lib/listing';

export function Hero({ children }: { children: React.ReactNode }) {
  return (
    <section className="pb-2 pt-4">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="text-[28px] font-bold leading-tight tracking-tight">
          L’espace qu’il vous faut, réservé en quelques clics
        </h1>
        <p className="mx-auto mt-2 max-w-xl text-sm text-muted">
          Appartements, bureaux, salles de réunion, ateliers, entrepôts et parkings — partout en
          France, entre particuliers et professionnels.
        </p>
      </div>
      <div className="mx-auto mt-6 max-w-3xl">{children}</div>
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
            <span className="flex h-9 w-9 flex-none items-center justify-center rounded-md bg-canvas text-ink">
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
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-ink text-sm font-bold text-white">
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
