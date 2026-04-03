"use client";

import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Mode = "sign-in" | "sign-up";

function mapAuthError(message: string): string {
  const lower = message.toLowerCase();
  if (
    lower.includes("invalid login credentials") ||
    lower.includes("invalid_credentials")
  ) {
    return "Wrong email or password. Try again.";
  }
  if (lower.includes("user already registered")) {
    return "An account with this email already exists. Sign in instead.";
  }
  if (lower.includes("password")) {
    return message;
  }
  return "Something went wrong. Check your details and try again.";
}

export function AuthForm() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const supabase = createBrowserSupabaseClient();
      if (mode === "sign-in") {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (signInError) {
          setError(mapAuthError(signInError.message));
          return;
        }
      } else {
        const { error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
        });
        if (signUpError) {
          setError(mapAuthError(signUpError.message));
          return;
        }
      }
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setError(mapAuthError(msg));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8 space-y-5">
      <div>
        <label
          htmlFor="email"
          className="block text-sm font-medium text-cream/80"
        >
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-2 w-full rounded-lg border border-white/[0.12] bg-surface px-3 py-2.5 text-cream outline-none ring-accent focus:ring-1"
        />
      </div>
      <div>
        <label
          htmlFor="password"
          className="block text-sm font-medium text-cream/80"
        >
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete={
            mode === "sign-in" ? "current-password" : "new-password"
          }
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-2 w-full rounded-lg border border-white/[0.12] bg-surface px-3 py-2.5 text-cream outline-none ring-accent focus:ring-1"
        />
      </div>

      {error ? (
        <p
          role="alert"
          className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200"
        >
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-accent py-3 text-sm font-medium text-cream transition-opacity disabled:opacity-60"
      >
        {loading
          ? "Please wait"
          : mode === "sign-in"
            ? "Sign in"
            : "Create account"}
      </button>

      <p className="text-center text-sm text-cream/55">
        {mode === "sign-in" ? (
          <>
            No account?{" "}
            <button
              type="button"
              className="text-violet underline-offset-2 hover:underline"
              onClick={() => {
                setMode("sign-up");
                setError(null);
              }}
            >
              Create account
            </button>
          </>
        ) : (
          <>
            Already registered?{" "}
            <button
              type="button"
              className="text-violet underline-offset-2 hover:underline"
              onClick={() => {
                setMode("sign-in");
                setError(null);
              }}
            >
              Sign in
            </button>
          </>
        )}
      </p>
    </form>
  );
}
