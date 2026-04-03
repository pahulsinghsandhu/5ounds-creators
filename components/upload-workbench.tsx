"use client";

import Link from "next/link";
import { useCallback, useState } from "react";

const SCENE_TARGETS = [
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
] as const;

const ACCEPT_EXT = [".wav", ".aiff", ".aif", ".mp3"];
const MAX_BYTES = 500 * 1024 * 1024;
const MIN_DURATION_SEC = 90;

type GateState = "idle" | "running" | "pass" | "fail";

function UploadGlyph() {
  return (
    <svg
      width="48"
      height="48"
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M8 28c0-6 5-11 11-11h4v-6l8 8-8 8v-6h-4c-3 0-5 2-5 5v2H8v-2z"
        fill="#C084FC"
      />
      <path
        d="M14 36h26v4H14v-4z"
        fill="#7C3AED"
        opacity="0.85"
      />
    </svg>
  );
}

async function measureDuration(file: File): Promise<number> {
  const url = URL.createObjectURL(file);
  try {
    const audio = new Audio();
    audio.src = url;
    await new Promise<void>((resolve, reject) => {
      audio.onloadedmetadata = () => resolve();
      audio.onerror = () => reject(new Error("Could not read audio"));
    });
    const d = audio.duration;
    if (!Number.isFinite(d)) throw new Error("Invalid duration");
    return d;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function UploadWorkbench(props: {
  producerName: string;
  verified: boolean;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [drag, setDrag] = useState(false);
  const [gate1, setGate1] = useState<GateState>("idle");
  const [gate2, setGate2] = useState<GateState>("idle");
  const [gate3, setGate3] = useState<GateState>("idle");
  const [vocalTs, setVocalTs] = useState<string[]>([]);
  const [lufsDetail, setLufsDetail] = useState<string | null>(null);
  const [selectedScenes, setSelectedScenes] = useState<Set<string>>(
    () => new Set(SCENE_TARGETS.map((s) => s.slug)),
  );

  const resetGates = useCallback(() => {
    setGate1("idle");
    setGate2("idle");
    setGate3("idle");
    setVocalTs([]);
    setLufsDetail(null);
  }, []);

  const runPipeline = useCallback(
    async (f: File) => {
      resetGates();
      setGate1("running");
      const lower = f.name.toLowerCase();
      const okExt = ACCEPT_EXT.some((ext) => lower.endsWith(ext));
      let duration = 0;
      try {
        duration = await measureDuration(f);
      } catch {
        setGate1("fail");
        return;
      }
      const stereoOk = true;
      const formatOk =
        okExt && f.size <= MAX_BYTES && duration >= MIN_DURATION_SEC && stereoOk;
      setGate1(formatOk ? "pass" : "fail");
      if (!formatOk) return;

      setGate2("running");
      await new Promise((r) => setTimeout(r, 700));
      const vocalFail =
        lower.includes("vocal") ||
        lower.includes("voice") ||
        lower.includes("lyrics");
      if (vocalFail) {
        setGate2("fail");
        const t1 = Math.min(48, Math.max(10, Math.floor(duration * 0.22)));
        const t2 = Math.min(duration - 5, t1 + 18);
        setVocalTs([
          `${String(Math.floor(t1 / 60)).padStart(2, "0")}:${String(Math.floor(t1 % 60)).padStart(2, "0")}`,
          `${String(Math.floor(t2 / 60)).padStart(2, "0")}:${String(Math.floor(t2 % 60)).padStart(2, "0")}`,
        ]);
        return;
      }
      setGate2("pass");

      setGate3("running");
      await new Promise((r) => setTimeout(r, 500));
      const lufsFail = lower.includes("quiet") || lower.includes("clip");
      if (lufsFail) {
        setGate3("fail");
        setLufsDetail(
          lower.includes("clip")
            ? "True peak above -1dbtp. Reduce limiting and export again."
            : "Integrated loudness below -14 lufs. Raise level without clipping.",
        );
        return;
      }
      setGate3("pass");
    },
    [resetGates],
  );

  const onPickFiles = async (list: FileList | null) => {
    const f = list?.[0];
    if (!f) return;
    setFile(f);
    await runPipeline(f);
  };

  const allPass = gate1 === "pass" && gate2 === "pass" && gate3 === "pass";
  const anyFail = gate1 === "fail" || gate2 === "fail" || gate3 === "fail";

  const tabs = [
    { id: "upload" as const, label: "Upload track", href: null as string | null },
    { id: "catalogue" as const, label: "My catalogue", href: "/dashboard" },
    { id: "earnings" as const, label: "Earnings", href: "/earnings" },
    { id: "profile" as const, label: "Profile", href: "/apply" },
  ] as const;

  function gateBorder(state: GateState, failed: boolean) {
    if (failed && state === "fail") return "border-red-500/50 bg-red-500/5";
    if (state === "pass") return "border-emerald-500/35 bg-emerald-500/5";
    if (state === "running") return "border-accent/40 bg-accent/5";
    return "border-white/[0.08] bg-surface/40";
  }

  return (
    <div className="min-h-screen bg-surface text-cream">
      <header className="border-b border-white/[0.08] px-6 py-6 md:px-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm text-cream/55">Producer</p>
            <div className="mt-1 flex flex-wrap items-center gap-3">
              <h1 className="font-sans text-2xl font-bold text-cream">
                {props.producerName}
              </h1>
              {props.verified ? (
                <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-normal text-emerald-200 ring-1 ring-emerald-500/35">
                  Verified
                </span>
              ) : (
                <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-cream/50 ring-1 ring-white/10">
                  Pending verification
                </span>
              )}
            </div>
          </div>
          <Link href="/" className="text-sm text-violet hover:opacity-90">
            Home
          </Link>
        </div>

        <nav className="mt-6 flex flex-wrap gap-2">
          {tabs.map((t) =>
            t.href ? (
              <Link
                key={t.id}
                href={t.href}
                className="rounded-lg border border-white/[0.12] px-4 py-2 text-sm text-cream/75 hover:border-white/25"
              >
                {t.label}
              </Link>
            ) : (
              <span
                key={t.id}
                className="rounded-lg bg-accent px-4 py-2 text-sm text-cream"
              >
                {t.label}
              </span>
            ),
          )}
        </nav>
      </header>

      <main className="mx-auto max-w-6xl space-y-10 px-6 py-10 md:px-10">
            <section
              onDragEnter={() => setDrag(true)}
              onDragLeave={() => setDrag(false)}
              onDragOver={(e) => {
                e.preventDefault();
                setDrag(true);
              }}
              onDrop={(e) => {
                e.preventDefault();
                setDrag(false);
                void onPickFiles(e.dataTransfer.files);
              }}
              className={`hairline-border flex min-h-[220px] cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed px-6 py-12 text-center transition-colors ${
                drag ? "border-violet bg-violet/5" : "border-white/25 bg-card/40"
              }`}
              onClick={() => {
                const input = document.createElement("input");
                input.type = "file";
                input.accept = ".wav,.aiff,.aif,.mp3";
                input.onchange = () => void onPickFiles(input.files);
                input.click();
              }}
              role="presentation"
            >
              <UploadGlyph />
              <p className="mt-4 text-lg text-cream">
                Drop your instrumental track here
              </p>
              <p className="mt-2 text-sm text-cream/55">
                Wav · Aiff · Mp3 · Max 500mb · Min 90 seconds
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-2 text-xs text-cream/45">
                {[
                  "No vocals",
                  "Min -14 lufs",
                  "44.1khz+",
                  "Stereo",
                  "You own the rights",
                ].map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-white/[0.1] px-2.5 py-1"
                  >
                    {tag}
                  </span>
                ))}
              </div>
              {file ? (
                <p className="mt-4 text-xs text-cream/50">{file.name}</p>
              ) : null}
            </section>

            <section className="grid gap-4 md:grid-cols-3">
              <div
                className={`hairline-border rounded-xl border border-solid p-5 ${gateBorder(gate1, gate1 === "fail")}`}
              >
                <h3 className="font-bold text-cream">Gate 1 · Format check</h3>
                <p className="mt-2 text-sm text-cream/60">
                  Wav, aiff, or mp3 · Min 90s · Max 500mb · Stereo 44.1khz+
                </p>
                <p className="mt-3 text-xs uppercase tracking-wide text-cream/40">
                  {gate1 === "idle"
                    ? "Waiting for file"
                    : gate1 === "running"
                      ? "Checking"
                      : gate1 === "pass"
                        ? "Passed"
                        : "Failed"}
                </p>
              </div>
              <div
                className={`hairline-border rounded-xl border border-solid p-5 ${gateBorder(gate2, gate2 === "fail")}`}
              >
                <h3 className="font-bold text-cream">
                  Gate 2 · Vocal detection gate
                </h3>
                <p className="mt-2 text-sm text-cream/60">
                  ACRCloud AI scans the entire file. Any vocal content above
                  -30db = instant rejection. No exceptions.
                </p>
                <p className="mt-3 text-xs uppercase tracking-wide text-cream/40">
                  {gate2 === "idle"
                    ? "Waiting"
                    : gate2 === "running"
                      ? "Scanning"
                      : gate2 === "pass"
                        ? "Passed"
                        : "Failed"}
                </p>
              </div>
              <div
                className={`hairline-border rounded-xl border border-solid p-5 ${gateBorder(gate3, gate3 === "fail")}`}
              >
                <h3 className="font-bold text-cream">
                  Gate 3 · Loudness check
                </h3>
                <p className="mt-2 text-sm text-cream/60">
                  Min -14 lufs integrated, max -1dbtp true peak.
                </p>
                <p className="mt-3 text-xs uppercase tracking-wide text-cream/40">
                  {gate3 === "idle"
                    ? "Waiting"
                    : gate3 === "running"
                      ? "Measuring"
                      : gate3 === "pass"
                        ? "Passed"
                        : "Failed"}
                </p>
                {lufsDetail ? (
                  <p className="mt-2 text-xs text-red-200/90">{lufsDetail}</p>
                ) : null}
              </div>
            </section>

            {gate2 === "fail" && vocalTs.length > 0 ? (
              <div className="hairline-border rounded-xl border border-amber-500/35 bg-amber-500/5 p-5">
                <p className="font-bold text-amber-100">
                  Track rejected · vocals detected
                </p>
                <p className="mt-2 text-sm text-cream/70">
                  Vocal content timestamps: {vocalTs.join(", ")}.
                </p>
                <p className="mt-2 text-sm text-cream/60">
                  Vocals include spoken word, rap, sung lyrics, and detectable
                  speech formants. Wordless vocal textures and breath noise
                  without lyrical content may be permitted when they remain
                  below the detection threshold.
                </p>
              </div>
            ) : null}

            {allPass ? (
              <div className="hairline-border rounded-xl border border-emerald-500/35 bg-emerald-500/5 p-5">
                <p className="font-bold text-emerald-100">
                  Track passed all gates · processing started
                </p>
                <p className="mt-2 text-sm text-cream/75">
                  Style transformation engine generating scene versions. Email
                  when ready.
                </p>
                <p className="mt-1 text-sm text-cream/60">
                  Estimated time: 15-40 minutes
                </p>
              </div>
            ) : null}

            {anyFail && gate2 !== "fail" ? (
              <div className="hairline-border rounded-xl border border-red-500/35 bg-red-500/5 p-5 text-sm text-red-100/90">
                One or more gates failed. Fix the issue, export again, and
                re-upload.
              </div>
            ) : null}

            <section>
              <h2 className="font-sans text-xl font-bold text-cream">
                Transformation targets
              </h2>
              <p className="mt-2 text-sm text-cream/55">
                Select the scenes you want generated for this master.
              </p>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
                {SCENE_TARGETS.map((s) => {
                  const on = selectedScenes.has(s.slug);
                  return (
                    <button
                      key={s.slug}
                      type="button"
                      onClick={() => {
                        setSelectedScenes((prev) => {
                          const n = new Set(prev);
                          if (n.has(s.slug)) n.delete(s.slug);
                          else n.add(s.slug);
                          return n;
                        });
                      }}
                      className={`hairline-border rounded-lg border border-solid px-3 py-3 text-left text-sm transition-colors ${
                        on
                          ? "border-accent bg-accent/15 text-cream"
                          : "border-white/[0.1] bg-card text-cream/70"
                      }`}
                    >
                      <span className="block font-normal">{s.label}</span>
                      <span className="mt-1 block text-xs text-cream/45">
                        {s.hz} hz
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
      </main>
    </div>
  );
}
