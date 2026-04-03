import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type TrackRow = {
  id: string;
  title: string;
  status: string | null;
  quality_score: number | null;
};

type VersionRow = {
  id: string;
  track_id: string;
  scene_slug: string;
  stream_count: number | null;
  status: string | null;
};

type PayoutRow = {
  amount: string | number | null;
  status: string | null;
};

type NotificationItem = {
  id: string;
  title: string;
  description: string;
  at: string;
  variant: "success" | "info" | "warning";
};

function badgeClass(status: string) {
  const s = status.toLowerCase();
  if (s === "live")
    return "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30";
  if (s === "scoring" || s === "processing")
    return "bg-sky-500/15 text-sky-200 ring-sky-500/30";
  if (s === "rejected")
    return "bg-red-500/15 text-red-200 ring-red-500/30";
  return "bg-white/5 text-cream/60 ring-white/10";
}

function formatGbp(n: number) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 2,
  }).format(n);
}

function buildNotifications(
  tracks: TrackRow[],
  versions: VersionRow[],
): NotificationItem[] {
  const list: NotificationItem[] = [];
  const now = new Date();
  const iso = now.toISOString().slice(0, 16).replace("T", " ");

  const liveVersions = versions.filter((v) => v.status === "live").length;
  if (liveVersions > 0) {
    list.push({
      id: "n-live",
      title: "Versions entered catalogue",
      description: `${liveVersions} scene versions are live and eligible for streaming.`,
      at: iso,
      variant: "success",
    });
  }

  const processing = tracks.filter(
    (t) => (t.status ?? "").toLowerCase() === "processing",
  ).length;
  if (processing > 0) {
    list.push({
      id: "n-payout",
      title: "Payout processing",
      description:
        "Monthly payout review runs after streams reconcile. No action needed.",
      at: iso,
      variant: "info",
    });
  }

  const lowQ = tracks.filter(
    (t) =>
      typeof t.quality_score === "number" &&
      t.quality_score > 0 &&
      t.quality_score < 60,
  );
  for (const t of lowQ.slice(0, 2)) {
    list.push({
      id: `n-q-${t.id}`,
      title: "Version below quality threshold",
      description: `${t.title} returned a low quality score. Review loudness and headroom before resubmitting.`,
      at: iso,
      variant: "warning",
    });
  }

  if (list.length === 0) {
    list.push({
      id: "n-empty",
      title: "No alerts",
      description:
        "Upload instrumental masters to start the pipeline. Notifications appear here as processing completes.",
      at: iso,
      variant: "info",
    });
  }

  return list;
}

