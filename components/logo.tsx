import Link from "next/link";
import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      className={cn(
        "inline-flex min-w-0 items-center gap-2 font-heading text-base font-semibold tracking-tight sm:gap-3",
        className,
      )}
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/40 bg-white/70 shadow-sm backdrop-blur">
        <span className="text-xl leading-none text-[var(--color-pine)]">C</span>
      </span>
      <span className="flex min-w-0 flex-col leading-tight">
        <span className="text-[0.72rem] uppercase tracking-[0.2em] text-[var(--color-forest-muted)]">
          Sonoma County
        </span>
        <span className="max-w-[11rem] truncate text-base text-[var(--color-pine)] sm:max-w-none sm:text-lg">
          Cycle Sonoma County
        </span>
      </span>
    </Link>
  );
}
