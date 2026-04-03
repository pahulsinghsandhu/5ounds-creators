import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const STAGES: { key: string; label: string; description: string }[] = [
  { key: "upload", label: "Upload", description: "Master received and checksum verified." },
  {
    key: "vocal",
    label: "Vocal gate",
    description: "Full-file acrcloud scan for lyrical content.",
  },
  {
    key: "analysis",
    label: "Analysis",
    description: "Tempo, key, and stem-safe transform plan.",
  },
  {
    key: "transform",
    label: "Transform",
    description: "Style transformation engine builds scene versions.",
  },
  {
    key: "frequency",
    label: "Frequency layer",
    description: "Invisible binaural layer applied per scene target.",
  },
  {
    key: "quality",
    label: "Quality score",
    description: "Loudness, dynamics, and artefact checks.",
  },
  {
    key: "attribution",
    label: "Attribution",
    description: "Rights, splits, and catalogue metadata locked.",
  },
  { key: "live", label: "Live", description: "Published to streaming surfaces." },
];

const SCENE_GRID: { slug: string; label: string; hz: number }[] = [
  { slug: "sleep", label: "Sleep", hz: 528 },
  { slug: "study", label: "Study", hz: 40 },
  { slug: "meditation", label: "Meditation", hz: 432 },
  { slug: "workout", label: "Workout", hz: 120 },
  { slug: "drive", label: "Drive", hz: 90 },
  { slug: "morning", label: "Morning", hz: 396 },
  { slug: "gaming", label: "Gaming", hz: 140 },
  { slug: "cafe", label: "Cafe", hz: 85 },
  { slug: "ambient", label: "Ambient", hz: 60 },
  { slug: "lofi", label: "Lo-fi", hz: 55 },
];

function stageIndexFromTrack(trackId: string | undefined): number {
  if (!trackId) return 3;
  let h = 0;
  for (let i = 0; i < trackId.length; i += 1) {
    h = (h * 31 + trackId.charCodeAt(i)) >>> 0;
  }
  return h % STAGES.length;
}

type Search = Record<string, string | string[] | undefined>;

export default async function PipelinePage({
  searchParams,
}: {
  searchParams: Search;
}) {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth");

  const raw = searchParams.track;
  const trackId = Array.isArray(raw) ? raw[0] : raw;
  const activeIdx = stageIndexFromTrack(trackId);

  const activeScenes = 4 + (activeIdx % 5);

  return (
    <div className="min-h-screen bg-surface text-cream">
      <header className="border-b border-white/[0.08] px-6 py-6 md:px-10">
        <Link href="/dashboard" className="text-sm text-violet hover:underline">
          Back to dashboard
        </Link>
        <h1 className="mt-3 font-display text-3xl italic">Processing pipeline</h1>
        <p className="mt-2 text-sm text-cream/55">
          Live status for mastering, transforms, and catalogue release.
        </p>
      </header>

      <main className="mx-auto max-w-6xl space-y-12 px-6 py-10 md:px-10">
        <section className="overflow-x-auto pb-2">
          <ol className="flex min-w-[720px] gap-3">
            {STAGES.map((s, i) => {
              const done = i < activeIdx;
              const active = i === activeIdx;
              const pending = i > activeIdx;
              return (
                <li
                  key={s.key}
                  className={`hairline-border min-w-[140px] flex-1 rounded-xl border border-solid p-4 ${
                    active
                      ? "border-accent bg-accent/15"
                      : done
                        ? "border-emerald-500/35 bg-emerald-500/5"
                        : "border-white/[0.08] bg-card/50 opacity-70"
                  }`}
                >
                  <p
                    className={`text-xs font-semibold uppercase tracking-wide ${
                      active
                        ? "text-violet"
                        : done
                          ? "text-emerald-200"
                          : "text-cream/40"
                    }`}
                  >
                    {i + 1}. {s.label}
                  </p>
                  <p className="mt-2 text-xs leading-relaxed text-cream/60">
                    {s.description}
                  </p>
                  {pending ? (
                    <p className="mt-2 text-[10px] uppercase text-cream/35">
                      Pending
                    </p>
                  ) : null}
                  {done ? (
                    <p className="mt-2 text-[10px] uppercase text-emerald-300/80">
                      Complete
                    </p>
                  ) : null}
                  {active ? (
                    <p className="mt-2 text-[10px] uppercase text-violet">
                      Active
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ol>
        </section>

        <section>
          <h2 className="font-display text-xl italic text-cream">
            Scene transformation targets
          </h2>
          <p className="mt-2 text-sm text-cream/55">
            Grid shows which scene versions are currently generating for this
            job.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
            {SCENE_GRID.map((cell, i) => {
              const on = i < activeScenes;
              return (
                <div
                  key={cell.slug}
                  className={`hairline-border rounded-lg border border-solid px-3 py-4 text-center text-sm ${
                    on
                      ? "border-accent bg-accent/20 text-cream"
                      : "border-white/[0.1] bg-card/60 text-cream/45"
                  }`}
                >
                  <span className="block font-medium">{cell.label}</span>
                  <span className="mt-1 block text-xs text-cream/50">
                    {cell.hz} hz
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}
