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
    <section className="hero-glow surface-card space-y-6 px-6 py-8 sm:px-8">
      <div className="space-y-4">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-forest-soft)]">
          {eyebrow}
        </p>
        <h1 className="font-heading text-5xl leading-[0.95] text-[var(--color-pine)]">{title}</h1>
        <p className="max-w-3xl text-lg leading-8 text-[var(--color-forest-muted)]">{summary}</p>
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
      {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
    </section>
  );
}
