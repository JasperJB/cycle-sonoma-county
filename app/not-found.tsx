import Link from "next/link";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <PageShell className="items-center justify-center">
      <div className="surface-card max-w-xl space-y-4 p-8 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-forest-soft)]">
          404
        </p>
        <h1 className="font-heading text-4xl text-[var(--color-pine)] sm:text-5xl">
          Listing not found
        </h1>
        <p className="text-sm leading-7 text-[var(--color-forest-muted)]">
          The page may have moved, been unpublished, or never existed in this seeded demo.
        </p>
        <Button asChild className="rounded-2xl px-5">
          <Link href="/explore">Back to explore</Link>
        </Button>
      </div>
    </PageShell>
  );
}
