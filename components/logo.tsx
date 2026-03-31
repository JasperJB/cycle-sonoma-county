import Link from "next/link";
import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      className={cn("inline-flex items-center gap-3 font-heading text-base font-semibold tracking-tight", className)}
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/40 bg-white/70 shadow-sm backdrop-blur">
        <span className="text-xl leading-none text-[var(--color-pine)]">C</span>
      </span>
      <span className="flex flex-col leading-tight">
        <span className="text-[0.72rem] uppercase tracking-[0.2em] text-[var(--color-forest-muted)]">
          Sonoma County
        </span>
        <span className="text-lg text-[var(--color-pine)]">Cycle Sonoma County</span>
      </span>
    </Link>
  );
}
