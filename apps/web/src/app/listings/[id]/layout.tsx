import type { Metadata } from 'next';
import type { ReactNode } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

// Métadonnées par annonce (titre d'onglet + aperçu au partage de lien).
// La page elle-même reste un composant client.
export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  try {
    const res = await fetch(`${API_URL}/listings/${params.id}`, { next: { revalidate: 300 } });
    if (!res.ok) return { title: 'Annonce — Aven' };
    const l = await res.json();
    const title = `${l.title} · ${l.city} — Aven`;
    const description =
      typeof l.description === 'string'
        ? l.description.slice(0, 160)
        : 'Réservez cet espace sur Aven.';
    const image = l.photos?.[0]?.url;
    return {
      title,
      description,
      openGraph: {
        title,
        description,
        type: 'website',
        images: image ? [{ url: image }] : undefined,
      },
      twitter: {
        card: image ? 'summary_large_image' : 'summary',
        title,
        description,
        images: image ? [image] : undefined,
      },
    };
  } catch {
    return { title: 'Annonce — Aven' };
  }
}

export default function ListingLayout({ children }: { children: ReactNode }) {
  return children;
}
