import { SignUpForm } from "@/components/forms/signup-form";
import { PageShell, SectionHeading } from "@/components/page-shell";
import { getOrganizationInviteBundle } from "@/lib/organization-invites";

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const inviteToken = Array.isArray(params.invite) ? params.invite[0] : params.invite;
  const invite = inviteToken ? await getOrganizationInviteBundle(inviteToken) : null;

  return (
    <PageShell className="justify-center py-12">
      <section className="grid gap-8 lg:grid-cols-[1fr_0.92fr] lg:items-center">
        <div className="space-y-6">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--color-forest-soft)]">
            Join the network
          </p>
          <h1 className="font-heading text-4xl leading-tight text-[var(--color-pine)] sm:text-5xl lg:text-6xl">
            {invite
              ? "Create an account to accept shared organizer access."
              : "Create a local account for rides, routes, and organizer tools."}
          </h1>
          <p className="max-w-2xl text-base leading-7 text-[var(--color-forest-muted)]">
            {invite
              ? `Use ${invite.email} to accept access to ${invite.organizations
                  .map((organization) => organization.name)
                  .join(", ")}.`
              : "Public browsing stays open to everyone. Your account unlocks favorites, organizer applications, and a personal Sonoma County cycling home base."}
          </p>
        </div>
        <div className="surface-card space-y-6 p-8 sm:p-10">
          <SectionHeading
            eyebrow="New account"
            title="Sign up"
            description={
              invite
                ? "Create the invited account first, then confirm the email and sign in to activate organizer access."
                : "Create your account with your real name so organizers and admins can verify local submissions cleanly."
            }
          />
          <SignUpForm
            defaultEmail={invite?.email || ""}
            inviteToken={inviteToken || undefined}
            inviteDetails={
              invite
                ? {
                    inviterName: invite.inviterName,
                    organizationNames: invite.organizations.map((organization) => organization.name),
                  }
                : null
            }
          />
        </div>
      </section>
    </PageShell>
  );
}
