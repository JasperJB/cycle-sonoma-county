import Link from "next/link";
import { redirect } from "next/navigation";
import { EventSeriesForm } from "@/components/forms/event-series-form";
import { OrganizationOnboardingForm } from "@/components/forms/organization-onboarding-form";
import { RideSeriesForm } from "@/components/forms/ride-series-form";
import { RouteGuideForm } from "@/components/forms/route-guide-form";
import { PageShell, SectionHeading } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { updateOrganizationListingStatusAction } from "@/app/actions/organizer";
import { getCurrentUser } from "@/lib/auth/user";
import { getOrganizerDashboardData, getOrganizationOptionsForUser } from "@/lib/data/dashboard";
import { hasOrganizerAccess } from "@/lib/permissions";

async function publishOrganization(organizationId: string) {
  "use server";
  await updateOrganizationListingStatusAction(organizationId, "PUBLISHED");
}

async function moveOrganizationToDraft(organizationId: string) {
  "use server";
  await updateOrganizationListingStatusAction(organizationId, "DRAFT");
}

export default async function OrganizerPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/auth/signin");
  }

  if (!hasOrganizerAccess(user)) {
    return (
      <PageShell className="gap-8">
        <SectionHeading
          eyebrow="Organizer console"
          title="Organizer access is pending"
          description="Submit a verification request first. Once approved, your lightweight onboarding wizard and content tools will appear here."
        />
        <div className="surface-card max-w-2xl space-y-4 p-6">
          <p className="text-sm leading-7 text-[var(--color-forest-muted)]">
            You do not have organizer permissions yet. If you already submitted a request,
            the admin review note will show on your account page once it has been processed.
          </p>
          <Button asChild className="rounded-2xl px-5">
            <Link href="/become-organizer">Apply for organizer access</Link>
          </Button>
        </div>
      </PageShell>
    );
  }

  const dashboard = await getOrganizerDashboardData(user.id);
  const organizations = await getOrganizationOptionsForUser(user.id);
  const draftOrganizations = dashboard.organizations.filter(
    (organization) => organization.listingStatus !== "PUBLISHED",
  );
  const publishedOrganizations = dashboard.organizations.filter(
    (organization) => organization.listingStatus === "PUBLISHED",
  );

  return (
    <PageShell className="gap-8">
      <SectionHeading
        eyebrow="Organizer console"
        title="Manage organizations, listings, and recurring schedules"
        description="Approved organizers can save drafts, add recurring rides and events, and build out a useful public profile over time. Admins retain full moderation access while using these same publishing tools."
      />
      <section className="surface-card space-y-4 p-6">
        <h2 className="font-heading text-3xl text-[var(--color-pine)]">Draft workflow</h2>
        <p className="max-w-3xl text-sm leading-7 text-[var(--color-forest-muted)]">
          Saved drafts do not appear on the public website. They stay visible here in your organizer
          console until you publish them.
        </p>
      </section>
      <section className="grid gap-5 lg:grid-cols-4">
        <div className="surface-card p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-forest-soft)]">
            Organizations
          </p>
          <h2 className="mt-3 font-heading text-3xl text-[var(--color-pine)]">{dashboard.stats.organizations}</h2>
        </div>
        <div className="surface-card p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-forest-soft)]">
            Ride series
          </p>
          <h2 className="mt-3 font-heading text-3xl text-[var(--color-pine)]">{dashboard.stats.rides}</h2>
        </div>
        <div className="surface-card p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-forest-soft)]">
            Events
          </p>
          <h2 className="mt-3 font-heading text-3xl text-[var(--color-pine)]">{dashboard.stats.events}</h2>
        </div>
        <div className="surface-card p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-forest-soft)]">
            Route guides
          </p>
          <h2 className="mt-3 font-heading text-3xl text-[var(--color-pine)]">{dashboard.stats.routes}</h2>
        </div>
      </section>
      {!dashboard.organizations.length ? (
        <section className="surface-card grid gap-6 p-6 lg:grid-cols-[0.85fr_1.15fr]">
          <div className="space-y-4">
            <SectionHeading
              eyebrow="Onboarding"
              title="Your account has been approved. Set up your business or club profile."
              description="Start with the smallest useful amount of information. You can save a draft now and come back later to add richer details."
            />
          </div>
          <OrganizationOnboardingForm />
        </section>
      ) : null}
      {draftOrganizations.length ? (
        <section className="surface-card space-y-4 p-6">
          <h2 className="font-heading text-3xl text-[var(--color-pine)]">Saved drafts</h2>
          <div className="grid gap-3 lg:grid-cols-2">
            {draftOrganizations.map((organization) => (
              <div
                key={organization.id}
                className="rounded-[1.25rem] border border-[color:var(--color-border-soft)] bg-white/70 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-forest-soft)]">
                      {organization.type.replaceAll("_", " ")}
                    </p>
                    <h3 className="mt-2 font-heading text-2xl text-[var(--color-pine)]">
                      {organization.name}
                    </h3>
                  </div>
                  <span className="rounded-full border border-[color:var(--color-border-soft)] bg-[var(--color-sand)]/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-pine)]">
                    {organization.listingStatus.replaceAll("_", " ")}
                  </span>
                </div>
                <p className="mt-2 text-sm text-[var(--color-forest-muted)]">{organization.city}</p>
                <p className="mt-3 text-sm leading-6 text-[var(--color-forest-muted)]">
                  {organization.shortDescription}
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <form action={publishOrganization.bind(null, organization.id)}>
                    <Button type="submit" className="rounded-2xl px-4">
                      Publish
                    </Button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}
      {dashboard.organizations.length ? (
        <>
          {publishedOrganizations.length ? (
            <section className="surface-card space-y-4 p-6">
              <h2 className="font-heading text-3xl text-[var(--color-pine)]">Published organizations</h2>
              <div className="grid gap-3 lg:grid-cols-3">
                {publishedOrganizations.map((organization) => (
                  <div
                    key={organization.id}
                    className="rounded-[1.25rem] border border-[color:var(--color-border-soft)] bg-white/70 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-forest-soft)]">
                          {organization.type.replaceAll("_", " ")}
                        </p>
                        <h3 className="mt-2 font-heading text-2xl text-[var(--color-pine)]">
                          {organization.name}
                        </h3>
                      </div>
                      <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-800">
                        Published
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-[var(--color-forest-muted)]">{organization.city}</p>
                    <div className="mt-4 flex flex-wrap gap-3">
                      <Button asChild variant="outline" className="rounded-2xl px-4">
                        <Link
                          href={
                            organization.type === "SHOP"
                              ? `/shops/${organization.slug}`
                              : `/clubs/${organization.slug}`
                          }
                        >
                          View public page
                        </Link>
                      </Button>
                      <form action={moveOrganizationToDraft.bind(null, organization.id)}>
                        <Button type="submit" variant="outline" className="rounded-2xl px-4">
                          Move to draft
                        </Button>
                      </form>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : null}
          <section className="grid gap-6 lg:grid-cols-2">
            <div className="surface-card p-6">
              <SectionHeading
                eyebrow="Create recurring ride"
                title="Add a new ride series"
                description="Publish the weekly rhythm first; refine pace and distance details later."
              />
              <div className="mt-6">
                <RideSeriesForm organizations={organizations} />
              </div>
            </div>
            <div className="surface-card p-6">
              <SectionHeading
                eyebrow="Create event"
                title="Add a one-off or recurring event"
                description="Keep events separate from recurring ride series so the public calendar stays readable."
              />
              <div className="mt-6">
                <EventSeriesForm organizations={organizations} />
              </div>
            </div>
          </section>
          <section className="surface-card p-6">
            <SectionHeading
              eyebrow="Create route guide"
              title="Publish a route guide for visitors or locals"
              description="Capture the route basics, who it is for, and any cautions worth knowing before the first pedal stroke."
            />
            <div className="mt-6">
              <RouteGuideForm organizations={organizations} />
            </div>
          </section>
        </>
      ) : null}
    </PageShell>
  );
}
