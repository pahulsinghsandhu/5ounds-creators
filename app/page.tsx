import Link from "next/link";

function LogoMark() {
  return (
    <Link
      href="/"
      className="flex items-baseline gap-2 text-violet transition-opacity hover:opacity-90"
    >
      <span className="font-display text-2xl italic leading-none">&#8767;</span>
      <span className="font-display text-xl italic tracking-tight">5ounds</span>
    </Link>
  );
}

export default function HomePage() {
  return (
    <div className="min-h-screen bg-surface text-cream">
      <header className="flex w-full items-center justify-between px-6 py-6 md:px-10 lg:px-16">
        <LogoMark />
        <nav className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="rounded-lg px-4 py-2 text-sm text-cream/90 transition-colors hover:text-cream"
          >
            Dashboard
          </Link>
          <Link
            href="/apply"
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-cream transition-opacity hover:opacity-90"
          >
            Apply now
          </Link>
        </nav>
      </header>

      <main className="px-6 pb-20 pt-10 md:px-10 lg:px-16 lg:pt-16">
        <section className="mx-auto max-w-4xl text-center lg:text-left">
          <h1 className="font-display text-balance text-4xl italic leading-tight tracking-tight text-cream md:text-5xl lg:text-6xl">
            The platform for instrumental producers
          </h1>
          <p className="mt-6 text-lg text-cream/70 md:text-xl">
            Upload once. Reach every scene.
          </p>
          <div className="mt-10 flex justify-center lg:justify-start">
            <Link
              href="/apply"
              className="inline-flex rounded-lg bg-accent px-8 py-3 text-base font-medium text-cream transition-opacity hover:opacity-90"
            >
              Apply as a producer
            </Link>
          </div>
        </section>

        <section className="mx-auto mt-20 grid max-w-6xl gap-6 md:grid-cols-3">
          <article className="hairline-border rounded-xl border border-solid bg-card p-6 md:p-8">
            <h2 className="font-display text-xl italic text-cream">
              Upload once &rarr; 7 scene versions
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-cream/65">
              Style transformation engine creates sleep, study, drive, cafe,
              morning, meditation and gaming versions automatically.
            </p>
          </article>
          <article className="hairline-border rounded-xl border border-solid bg-card p-6 md:p-8">
            <h2 className="font-display text-xl italic text-cream">
              Vocal detection gate
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-cream/65">
              Every track scanned by ACRCloud AI. Vocals detected = instant
              rejection. 5ounds is 100% instrumental. No exceptions.
            </p>
          </article>
          <article className="hairline-border rounded-xl border border-solid bg-card p-6 md:p-8 md:col-span-1">
            <h2 className="font-display text-xl italic text-cream">
              Frequency engine applied
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-cream/65">
              Every version gets an invisible binaural layer. Sleep=delta+528hz,
              focus=beta+40hz. Patent pending.
            </p>
          </article>
        </section>
      </main>

      <footer className="border-t border-white/[0.08] px-6 py-10 md:px-10 lg:px-16">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 text-sm text-cream/50 md:flex-row">
          <div className="flex flex-wrap items-center justify-center gap-4">
            <a href="#" className="hover:text-cream/70">
              Privacy
            </a>
            <span aria-hidden className="text-cream/30">
              &middot;
            </span>
            <a href="#" className="hover:text-cream/70">
              Terms
            </a>
            <span aria-hidden className="text-cream/30">
              &middot;
            </span>
            <a href="mailto:creators@5ounds.com" className="hover:text-cream/70">
              Contact
            </a>
          </div>
          <p className="text-cream/40">&copy; 2026 5ounds ltd</p>
        </div>
      </footer>
    </div>
  );
}
