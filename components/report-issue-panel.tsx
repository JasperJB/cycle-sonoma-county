import { ReportForm } from "@/components/forms/report-form";

export function ReportIssuePanel({
  targetId,
  targetType,
}: {
  targetId: string;
  targetType: "SHOP" | "CLUB" | "RIDE" | "EVENT" | "ROUTE";
}) {
  return (
    <aside className="rounded-[1.25rem] border border-[color:var(--color-border-soft)] bg-[color:rgba(255,255,255,0.52)] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.5)]">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-forest-soft)]">
          Secondary action
        </p>
        <h2 className="font-heading text-2xl text-[var(--color-pine)]">Report incorrect info</h2>
        <p className="text-sm leading-6 text-[var(--color-forest-muted)]">
          Spot something outdated or wrong? Send a correction for review.
        </p>
      </div>
      <div className="mt-5 border-t border-[color:var(--color-border-soft)] pt-5">
        <ReportForm targetId={targetId} targetType={targetType} />
      </div>
    </aside>
  );
}
