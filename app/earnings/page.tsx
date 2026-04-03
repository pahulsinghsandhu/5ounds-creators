import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function gbp(n: number) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 2,
  }).format(n);
}

type VersionRow = {
  scene_slug: string;
  stream_count: number | null;
  track_id: string;
};

type TrackRow = { id: string; title: string };
type PayoutRow = {
  id: string;
  amount: string | number | null;
  period_start: string | null;
  period_end: string | null;
  status: string | null;
  created_at: string | null;
};

const PREVIEW_TRACKS: TrackRow[] = [
  { id: "preview-e-1", title: "North line instrumental" },
];

const PREVIEW_VERSIONS: VersionRow[] = [
  {
    track_id: "preview-e-1",
    scene_slug: "study",
    stream_count: 12500,
  },
  {
    track_id: "preview-e-1",
    scene_slug: "sleep",
    stream_count: 8200,
  },
];

const PREVIEW_PAYOUTS: PayoutRow[] = [
  {
    id: "preview-payout-1",
    amount: "210.4",
    period_start: "2026-01-01",
    period_end: "2026-01-31",
    status: "paid",
    created_at: "2026-02-05T12:00:00Z",
  },
  {
    id: "preview-payout-2",
    amount: "94.1",
    period_start: "2025-12-01",
    period_end: "2025-12-31",
    status: "pending",
    created_at: "2026-01-02T09:00:00Z",
  },
];

