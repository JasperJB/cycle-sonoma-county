import Link from "next/link";
import { PageShell, SectionHeading } from "@/components/page-shell";
import { AccountProfileForm } from "@/components/forms/account-profile-form";
import { ChangePasswordForm } from "@/components/forms/change-password-form";
import { Button } from "@/components/ui/button";
import { getAccountFavorites } from "@/lib/data/public";
import { requireSession } from "@/lib/auth/session";
import { getCurrentUser } from "@/lib/auth/user";

export default async function AccountPage() {
  await requireSession("/account");
  const user = await getCurrentUser();

  if (!user) {
    return null;
  }

  const accountData = await getAccountFavorites(user.id);
  const welcomeName =
    [user.firstName, user.lastName].filter(Boolean).join(" ") ||
    user.displayName ||
    user.email;

  return (
    <PageShell className="gap-8">
      <SectionHeading
        eyebrow="Account"
        title={`Welcome back, ${welcomeName}`}
        description="Manage your profile, follow organizations, and track organizer verification status."
      />
      <section className="grid gap-5 lg:grid-cols-3">
        <div className="surface-card p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-forest-soft)]">
            Profile
          </p>
          <h2 className="mt-3 font-heading text-3xl text-[var(--color-pine)]">{user.city || "Sonoma County"}</h2>
          <p className="mt-2 text-sm leading-7 text-[var(--color-forest-muted)]">
            Role: {user.globalRole}. Organizer approved: {user.isOrganizerApproved ? "Yes" : "No"}.
          </p>
        </div>
        <div className="surface-card p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-forest-soft)]">
            Saved
          </p>
          <h2 className="mt-3 font-heading text-3xl text-[var(--color-pine)]">{user.favorites.length}</h2>
          <p className="mt-2 text-sm leading-7 text-[var(--color-forest-muted)]">
            Favorites across rides, events, routes, clubs, and shops.
          </p>
        </div>
        <div className="surface-card p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-forest-soft)]">
            Following
          </p>
          <h2 className="mt-3 font-heading text-3xl text-[var(--color-pine)]">{accountData.follows.length}</h2>
          <p className="mt-2 text-sm leading-7 text-[var(--color-forest-muted)]">
            Organizations you follow for future personalization.
          </p>
        </div>
      </section>
      <section className="grid gap-5 lg:grid-cols-2">
        <div className="surface-card space-y-5 p-6">
          <h2 className="font-heading text-3xl text-[var(--color-pine)]">Profile details</h2>
          <p className="text-sm leading-7 text-[var(--color-forest-muted)]">
            Update the name shown across your account and organizer tools.
          </p>
          <AccountProfileForm
            firstName={user.firstName}
            lastName={user.lastName}
            email={user.email}
          />
        </div>
        <div className="surface-card space-y-5 p-6">
          <h2 className="font-heading text-3xl text-[var(--color-pine)]">Security</h2>
          <p className="text-sm leading-7 text-[var(--color-forest-muted)]">
            Change your password without leaving your account dashboard.
          </p>
          <ChangePasswordForm />
        </div>
      </section>
      <section className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="surface-card space-y-4 p-6">
          <h2 className="font-heading text-3xl text-[var(--color-pine)]">Organizer status</h2>
          {user.isOrganizerApproved ? (
            <>
              <p className="text-sm leading-7 text-[var(--color-forest-muted)]">
                Your account can access organizer tools. If you have not created an
                organization profile yet, the onboarding wizard is waiting for you.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button asChild className="rounded-2xl px-5">
                  <Link href="/organizer">Open organizer console</Link>
                </Button>
                {user.globalRole === "ADMIN" ? (
                  <Button asChild variant="outline" className="rounded-2xl px-5">
                    <Link href="/admin">Open admin console</Link>
                  </Button>
                ) : null}
              </div>
            </>
          ) : (
            <>
              <p className="text-sm leading-7 text-[var(--color-forest-muted)]">
                You are currently a member account. Apply for organizer verification if you
                run a shop, club, team, promoter, or community ride.
              </p>
              <Button asChild className="rounded-2xl px-5">
                <Link href="/become-organizer">Apply for verification</Link>
              </Button>
            </>
          )}
        </div>
        <div className="surface-card space-y-4 p-6">
          <h2 className="font-heading text-3xl text-[var(--color-pine)]">Organizations you follow</h2>
          <div className="grid gap-3">
            {accountData.follows.map((follow) => (
              <Link
                key={follow.id}
                href={
                  follow.organization.type === "SHOP"
                    ? `/shops/${follow.organization.slug}`
                    : `/clubs/${follow.organization.slug}`
                }
                className="rounded-[1.2rem] border border-[color:var(--color-border-soft)] bg-white/70 px-4 py-4"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-forest-soft)]">
                  {follow.organization.type.replace("_", " ")}
                </p>
                <h3 className="mt-2 font-heading text-2xl text-[var(--color-pine)]">
                  {follow.organization.name}
                </h3>
                <p className="text-sm text-[var(--color-forest-muted)]">{follow.organization.city}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </PageShell>
  );
}
