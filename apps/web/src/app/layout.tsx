import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Sppot by Aven — Trouvez votre espace de travail',
  description:
    'Bureaux, salles de réunion, ateliers et espaces professionnels à réserver à l’heure.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
