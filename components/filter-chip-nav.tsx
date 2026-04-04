import Link from "next/link";
import { cn } from "@/lib/utils";

type FilterChipItem = {
  href: string;
  label: string;
  active?: boolean;
};

export function FilterChipNav({
  items,
  ariaLabel,
}: {
  items: FilterChipItem[];
  ariaLabel: string;
}) {
  return (
    <nav aria-label={ariaLabel} className="overflow-x-auto">
      <div className="flex min-w-max flex-wrap gap-2 pb-1">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            aria-current={item.active ? "page" : undefined}
            className={cn(
              "rounded-full border px-3 py-1.5 text-sm font-medium transition",
              item.active
                ? "border-[var(--color-clay)]/40 bg-white text-[var(--color-pine)] shadow-[0_10px_24px_-18px_rgba(24,58,45,0.55)]"
                : "border-[color:var(--color-border-soft)] bg-white/70 text-[var(--color-forest-muted)] hover:border-[var(--color-clay)]/30 hover:text-[var(--color-pine)]",
            )}
          >
            {item.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
