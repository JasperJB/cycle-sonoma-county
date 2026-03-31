import Link from "next/link";
import { VerificationRequestForm } from "@/components/forms/verification-request-form";
import { PageShell, SectionHeading } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth/user";

export default async function BecomeOrganizerPage() {
  const user = await getCurrentUser();
  const latestRequest = user?.verificationRequests[0];

  return (
    <PageShell className="gap-8">
      <SectionHeading
        eyebrow="Organizer verification"
        title="Apply for organizer access"
        description="Only verified organizers can publish or edit public listings. Approval unlocks organizer tools and the lightweight onboarding wizard."
      />
      {!user ? (
        <div className="surface-card max-w-2xl space-y-4 p-6">
          <p className="text-sm leading-7 text-[var(--color-forest-muted)]">
            Sign in first so your verification request can be attached to your member
            profile and reviewed by the site admin.
          </p>
          <Button asChild className="rounded-2xl px-5">
            <Link href="/auth/signin">Sign in to continue</Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="surface-card space-y-4 p-6">
            <h2 className="font-heading text-3xl text-[var(--color-pine)]">What gets reviewed</h2>
            <ul className="space-y-2 text-sm leading-7 text-[var(--color-forest-muted)]">
              <li>Whether you represent a real local shop, club, team, promoter, or community ride.</li>
              <li>Whether the listing helps visitors and locals find accurate cycling information.</li>
              <li>Whether the account has a usable public website or social presence.</li>
            </ul>
            {latestRequest ? (
              <div className="rounded-[1.25rem] border border-[color:var(--color-border-soft)] bg-white/70 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-forest-soft)]">
                  Latest request
                </p>
                <h3 className="mt-2 font-heading text-2xl text-[var(--color-pine)]">
                  {latestRequest.organizationName}
                </h3>
                <p className="mt-1 text-sm text-[var(--color-forest-muted)]">
                  Status: {latestRequest.status.replace("_", " ")}
                </p>
                {latestRequest.adminNote ? (
                  <p className="mt-3 text-sm leading-6 text-[var(--color-forest-muted)]">
                    Admin note: {latestRequest.adminNote}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
          <div className="surface-card p-6">
            <VerificationRequestForm />
          </div>
        </div>
      )}
    </PageShell>
  );
}
