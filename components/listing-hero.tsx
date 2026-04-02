import { Badge } from "@/components/ui/badge";

export function ListingHero({
  eyebrow,
  title,
  summary,
  location,
  badges,
  actions,
}: {
  eyebrow: string;
  title: string;
  summary: string;
  location?: string;
  badges?: string[];
  actions?: React.ReactNode;
}) {
  return (
    <section className="hero-glow surface-card min-w-0 space-y-5 px-5 py-6 sm:px-8 sm:py-8">
      <div className="space-y-4">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-forest-soft)]">
          {eyebrow}
        </p>
        <h1 className="break-words font-heading text-4xl leading-[0.95] text-[var(--color-pine)] sm:text-5xl lg:text-6xl">
          {title}
        </h1>
        <p className="max-w-3xl break-words text-base leading-7 text-[var(--color-forest-muted)] sm:text-lg sm:leading-8">
          {summary}
        </p>
        <div className="flex flex-wrap gap-2">
          {location ? (
            <Badge className="rounded-full bg-white/80 text-[var(--color-pine)]">{location}</Badge>
          ) : null}
          {badges?.map((badge) => (
            <Badge
              key={badge}
              variant="secondary"
              className="rounded-full border border-[color:var(--color-border-soft)] bg-white/80 text-[var(--color-pine)]"
            >
              {badge}
            </Badge>
          ))}
        </div>
      </div>
      {actions ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap [&_[data-slot=button]]:w-full sm:[&_[data-slot=button]]:w-auto">
          {actions}
        </div>
      ) : null}
    </section>
  );
}
