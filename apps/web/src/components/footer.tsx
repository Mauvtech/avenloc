import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="mt-16 border-t border-line bg-surface">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex items-center gap-2.5">
          <span className="flex h-6 w-6 items-center justify-center rounded bg-brand text-xs font-extrabold text-white">
            A
          </span>
          <span className="font-bold">Aven</span>
          <span className="text-muted">· Locations d&apos;espaces, entre particuliers et pros</span>
        </div>
        <nav className="flex flex-wrap gap-x-5 gap-y-2 text-muted">
          <Link href="/" className="hover:text-ink">
            Explorer
          </Link>
          <Link href="/legal/terms" className="hover:text-ink">
            Conditions
          </Link>
          <Link href="/legal/privacy" className="hover:text-ink">
            Confidentialité
          </Link>
          <Link href="/legal/cancellation" className="hover:text-ink">
            Politique d&apos;annulation
          </Link>
        </nav>
      </div>
      <div className="border-t border-line py-3 text-center text-xs text-muted">
        © {new Date().getFullYear()} Aven
      </div>
    </footer>
  );
}
