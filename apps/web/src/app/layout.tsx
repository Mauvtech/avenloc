import type { Metadata } from 'next';
import { Space_Grotesk } from 'next/font/google';
import './globals.css';
import Nav from '@/components/nav';
import Footer from '@/components/footer';
import DevToolbar from '@/components/dev-toolbar';
import { ToastProvider } from '@/components/toast';
import { ConfirmProvider } from '@/components/confirm';

// Corps de texte : pile système (-apple-system, Segoe UI…), comme le prototype
// — pas de police chargée depuis Google Fonts. Space Grotesk sert uniquement
// au logo, exactement comme le mot-clé "Sppot" du prototype.
const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Sppot by Aven — Trouvez votre espace de travail',
  description:
    'Appartements, bureaux, salles de réunion, ateliers, entrepôts et parkings — à réserver en quelques clics.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={spaceGrotesk.variable}>
      <body className="flex min-h-screen flex-col">
        <ToastProvider>
          <ConfirmProvider>
            <Nav />
            <main className="mx-auto w-full max-w-[1120px] flex-1 px-4 py-6 min-[641px]:p-8">{children}</main>
            <Footer />
            <DevToolbar />
          </ConfirmProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
