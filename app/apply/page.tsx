import Link from "next/link";
import { ApplyWizard } from "@/components/apply-wizard";

export default function ApplyPage() {
  return (
    <div className="min-h-screen bg-surface text-cream">
      <header className="flex items-center justify-between px-6 py-6 md:px-10">
        <Link
          href="/"
          className="flex items-baseline gap-2 text-violet transition-opacity hover:opacity-90"
        >
          <span className="font-sans text-2xl font-bold leading-none">
            &#8767;
          </span>
          <span className="font-sans text-xl font-bold tracking-tight">
            5ounds
          </span>
        </Link>
        <Link
          href="/dashboard"
          className="text-sm text-cream/70 hover:text-cream"
        >
          Dashboard
        </Link>
      </header>
      <ApplyWizard />
    </div>
  );
}
