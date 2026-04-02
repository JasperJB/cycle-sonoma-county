import { cn } from "@/lib/utils";

export function PageShell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <main
      className={cn(
        "mx-auto flex w-full max-w-7xl min-w-0 flex-1 flex-col px-4 py-6 sm:px-6 sm:py-8 lg:px-8",
        className,
      )}
    >
      {children}
    </main>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="space-y-3">
      {eyebrow ? (
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--color-forest-soft)]">
          {eyebrow}
        </p>
      ) : null}
      <h2 className="break-words font-heading text-2xl leading-tight text-[var(--color-pine)] sm:text-3xl lg:text-4xl">
        {title}
      </h2>
      {description ? (
        <p className="max-w-3xl text-base leading-7 text-[var(--color-forest-muted)]">
          {description}
        </p>
      ) : null}
    </div>
  );
}
