"use client";

import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { COUNTRY_OPTIONS } from "@/lib/countries";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

const ACCEPT_EXT = [".wav", ".aiff", ".aif", ".mp3"];
const MAX_BYTES = 500 * 1024 * 1024;
const MIN_DURATION_SEC = 90;

type ProducerRow = {
  id: string;
  user_id: string | null;
  name: string;
  real_name: string;
  country: string;
  pro_affiliation: string | null;
  status: string | null;
  stripe_account_id: string | null;
};

type VocalResult =
  | { pass: true }
  | { pass: false; at: string; reason: string };

type SampleFile = {
  id: string;
  file: File;
  durationSec: number | null;
  vocal: VocalResult | null;
  scanning: boolean;
};

function formatTs(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

async function measureDuration(file: File): Promise<number> {
  const url = URL.createObjectURL(file);
  try {
    const audio = new Audio();
    audio.src = url;
    await new Promise<void>((resolve, reject) => {
      audio.onloadedmetadata = () => resolve();
      audio.onerror = () => reject(new Error("Could not read audio duration"));
    });
    const d = audio.duration;
    if (!Number.isFinite(d)) throw new Error("Invalid duration");
    return d;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function mockVocalScan(file: File, durationSec: number): VocalResult {
  const name = file.name.toLowerCase();
  if (name.includes("vocal") || name.includes("voice")) {
    const at = Math.min(42, Math.max(12, Math.floor(durationSec * 0.35)));
    return {
      pass: false,
      at: formatTs(at),
      reason:
        "Vocal content above -30db detected. Spoken or sung lyrics are not permitted.",
    };
  }
  return { pass: true };
}

function stepBadge(complete: boolean, label: string) {
  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
        complete
          ? "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30"
          : "bg-white/5 text-cream/50 ring-1 ring-white/10"
      }`}
    >
      {complete ? "Complete" : label}
    </span>
  );
}

export function ApplyWizard() {
  const [userId, setUserId] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [producer, setProducer] = useState<ProducerRow | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [producerName, setProducerName] = useState("");
  const [realName, setRealName] = useState("");
  const [country, setCountry] = useState(COUNTRY_OPTIONS[0] ?? "");
  const [proAffiliation, setProAffiliation] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);

  const [samples, setSamples] = useState<SampleFile[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [sampleError, setSampleError] = useState<string | null>(null);
  const [savingSamples, setSavingSamples] = useState(false);

  const [stripeAccountId, setStripeAccountId] = useState("");
  const [savingStripe, setSavingStripe] = useState(false);

  const refreshProducer = useCallback(async (uid: string) => {
    const supabase = createBrowserSupabaseClient();
    const { data, error } = await supabase
      .from("producers")
      .select("*")
      .eq("user_id", uid)
      .maybeSingle();
    if (error) {
      setLoadError(error.message);
      return;
    }
    if (data) {
      const row = data as ProducerRow;
      setProducer(row);
      setProducerName(row.name);
      setRealName(row.real_name);
      setCountry(row.country);
      setProAffiliation(row.pro_affiliation ?? "");
      setStripeAccountId(row.stripe_account_id ?? "");
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const supabase = createBrowserSupabaseClient();
        const { data } = await supabase.auth.getUser();
        const uid = data.user?.id ?? null;
        if (cancelled) return;
        setUserId(uid);
        if (uid) await refreshProducer(uid);
      } catch (e) {
        if (!cancelled) {
          setLoadError(e instanceof Error ? e.message : "Could not load session");
        }
      } finally {
        if (!cancelled) setAuthChecked(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshProducer]);

  const step1Complete = Boolean(
    producer?.name && producer?.real_name && producer?.country,
  );

  const step2Complete =
    samples.length === 3 &&
    samples.every(
      (s) =>
        s.durationSec !== null &&
        s.durationSec >= MIN_DURATION_SEC &&
        s.vocal?.pass === true,
    );

  const reviewStatus = producer?.status ?? "pending";
  const curationApproved = reviewStatus === "approved" || reviewStatus === "verified";
  const stripeDone = Boolean(producer?.stripe_account_id);
  const step5Unlocked = curationApproved && stripeDone;

  const addFiles = async (list: FileList | File[]) => {
    setSampleError(null);
    const arr = Array.from(list);
    const startLen = samples.length;
    const next = [...samples];
    for (const file of arr) {
      if (next.length >= 3) break;
      const lower = file.name.toLowerCase();
      const okExt = ACCEPT_EXT.some((ext) => lower.endsWith(ext));
      if (!okExt) {
        setSampleError("Only wav, aiff, or mp3 files are accepted.");
        return;
      }
      if (file.size > MAX_BYTES) {
        setSampleError("Each file must be 500mb or smaller.");
        return;
      }
      let durationSec: number;
      try {
        durationSec = await measureDuration(file);
      } catch {
        setSampleError("Could not read duration. Try another export.");
        return;
      }
      if (durationSec < MIN_DURATION_SEC) {
        setSampleError("Each track must be at least 90 seconds.");
        return;
      }
      const id =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random()}`;
      next.push({
        id,
        file,
        durationSec,
        vocal: null,
        scanning: true,
      });
    }
    setSamples(next);
    const added = next.slice(startLen);
    for (const s of added) {
      await new Promise((r) => setTimeout(r, 600));
      const vocal = mockVocalScan(s.file, s.durationSec ?? 0);
      setSamples((prev) =>
        prev.map((p) =>
          p.id === s.id ? { ...p, vocal, scanning: false } : p,
        ),
      );
    }
  };

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setProfileMessage(null);
    if (!userId) return;
    setSavingProfile(true);
    try {
      const supabase = createBrowserSupabaseClient();
      if (producer) {
        const { error } = await supabase
          .from("producers")
          .update({
            name: producerName.trim(),
            real_name: realName.trim(),
            country,
            pro_affiliation: proAffiliation.trim() || null,
          })
          .eq("id", producer.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("producers")
          .insert({
            user_id: userId,
            name: producerName.trim(),
            real_name: realName.trim(),
            country,
            pro_affiliation: proAffiliation.trim() || null,
            status: "pending",
          })
          .select("*")
          .single();
        if (error) throw error;
        setProducer(data as ProducerRow);
      }
      await refreshProducer(userId);
      setProfileMessage("Producer profile saved.");
    } catch (err) {
      setProfileMessage(
        err instanceof Error ? err.message : "Could not save profile.",
      );
    } finally {
      setSavingProfile(false);
    }
  }

  async function submitSamples() {
    if (!producer || !userId) return;
    setSavingSamples(true);
    setSampleError(null);
    try {
      const supabase = createBrowserSupabaseClient();
      const { error } = await supabase
        .from("producers")
        .update({ status: "in_review" })
        .eq("id", producer.id);
      if (error) throw error;
      await refreshProducer(userId);
    } catch (err) {
      setSampleError(
        err instanceof Error ? err.message : "Could not submit samples.",
      );
    } finally {
      setSavingSamples(false);
    }
  }

  async function saveStripe() {
    if (!producer || !userId) return;
    setSavingStripe(true);
    try {
      const supabase = createBrowserSupabaseClient();
      const { error } = await supabase
        .from("producers")
        .update({
          stripe_account_id: stripeAccountId.trim() || null,
          status: stripeAccountId.trim() ? "verified" : producer.status,
        })
        .eq("id", producer.id);
      if (error) throw error;
      await refreshProducer(userId);
    } finally {
      setSavingStripe(false);
    }
  }

  const steps = useMemo(
    () => [
      { n: 1, title: "Create producer account" },
      { n: 2, title: "Submit 3 sample tracks" },
      { n: 3, title: "Curation team review" },
      { n: 4, title: "Connect Stripe" },
      { n: 5, title: "Verified producer" },
    ],
    [],
  );

  if (!authChecked) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-20 text-center text-cream/60">
        Loading application
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="mx-auto max-w-lg px-6 py-20 text-center">
        <p className="text-cream/80">
          Sign in to start your producer application.
        </p>
        <Link
          href="/auth"
          className="mt-6 inline-flex rounded-lg bg-accent px-6 py-3 text-sm font-medium text-cream"
        >
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-12 md:py-16">
      {loadError ? (
        <p className="mb-6 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          {loadError}
        </p>
      ) : null}

      <ol className="space-y-10">
        {steps.map((s) => (
          <li
            key={s.n}
            className="hairline-border rounded-xl border border-solid bg-card p-6 md:p-8"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-display text-xl italic text-cream">
                Step {s.n} &mdash; {s.title}
              </h2>
              {s.n === 1
                ? stepBadge(step1Complete, "Incomplete")
                : s.n === 2
                  ? stepBadge(step2Complete, "Incomplete")
                  : s.n === 5
                    ? stepBadge(step5Unlocked, step5Unlocked ? "Complete" : "Locked")
                    : null}
            </div>

            {s.n === 1 ? (
              <form onSubmit={saveProfile} className="mt-6 space-y-4">
                <div>
                  <label className="text-sm text-cream/70" htmlFor="pname">
                    Producer name
                  </label>
                  <input
                    id="pname"
                    required
                    value={producerName}
                    onChange={(e) => setProducerName(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-white/[0.12] bg-surface px-3 py-2.5 text-cream outline-none ring-accent focus:ring-1"
                  />
                </div>
                <div>
                  <label className="text-sm text-cream/70" htmlFor="rname">
                    Real name
                  </label>
                  <input
                    id="rname"
                    required
                    value={realName}
                    onChange={(e) => setRealName(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-white/[0.12] bg-surface px-3 py-2.5 text-cream outline-none ring-accent focus:ring-1"
                  />
                </div>
                <div>
                  <label className="text-sm text-cream/70" htmlFor="country">
                    Country
                  </label>
                  <select
                    id="country"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-white/[0.12] bg-surface px-3 py-2.5 text-cream outline-none ring-accent focus:ring-1"
                  >
                    {COUNTRY_OPTIONS.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm text-cream/70" htmlFor="pro">
                    Pro affiliation (optional)
                  </label>
                  <input
                    id="pro"
                    value={proAffiliation}
                    onChange={(e) => setProAffiliation(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-white/[0.12] bg-surface px-3 py-2.5 text-cream outline-none ring-accent focus:ring-1"
                  />
                </div>
                {profileMessage ? (
                  <p className="text-sm text-cream/60">{profileMessage}</p>
                ) : null}
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-cream disabled:opacity-60"
                >
                  {savingProfile ? "Saving" : "Save and continue"}
                </button>
              </form>
            ) : null}

            {s.n === 2 ? (
              <div className="mt-6">
                {!step1Complete ? (
                  <p className="text-sm text-cream/50">
                    Complete step 1 before uploading samples.
                  </p>
                ) : (
                  <>
                    <div
                      role="button"
                      tabIndex={0}
                      onDragEnter={() => setDragActive(true)}
                      onDragLeave={() => setDragActive(false)}
                      onDragOver={(e) => {
                        e.preventDefault();
                        setDragActive(true);
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        setDragActive(false);
                        void addFiles(e.dataTransfer.files);
                      }}
                      className={`flex min-h-[180px] cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed px-4 py-10 text-center transition-colors ${
                        dragActive
                          ? "border-violet bg-violet/5"
                          : "border-white/20 bg-surface/40"
                      }`}
                      onClick={() => {
                        const input = document.createElement("input");
                        input.type = "file";
                        input.multiple = true;
                        input.accept = ".wav,.aiff,.aif,.mp3,audio/wav,audio/aiff,audio/mpeg";
                        input.onchange = () => {
                          if (input.files) void addFiles(input.files);
                        };
                        input.click();
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          (e.target as HTMLElement).click();
                        }
                      }}
                    >
                      <p className="font-medium text-cream">
                        Drag and drop up to 3 sample tracks
                      </p>
                      <p className="mt-2 text-sm text-cream/55">
                        Wav, aiff, or mp3. Max 500mb per file. Min 90 seconds.
                      </p>
                      <p className="mt-2 text-xs text-cream/40">
                        Vocal detection runs automatically on upload.
                      </p>
                    </div>
                    {sampleError ? (
                      <p className="mt-3 text-sm text-red-300">{sampleError}</p>
                    ) : null}
                    <ul className="mt-6 space-y-3">
                      {samples.map((s) => (
                        <li
                          key={s.id}
                          className="hairline-border rounded-lg border border-solid bg-surface/60 px-4 py-3"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="text-sm text-cream">
                              {s.file.name}
                            </span>
                            {s.scanning ? (
                              <span className="text-xs text-cream/50">
                                Scanning
                              </span>
                            ) : s.vocal?.pass ? (
                              <span className="text-xs font-medium text-emerald-300">
                                Passed vocal gate
                              </span>
                            ) : s.vocal && !s.vocal.pass ? (
                              <span className="text-xs font-medium text-red-300">
                                Rejected
                              </span>
                            ) : null}
                          </div>
                          {s.vocal && !s.vocal.pass ? (
                            <p className="mt-2 text-xs text-red-200/90">
                              {s.vocal.at} &mdash; {s.vocal.reason}
                            </p>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                    <button
                      type="button"
                      disabled={
                        !step2Complete || savingSamples || reviewStatus === "in_review"
                      }
                      onClick={() => void submitSamples()}
                      className="mt-6 rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-cream disabled:opacity-40"
                    >
                      {reviewStatus === "in_review"
                        ? "Samples submitted"
                        : savingSamples
                          ? "Submitting"
                          : "Submit samples for review"}
                    </button>
                  </>
                )}
              </div>
            ) : null}

            {s.n === 3 ? (
              <div className="mt-6 space-y-3 text-sm text-cream/70">
                <p className="inline-flex rounded-full bg-accent/15 px-3 py-1 text-xs font-medium text-violet ring-1 ring-accent/30">
                  {reviewStatus === "in_review"
                    ? "In review"
                    : reviewStatus === "approved" || reviewStatus === "verified"
                      ? "Approved"
                      : "Pending samples"}
                </p>
                <p>
                  2-5 working days. Email notification either way.
                </p>
                <p className="text-cream/45">
                  Stripe unlocks only after the curation team marks your
                  application as approved.
                </p>
              </div>
            ) : null}

            {s.n === 4 ? (
              <div className="mt-6 space-y-4">
                {!curationApproved ? (
                  <p className="text-sm text-cream/50">
                    Locked until step 3 is approved by the curation team.
                  </p>
                ) : (
                  <>
                    <p className="text-sm text-cream/70">
                      Complete Stripe Connect onboarding, then paste your
                      connected account id below so payouts can be routed.
                    </p>
                    <a
                      href="https://stripe.com/connect"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-cream"
                    >
                      Open Stripe Connect
                    </a>
                    <div>
                      <label
                        className="text-sm text-cream/70"
                        htmlFor="stripeId"
                      >
                        Stripe connected account id
                      </label>
                      <input
                        id="stripeId"
                        value={stripeAccountId}
                        onChange={(e) => setStripeAccountId(e.target.value)}
                        placeholder="acct_..."
                        className="mt-1 w-full rounded-lg border border-white/[0.12] bg-surface px-3 py-2.5 text-cream outline-none ring-accent focus:ring-1"
                      />
                    </div>
                    <button
                      type="button"
                      disabled={savingStripe || !stripeAccountId.trim()}
                      onClick={() => void saveStripe()}
                      className="rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-cream disabled:opacity-40"
                    >
                      {savingStripe ? "Saving" : "Save Stripe account"}
                    </button>
                  </>
                )}
              </div>
            ) : null}

            {s.n === 5 ? (
              <div className="mt-6">
                {!step5Unlocked ? (
                  <p className="text-sm text-cream/50">
                    Locked until step 4 is complete with a saved Stripe account
                    id.
                  </p>
                ) : (
                  <div className="space-y-2 text-sm text-cream/80">
                    <p className="text-base font-medium text-cream">
                      Verified producer
                    </p>
                    <p>
                      Full upload access is unlocked in the dashboard. Upload
                      pipeline and catalogue tools are available from the main
                      navigation.
                    </p>
                    <Link
                      href="/upload"
                      className="mt-4 inline-flex rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-cream"
                    >
                      Go to upload
                    </Link>
                  </div>
                )}
              </div>
            ) : null}
          </li>
        ))}
      </ol>
    </div>
  );
}