export default async function EarningsPage() {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let producer: {
    id?: string;
    stripe_account_id?: string | null;
    status?: string | null;
  } | null = null;

  if (user) {
    const { data: row } = await supabase
      .from("producers")
      .select("id, stripe_account_id, status")
      .eq("user_id", user.id)
      .maybeSingle();
    producer = row;
  }

  const producerId = producer?.id as string | undefined;
  const stripeId =
    (producer as { stripe_account_id?: string } | null)?.stripe_account_id ??
    (!user ? "acct_preview_review" : null);
  const approved =
    !user ||
    ["approved", "verified"].includes(
      ((producer as { status?: string } | null)?.status ?? "").toLowerCase(),
    );

  let tracks: TrackRow[] = [];
  let versions: VersionRow[] = [];
  let payouts: PayoutRow[] = [];

  if (producerId) {
    const { data: t } = await supabase
      .from("producer_tracks")
      .select("id, title")
      .eq("producer_id", producerId);
    tracks = (t ?? []) as TrackRow[];

    const ids = tracks.map((x) => x.id);
    if (ids.length > 0) {
      const { data: v } = await supabase
        .from("producer_versions")
        .select("track_id, scene_slug, stream_count")
        .in("track_id", ids);
      versions = (v ?? []) as VersionRow[];
    }

    const { data: p } = await supabase
      .from("producer_payouts")
      .select("*")
      .eq("producer_id", producerId)
      .order("created_at", { ascending: false });
    payouts = (p ?? []) as PayoutRow[];
  } else if (!user) {
    tracks = PREVIEW_TRACKS;
    versions = PREVIEW_VERSIONS;
    payouts = PREVIEW_PAYOUTS;
  }

  const trackTitle = (id: string) =>
    tracks.find((t) => t.id === id)?.title ?? "Unknown track";

  const ratePerStream = 0.0021;
  const streamsThisMonth = versions.reduce(
    (s, v) => s + (typeof v.stream_count === "number" ? v.stream_count : 0),
    0,
  );
  const accrual = streamsThisMonth * ratePerStream;

  const paidOut = payouts
    .filter((p) => (p.status ?? "").toLowerCase() === "paid")
    .reduce((s, p) => s + Number(p.amount ?? 0), 0);

  const pendingPayout = payouts
    .filter((p) => (p.status ?? "").toLowerCase() === "pending")
    .reduce((s, p) => s + Number(p.amount ?? 0), 0);

  const totalEarnedDisplay = paidOut + pendingPayout + accrual;

  const breakdown = versions.map((v) => {
    const streams = typeof v.stream_count === "number" ? v.stream_count : 0;
    const earned = streams * ratePerStream;
    return {
      track: trackTitle(v.track_id),
      scene: v.scene_slug,
      streams,
      rate: ratePerStream,
      earned,
    };
  });

  return (
    <div className="min-h-screen bg-surface text-cream">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.08] px-6 py-6 md:px-10">
        <div>
          <Link href="/dashboard" className="text-sm text-violet hover:underline">
            Dashboard
          </Link>
          <h1 className="mt-2 font-sans text-3xl font-bold">Earnings</h1>
        </div>
        <Link
          href="/upload"
          className="rounded-lg border border-white/[0.12] px-4 py-2 text-sm"
        >
          Upload
        </Link>
      </header>

      <main className="mx-auto max-w-6xl space-y-10 px-6 py-10 md:px-10">
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Total earned", value: gbp(totalEarnedDisplay) },
            {
              label: "Pending payout",
              value: gbp(pendingPayout > 0 ? pendingPayout : accrual),
            },
            { label: "Paid out", value: gbp(paidOut) },
            { label: "Streams this month", value: String(streamsThisMonth) },
          ].map((c) => (
            <div
              key={c.label}
              className="hairline-border rounded-xl border border-solid bg-card p-5"
            >
              <p className="text-xs uppercase tracking-wide text-cream/45">
                {c.label}
              </p>
              <p className="mt-2 text-2xl font-bold">{c.value}</p>
            </div>
          ))}
        </section>

        <section>
          <h2 className="font-sans text-xl font-bold">Track breakdown</h2>
          <div className="mt-4 overflow-x-auto rounded-xl border border-white/[0.08] bg-card">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-white/[0.08] text-cream/50">
                <tr>
                  <th className="px-4 py-3 font-normal">Track name</th>
                  <th className="px-4 py-3 font-normal">Scene</th>
                  <th className="px-4 py-3 font-normal">Streams</th>
                  <th className="px-4 py-3 font-normal">Rate</th>
                  <th className="px-4 py-3 font-normal">Earned</th>
                </tr>
              </thead>
              <tbody>
                {breakdown.length === 0 ? (
                  <tr>
                    <td className="px-4 py-6 text-cream/50" colSpan={5}>
                      No version data yet. Publish tracks to see earnings per
                      scene.
                    </td>
                  </tr>
                ) : (
                  breakdown.map((row, i) => (
                    <tr
                      key={`${row.track}-${row.scene}-${i}`}
                      className="border-b border-white/[0.06] last:border-0"
                    >
                      <td className="px-4 py-3">{row.track}</td>
                      <td className="px-4 py-3 text-cream/70">{row.scene}</td>
                      <td className="px-4 py-3 text-cream/70">{row.streams}</td>
                      <td className="px-4 py-3 text-cream/70">
                        {gbp(row.rate)} / stream
                      </td>
                      <td className="px-4 py-3">{gbp(row.earned)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="hairline-border rounded-xl border border-solid bg-card p-6">
          <h2 className="font-sans text-xl font-bold">Stripe Connect</h2>
          <p className="mt-2 text-sm text-cream/65">
            Connect your Stripe account to receive monthly payouts. Onboarding
            opens in a new window and returns you here when complete.
          </p>
          {!approved && user ? (
            <p className="mt-3 text-sm text-amber-200/90">
              Stripe Connect unlocks after curation approves your producer
              application.
            </p>
          ) : null}
          <div className="mt-4 flex flex-wrap gap-3">
            {approved ? (
              <a
                href="https://stripe.com/connect"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex rounded-lg bg-accent px-5 py-2.5 text-sm font-normal text-cream"
              >
                Stripe Connect onboarding
              </a>
            ) : (
              <span className="inline-flex cursor-not-allowed rounded-lg bg-white/10 px-5 py-2.5 text-sm font-normal text-cream/40">
                Stripe Connect onboarding
              </span>
            )}
            {stripeId ? (
              <span className="self-center text-xs text-cream/50">
                Connected account: {stripeId}
              </span>
            ) : null}
          </div>
        </section>

        <section>
          <h2 className="font-sans text-xl font-bold">Payout history</h2>
          <div className="mt-4 overflow-x-auto rounded-xl border border-white/[0.08] bg-card">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-white/[0.08] text-cream/50">
                <tr>
                  <th className="px-4 py-3 font-normal">Date</th>
                  <th className="px-4 py-3 font-normal">Period</th>
                  <th className="px-4 py-3 font-normal">Streams</th>
                  <th className="px-4 py-3 font-normal">Amount</th>
                  <th className="px-4 py-3 font-normal">Status</th>
                </tr>
              </thead>
              <tbody>
                {payouts.length === 0 ? (
                  <tr>
                    <td className="px-4 py-6 text-cream/50" colSpan={5}>
                      No payouts yet. They appear here after each monthly close.
                    </td>
                  </tr>
                ) : (
                  payouts.map((p) => (
                    <tr
                      key={p.id}
                      className="border-b border-white/[0.06] last:border-0"
                    >
                      <td className="px-4 py-3 text-cream/70">
                        {(p.created_at ?? "").slice(0, 10) || "—"}
                      </td>
                      <td className="px-4 py-3 text-cream/70">
                        {p.period_start && p.period_end
                          ? `${p.period_start} → ${p.period_end}`
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-cream/70">
                        {streamsThisMonth}
                      </td>
                      <td className="px-4 py-3">{gbp(Number(p.amount ?? 0))}</td>
                      <td className="px-4 py-3 capitalize text-cream/80">
                        {p.status ?? "pending"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
