import { NewsletterForm } from "@/components/forms/newsletter-form";
import { PageShell, SectionHeading } from "@/components/page-shell";

export default function NewsletterPage() {
  return (
    <PageShell className="gap-8">
      <SectionHeading
        eyebrow="Newsletter"
        title="One Sonoma County cycling email"
        description="A simple weekly roundup for local riders."
      />
      <section className="surface-card max-w-3xl space-y-6 p-6 sm:p-8">
        <div className="space-y-3">
          <h2 className="font-heading text-3xl text-[var(--color-pine)]">
            What you get
          </h2>
          <ul className="space-y-2 text-sm leading-7 text-[var(--color-forest-muted)]">
            <li>Upcoming rides and events from around the county.</li>
            <li>Featured route ideas.</li>
            <li>Occasional sponsor spots.</li>
            <li>No daily churn.</li>
          </ul>
        </div>
        <NewsletterForm source="newsletter-page" />
      </section>
    </PageShell>
  );
}
