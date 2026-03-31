import { SignUpForm } from "@/components/forms/signup-form";
import { PageShell, SectionHeading } from "@/components/page-shell";

export default function SignUpPage() {
  return (
    <PageShell className="justify-center py-12">
      <section className="grid gap-8 lg:grid-cols-[1fr_0.92fr] lg:items-center">
        <div className="space-y-6">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--color-forest-soft)]">
            Join the network
          </p>
          <h1 className="font-heading text-5xl leading-tight text-[var(--color-pine)] sm:text-6xl">
            Create a local account for rides, routes, and organizer tools.
          </h1>
          <p className="max-w-2xl text-base leading-7 text-[var(--color-forest-muted)]">
            Public browsing stays open to everyone. Your account unlocks favorites,
            organizer applications, and a personal Sonoma County cycling home base.
          </p>
        </div>
        <div className="surface-card space-y-6 p-8 sm:p-10">
          <SectionHeading
            eyebrow="New account"
            title="Sign up"
            description="Create your account with your real name so organizers and admins can verify local submissions cleanly."
          />
          <SignUpForm />
        </div>
      </section>
    </PageShell>
  );
}
