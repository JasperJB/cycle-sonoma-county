import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function ContentCard({
  href,
  title,
  summary,
  eyebrow,
  meta,
  badges,
  className,
}: {
  href: string;
  title: string;
  summary: string;
  eyebrow?: string;
  meta?: string;
  badges?: string[];
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "surface-card group flex h-full flex-col gap-4 p-5 transition duration-200 hover:-translate-y-0.5 hover:border-[color:var(--color-clay)]/30 hover:shadow-[0_22px_70px_-35px_rgba(24,58,45,0.4)]",
        className,
      )}
    >
      <div className="space-y-2">
        {eyebrow ? (
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-forest-soft)]">
            {eyebrow}
          </p>
        ) : null}
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-heading text-2xl leading-tight text-[var(--color-pine)]">
            {title}
          </h3>
          <ArrowUpRight className="mt-1 h-4 w-4 shrink-0 text-[var(--color-forest-soft)] transition group-hover:text-[var(--color-clay)]" />
        </div>
      </div>
      <p className="text-sm leading-6 text-[var(--color-forest-muted)]">{summary}</p>
      {meta ? (
        <p className="text-sm font-medium text-[var(--color-pine)]">{meta}</p>
      ) : null}
      {badges?.length ? (
        <div className="mt-auto flex flex-wrap gap-2">
          {badges.map((badge) => (
            <Badge
              key={badge}
              variant="secondary"
              className="border border-[color:var(--color-border-soft)] bg-white/70 text-[var(--color-pine)]"
            >
              {badge}
            </Badge>
          ))}
        </div>
      ) : null}
    </Link>
  );
}

export function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="surface-card flex flex-col items-start gap-3 p-6">
      <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[var(--color-forest-soft)]">
        Nothing here yet
      </p>
      <h3 className="font-heading text-2xl text-[var(--color-pine)]">{title}</h3>
      <p className="max-w-2xl text-sm leading-6 text-[var(--color-forest-muted)]">
        {description}
      </p>
    </div>
  );
}
