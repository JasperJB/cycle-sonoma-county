import Link from "next/link";
import { Coffee } from "lucide-react";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { footerExploreLinks, publicSecondaryNav, supportLink } from "@/lib/site";

export function SiteFooter() {
  return (
    <footer className="border-t border-[color:var(--color-border-soft)] bg-[color:var(--color-paper-strong)]">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1.2fr_1fr] lg:px-8">
        <div className="space-y-4">
          <Logo />
          <p className="max-w-xl text-sm leading-7 text-[var(--color-forest-muted)]">
            Trusted local cycling intel for Sonoma County. Browse rides, race events,
            route ideas, shops and services, and visitor-friendly recommendations without
            digging through five different social feeds.
          </p>
          <p className="text-xs uppercase tracking-[0.24em] text-[var(--color-forest-soft)]">
            Community-driven. Ad-free. Built for riders.
          </p>
          <div className="surface-card max-w-md space-y-3 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-forest-soft)]">
              Support Cycle Sonoma County
            </p>
            <p className="text-sm leading-6 text-[var(--color-forest-muted)]">
              If the site helps you find rides and local spots, chip in to keep it running.
            </p>
            <Button asChild size="sm" className="rounded-xl px-4">
              <a href={supportLink} target="_blank" rel="noreferrer">
                Buy me a coffee
                <Coffee />
              </a>
            </Button>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <p className="text-sm font-semibold text-[var(--color-pine)]">Explore</p>
            {footerExploreLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="block text-sm text-[var(--color-forest-muted)] transition hover:text-[var(--color-pine)]"
              >
                {item.label}
              </Link>
            ))}
          </div>
          <div className="space-y-2">
            <p className="text-sm font-semibold text-[var(--color-pine)]">Site</p>
            {publicSecondaryNav
              .filter((item) => item.href !== "/visitors")
              .map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="block text-sm text-[var(--color-forest-muted)] transition hover:text-[var(--color-pine)]"
                >
                  {item.label}
                </Link>
              ))}
          </div>
          <div className="space-y-2">
            <p className="text-sm font-semibold text-[var(--color-pine)]">Organizer tools</p>
            <Link
              href="/become-organizer"
              className="block text-sm text-[var(--color-forest-muted)] transition hover:text-[var(--color-pine)]"
            >
              Become an organizer
            </Link>
            <Link
              href="/organizer"
              className="block text-sm text-[var(--color-forest-muted)] transition hover:text-[var(--color-pine)]"
            >
              Organizer console
            </Link>
            <Link
              href="/admin"
              className="block text-sm text-[var(--color-forest-muted)] transition hover:text-[var(--color-pine)]"
            >
              Admin console
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