export default async function DashboardPage() {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth");

  const { data: producer } = await supabase
    .from("producers")
    .select("id, name, status")
    .eq("user_id", user.id)
    .maybeSingle();

  const producerId = producer?.id as string | undefined;

  let tracks: TrackRow[] = [];
  let versions: VersionRow[] = [];
  let payouts: PayoutRow[] = [];

  if (producerId) {
    const { data: t } = await supabase
      .from("producer_tracks")
      .select("id, title, status, quality_score")
      .eq("producer_id", producerId);
    tracks = (t ?? []) as TrackRow[];

    const ids = tracks.map((x) => x.id);
    if (ids.length > 0) {
      const { data: v } = await supabase
        .from("producer_versions")
        .select("id, track_id, scene_slug, stream_count, status")
        .in("track_id", ids);
      versions = (v ?? []) as VersionRow[];
    }

    const { data: p } = await supabase
      .from("producer_payouts")
      .select("amount, status")
      .eq("producer_id", producerId);
    payouts = (p ?? []) as PayoutRow[];
  }

  const tracksLive = tracks.filter(
    (t) => (t.status ?? "").toLowerCase() === "live",
  ).length;
  const totalVersions = versions.length;
  const totalStreams = versions.reduce(
    (s, v) => s + (typeof v.stream_count === "number" ? v.stream_count : 0),
    0,
  );
  const pendingPayoutGbp = payouts
    .filter((p) => (p.status ?? "").toLowerCase() === "pending")
    .reduce((s, p) => s + Number(p.amount ?? 0), 0);

  const notifications = buildNotifications(tracks, versions);

  return (
    <div className="min-h-screen bg-surface text-cream">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.08] px-6 py-6 md:px-10">
        <div>
          <Link href="/" className="text-sm text-violet hover:opacity-90">
            &#8767; 5ounds
          </Link>
          <h1 className="mt-2 font-display text-3xl italic text-cream">
            Producer dashboard
          </h1>
          <p className="text-sm text-cream/55">
            {producer?.name
              ? `${producer.name} · ${(producer as { status?: string }).status ?? "pending"}`
              : "Complete your application to unlock uploads."}
          </p>
        </div>
        <nav className="flex flex-wrap gap-2">
          <Link
            href="/upload"
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-cream"
          >
            Upload
          </Link>
          <Link
            href="/earnings"
            className="rounded-lg border border-white/[0.12] px-4 py-2 text-sm text-cream/80"
          >
            Earnings
          </Link>
        </nav>
      </header>

      <main className="mx-auto max-w-6xl space-y-10 px-6 py-10 md:px-10">
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Tracks live", value: String(tracksLive) },
            { label: "Total versions", value: String(totalVersions) },
            { label: "Total streams", value: String(totalStreams) },
            {
              label: "Pending payout",
              value: formatGbp(pendingPayoutGbp),
            },
          ].map((card) => (
            <div
              key={card.label}
              className="hairline-border rounded-xl border border-solid bg-card p-5"
            >
              <p className="text-xs uppercase tracking-wide text-cream/45">
                {card.label}
              </p>
              <p className="mt-2 text-2xl font-semibold text-cream">
                {card.value}
              </p>
            </div>
          ))}
        </section>

        <section>
          <h2 className="font-display text-xl italic text-cream">Catalogue</h2>
          <div className="mt-4 overflow-x-auto rounded-xl border border-white/[0.08] bg-card">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-white/[0.08] text-cream/50">
                <tr>
                  <th className="px-4 py-3 font-medium">Track name</th>
                  <th className="px-4 py-3 font-medium">Scene versions</th>
                  <th className="px-4 py-3 font-medium">Streams</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {tracks.length === 0 ? (
                  <tr>
                    <td
                      className="px-4 py-6 text-cream/50"
                      colSpan={5}
                    >
                      No tracks yet.{" "}
                      <Link href="/upload" className="text-violet underline">
                        Upload a master
                      </Link>
                    </td>
                  </tr>
                ) : (
                  tracks.map((t) => {
                    const vFor = versions.filter((v) => v.track_id === t.id);
                    const streams = vFor.reduce(
                      (s, v) =>
                        s +
                        (typeof v.stream_count === "number"
                          ? v.stream_count
                          : 0),
                      0,
                    );
                    const st = (t.status ?? "processing").toLowerCase();
                    const badge =
                      st === "live"
                        ? "live"
                        : st === "rejected"
                          ? "rejected"
                          : "scoring";
                    return (
                      <tr
                        key={t.id}
                        className="border-b border-white/[0.06] last:border-0"
                      >
                        <td className="px-4 py-3 text-cream">{t.title}</td>
                        <td className="px-4 py-3 text-cream/70">
                          {vFor.length}
                        </td>
                        <td className="px-4 py-3 text-cream/70">{streams}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${badgeClass(badge)}`}
                          >
                            {badge === "scoring" ? "Scoring" : badge}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <Link
                            href={`/pipeline?track=${t.id}`}
                            className="text-violet hover:underline"
                          >
                            Pipeline
                          </Link>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 className="font-display text-xl italic text-cream">
            Notifications
          </h2>
          <ul className="mt-4 space-y-3">
            {notifications.map((n) => {
              const border =
                n.variant === "success"
                  ? "border-emerald-500/40"
                  : n.variant === "warning"
                    ? "border-amber-500/45"
                    : "border-sky-500/35";
              return (
                <li
                  key={n.id}
                  className={`hairline-border rounded-xl border border-l-4 border-solid bg-card p-4 ${border}`}
                >
                  <p className="font-medium text-cream">{n.title}</p>
                  <p className="mt-1 text-sm text-cream/65">{n.description}</p>
                  <p className="mt-2 text-xs text-cream/40">{n.at}</p>
                </li>
              );
            })}
          </ul>
        </section>
      </main>
    </div>
  );
}
