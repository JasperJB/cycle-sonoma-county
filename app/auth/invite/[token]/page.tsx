import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { PageShell, SectionHeading } from "@/components/page-shell";
import { getSession } from "@/lib/auth/session";
import {
  acceptOrganizationInvitesByToken,
  getOrganizationInviteBundle,
} from "@/lib/organization-invites";
import { requireUserRecord } from "@/lib/permissions";

export default async function OrganizationInvitePage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { token } = await params;
  const query = await searchParams;
  const error = Array.isArray(query.error) ? query.error[0] : query.error;
  const invite = await getOrganizationInviteBundle(token);
  const session = await getSession();

  async function acceptInvite() {
    "use server";

    const user = await requireUserRecord();
    const result = await acceptOrganizationInvitesByToken({
      token,
      userId: user.id,
      email: user.email,
    });

    if (!result.ok) {
      redirect(`/auth/invite/${token}?error=${encodeURIComponent(result.message)}`);
    }

    redirect("/organizer");
  }

  if (!invite) {
    return (
      <PageShell className="justify-center py-12">
        <section className="surface-card mx-auto max-w-3xl space-y-6 p-8 sm:p-10">
          <SectionHeading
            eyebrow="Shared access"
            title="This invite link is no longer valid"
            description="Invite links expire or can be revoked by the organization owner. Ask the organizer to send a fresh link."
          />
          <div className="flex flex-wrap gap-3">
            <Button asChild className="rounded-2xl px-5">
              <Link href="/auth/signin">Sign in</Link>
            </Button>
            <Button asChild variant="outline" className="rounded-2xl px-5">
              <Link href="/auth/signup">Create account</Link>
            </Button>
          </div>
        </section>
      </PageShell>
    );
  }

  const signUpHref = `/auth/signup?invite=${encodeURIComponent(token)}`;
  const signInHref = `/auth/signin?email=${encodeURIComponent(invite.email)}&returnTo=${encodeURIComponent("/organizer")}`;
  const signedInAsInvitee = session?.email?.toLowerCase() === invite.email;

  return (
    <PageShell className="justify-center py-12">
      <section className="surface-card mx-auto max-w-4xl space-y-6 p-8 sm:p-10">
        <SectionHeading
          eyebrow="Shared access"
          title="You were invited to help manage local organizations"
          description={`This link grants organizer access to ${invite.organizations
            .map((organization) => organization.name)
            .join(", ")} for ${invite.email}.`}
        />
        <div className="rounded-[1.5rem] border border-[color:var(--color-border-soft)] bg-white/70 p-5">
          <p className="text-sm leading-7 text-[var(--color-forest-muted)]">
            Sent by <span className="font-medium text-[var(--color-pine)]">{invite.inviterName}</span>.
            Once accepted, you will be able to edit the organization profile plus its rides,
            events, and route guides from the organizer console.
          </p>
          <p className="mt-3 text-sm leading-7 text-[var(--color-forest-muted)]">
            This invite expires on{" "}
            <span className="font-medium text-[var(--color-pine)]">
              {invite.expiresAt.toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </span>
            .
          </p>
        </div>
        {error ? (
          <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        ) : null}
        {signedInAsInvitee ? (
          <div className="flex flex-wrap gap-3">
            <form action={acceptInvite}>
              <Button type="submit" className="rounded-2xl px-5">
                Accept access and open organizer
              </Button>
            </form>
            <Button asChild variant="outline" className="rounded-2xl px-5">
              <Link href="/organizer">Open organizer console</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm leading-7 text-[var(--color-forest-muted)]">
              Use the invited email address, <span className="font-medium text-[var(--color-pine)]">{invite.email}</span>.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild className="rounded-2xl px-5">
                <Link href={signUpHref}>Create account</Link>
              </Button>
              <Button asChild variant="outline" className="rounded-2xl px-5">
                <Link href={signInHref}>Sign in</Link>
              </Button>
            </div>
          </div>
        )}
      </section>
    </PageShell>
  );
}
