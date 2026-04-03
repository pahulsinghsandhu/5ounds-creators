import Link from "next/link";
import { AuthForm } from "@/components/auth-form";

export default function AuthPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-6 py-16">
      <div className="hairline-border w-full max-w-md rounded-xl border border-solid bg-card p-8 md:p-10">
        <Link
          href="/"
          className="flex flex-col items-center gap-1 text-violet transition-opacity hover:opacity-90"
        >
          <span className="font-sans text-3xl font-bold leading-none">
            &#8767;
          </span>
          <span className="font-sans text-2xl font-bold tracking-tight">
            5ounds
          </span>
        </Link>
        <p className="mt-6 text-center text-sm text-cream/60">
          Sign in to the creator portal or create a new account.
        </p>
        <AuthForm />
      </div>
    </div>
  );
}
