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
          Trouvez votre espace de travail
        </h1>
      </div>
      <div className="relative mx-auto mt-6 max-w-3xl">{children}</div>
    </section>
  );
}
