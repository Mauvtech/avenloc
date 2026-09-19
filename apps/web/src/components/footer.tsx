import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="mt-16 bg-surface">
      <div className="mx-auto flex max-w-[1120px] flex-col gap-4 px-4 py-8 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <span className="text-[13px] text-muted">© {new Date().getFullYear()} Sppot by Aven</span>
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
    </footer>
  );
}
