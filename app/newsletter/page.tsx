import { NewsletterForm } from "@/components/forms/newsletter-form";
import { PageShell, SectionHeading } from "@/components/page-shell";

export default function NewsletterPage() {
  return (
    <PageShell className="gap-8">
      <SectionHeading
        eyebrow="Newsletter"
        title="One county-wide cycling digest"
        description="No per-organization mailing lists, no ad clutter, and no noisy daily blasts. Just one useful digest for Sonoma County riders."
      />
      <section className="surface-card max-w-3xl space-y-6 p-6 sm:p-8">
        <div className="space-y-3">
          <h2 className="font-heading text-3xl text-[var(--color-pine)]">
            What lands in the email
          </h2>
          <ul className="space-y-2 text-sm leading-7 text-[var(--color-forest-muted)]">
            <li>Upcoming rides and events pulled from current site data.</li>
            <li>Featured route ideas for visitors and locals.</li>
            <li>Manual sponsor placements chosen by the admin.</li>
            <li>Dry-run mode preview support when no email provider is configured.</li>
          </ul>
        </div>
        <NewsletterForm source="newsletter-page" />
      </section>
    </PageShell>
  );
}
