import { PageShell, SectionHeading } from "@/components/page-shell";

export default function AboutPage() {
  return (
    <PageShell className="gap-8">
      <SectionHeading
        eyebrow="About / Contact"
        title="A county-scale cycling directory built to be useful"
        description="Cycle Sonoma County is designed as a trusted local product rather than a generic events feed. Visitors can browse without logging in, organizers can apply for verification, and admins keep the data current."
      />
      <section className="grid gap-5 lg:grid-cols-2">
        <div className="surface-card space-y-4 p-6">
          <h2 className="font-heading text-3xl text-[var(--color-pine)]">What the site does</h2>
          <ul className="space-y-2 text-sm leading-7 text-[var(--color-forest-muted)]">
            <li>Separates recurring rides from events so the schedule reads clearly.</li>
            <li>Supports verified organizers, lightweight onboarding, and draft-first publishing.</li>
            <li>Gives visitors route guides, rental-friendly shops, and beginner-ready recommendations.</li>
            <li>Keeps sponsor infrastructure internal and manual, without payments or ad networks.</li>
          </ul>
        </div>
        <div className="surface-card space-y-4 p-6">
          <h2 className="font-heading text-3xl text-[var(--color-pine)]">Contact</h2>
          <p className="text-sm leading-7 text-[var(--color-forest-muted)]">
            For organizer verification, corrections, or editorial questions, use the
            organizer flow inside the product or reach out to{" "}
            <a className="font-medium text-[var(--color-pine)]" href="mailto:hello@cyclesonoma.demo">
              hello@cyclesonoma.demo
            </a>.
          </p>
        </div>
      </section>
    </PageShell>
  );
}
