import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-20 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-tint text-2xl text-brand-fg">
        🧭
      </div>
      <h1 className="text-2xl font-extrabold">Page introuvable</h1>
      <p className="text-sm text-muted">
        Ce lien n’existe pas ou a été déplacé. L’annonce a peut-être été retirée par son hôte.
      </p>
      <Link href="/" className="btn-primary">
        Retour à l’accueil
      </Link>
    </div>
  );
}
