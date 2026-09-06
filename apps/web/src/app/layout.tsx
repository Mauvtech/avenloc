import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Nav from '@/components/nav';
import Footer from '@/components/footer';
import DevToolbar from '@/components/dev-toolbar';
import { ToastProvider } from '@/components/toast';
import { ConfirmProvider } from '@/components/confirm';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Aven — Louez l’espace qu’il vous faut',
  description:
    'Appartements, bureaux, salles de réunion, ateliers, entrepôts et parkings — à réserver en quelques clics.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={inter.variable}>
      <body className="flex min-h-screen flex-col">
        <ToastProvider>
          <ConfirmProvider>
            <Nav />
            <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">{children}</main>
            <Footer />
            <DevToolbar />
          </ConfirmProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
