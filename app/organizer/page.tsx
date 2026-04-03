import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Bike,
  Building2,
  CalendarDays,
  Flag,
  FolderKanban,
  Map,
  Sparkles,
  Users2,
  type LucideIcon,
} from "lucide-react";
import {
  deleteEventSeriesAction,
  deleteOrganizationAction,
  deleteRideSeriesAction,
  deleteRouteGuideAction,
  removeOrganizationMembershipAction,
  revokeOrganizationInviteAction,
  updateEventSeriesListingStatusAction,
  updateOrganizationListingStatusAction,
  updateRideSeriesListingStatusAction,
  updateRouteGuideListingStatusAction,
} from "@/app/actions/organizer";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { EventSeriesForm } from "@/components/forms/event-series-form";
import { OrganizationInviteForm } from "@/components/forms/organization-invite-form";
import { OrganizationOnboardingForm } from "@/components/forms/organization-onboarding-form";
import { RideSeriesForm } from "@/components/forms/ride-series-form";
import { RouteGuideForm } from "@/components/forms/route-guide-form";
import { PageShell, SectionHeading } from "@/components/page-shell";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth/user";
import { getOrganizerDashboardData, getOrganizationOptionsForUser } from "@/lib/data/dashboard";
import { hasOrganizerAccess } from "@/lib/permissions";

type OrganizerDashboard = Awaited<ReturnType<typeof getOrganizerDashboardData>>;
type OrganizerOrganization = OrganizerDashboard["organizations"][number];

function collaboratorName(user: {
  displayName: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string;
}) {
  return user.displayName || [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email;
}

function motionDelay(delayMs: number): CSSProperties {
  return { "--delay": `${delayMs}ms` } as CSSProperties;
}

function countLabel(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function SectionPill({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full border border-[color:var(--color-border-soft)] bg-white/80 px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-[var(--color-pine)]">
      {children}
    </span>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  delay,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  delay: number;
}) {
  return (
    <div className="organizer-panel organizer-stat organizer-stagger p-5" style={motionDelay(delay)}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-forest-soft)]">
            {label}
          </p>
          <h2 className="mt-3 font-heading text-3xl text-[var(--color-pine)]">{value}</h2>
        </div>
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--color-pine)] text-white shadow-[0_16px_30px_-18px_rgba(24,58,45,0.6)]">
          <Icon className="h-5 w-5" />
        </span>
      </div>
    </div>
  );
}

function ConsoleSection({
  value,
  icon: Icon,
  eyebrow,
  title,
  description,
  pill,
  children,
}: {
  value: string;
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  description: string;
  pill?: string;
  children: ReactNode;
}) {
  return (
    <AccordionItem value={value} className="organizer-panel border-none">
      <AccordionTrigger className="px-5 py-5 no-underline hover:no-underline">
        <div className="flex w-full items-start gap-4">
          <span className="mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--color-pine)]/10 text-[var(--color-pine)]">
            <Icon className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-forest-soft)]">
                {eyebrow}
              </p>
              {pill ? <SectionPill>{pill}</SectionPill> : null}
            </div>
            <div className="space-y-1">
              <h2 className="font-heading text-2xl text-[var(--color-pine)] sm:text-3xl">
                {title}
              </h2>
              <p className="max-w-3xl text-sm leading-6 text-[var(--color-forest-muted)]">
                {description}
              </p>
            </div>
          </div>
        </div>
      </AccordionTrigger>
      <AccordionContent className="px-5 pb-5">
        <div className="animate-in fade-in-0 slide-in-from-top-3 duration-300">{children}</div>
      </AccordionContent>
    </AccordionItem>
  );
}

function ManagementCard({
  eyebrow,
  title,
  status,
  tone,
  location,
  summary,
  meta,
  children,
}: {
  eyebrow: string;
  title: string;
  status: string;
  tone: "draft" | "published";
  location?: string;
  summary: string;
  meta?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="rounded-[1.35rem] border border-[color:var(--color-border-soft)] bg-white/82 p-4 transition duration-200 hover:-translate-y-1 hover:border-[color:var(--color-clay)]/30 hover:shadow-[0_28px_80px_-48px_rgba(24,58,45,0.5)]">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-forest-soft)]">
            {eyebrow}
          </p>
          <h3 className="font-heading text-2xl text-[var(--color-pine)]">{title}</h3>
        </div>
        <span
          className={
            tone === "published"
              ? "rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-800"
              : "rounded-full border border-[color:var(--color-border-soft)] bg-[var(--color-sand)]/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-pine)]"
          }
        >
          {status}
        </span>
      </div>
      {location ? (
        <p className="mt-2 text-sm text-[var(--color-forest-muted)]">{location}</p>
      ) : null}
      <p className="mt-3 text-sm leading-6 text-[var(--color-forest-muted)]">{summary}</p>
      {meta ? (
        <div className="mt-3 text-xs font-medium uppercase tracking-[0.18em] text-[var(--color-forest-soft)]">
          {meta}
        </div>
      ) : null}
      <div className="mt-4 flex flex-wrap gap-3">{children}</div>
    </div>
  );
}

async function publishOrganization(organizationId: string) {
  "use server";
  await updateOrganizationListingStatusAction(organizationId, "PUBLISHED");
}

async function moveOrganizationToDraft(organizationId: string) {
  "use server";
  await updateOrganizationListingStatusAction(organizationId, "DRAFT");
}

async function removeOrganization(organizationId: string) {
  "use server";
  await deleteOrganizationAction(organizationId);
}

async function revokeOrganizationInvite(inviteId: string) {
  "use server";
  await revokeOrganizationInviteAction(inviteId);
}

async function removeOrganizationMembership(membershipId: string) {
  "use server";
  await removeOrganizationMembershipAction(membershipId);
}

async function publishRideSeries(rideSeriesId: string) {
  "use server";
  await updateRideSeriesListingStatusAction(rideSeriesId, "PUBLISHED");
}

async function moveRideSeriesToDraft(rideSeriesId: string) {
  "use server";
  await updateRideSeriesListingStatusAction(rideSeriesId, "DRAFT");
}

async function removeRideSeries(rideSeriesId: string) {
  "use server";
  await deleteRideSeriesAction(rideSeriesId);
}

async function publishEventSeries(eventSeriesId: string) {
  "use server";
  await updateEventSeriesListingStatusAction(eventSeriesId, "PUBLISHED");
}

async function moveEventSeriesToDraft(eventSeriesId: string) {
  "use server";
  await updateEventSeriesListingStatusAction(eventSeriesId, "DRAFT");
}

async function removeEventSeries(eventSeriesId: string) {
  "use server";
  await deleteEventSeriesAction(eventSeriesId);
}

async function publishRouteGuide(routeGuideId: string) {
  "use server";
  await updateRouteGuideListingStatusAction(routeGuideId, "PUBLISHED");
}

async function moveRouteGuideToDraft(routeGuideId: string) {
  "use server";
  await updateRouteGuideListingStatusAction(routeGuideId, "DRAFT");
}

async function removeRouteGuide(routeGuideId: string) {
  "use server";
  await deleteRouteGuideAction(routeGuideId);
}

function CollaboratorOrganizationPanel({
  organization,
}: {
  organization: OrganizerOrganization;
}) {
  const canManageCollaborators = organization.currentUserRole === "OWNER";

  return (
    <AccordionItem
      value={organization.id}
      className="rounded-[1.25rem] border border-[color:var(--color-border-soft)] bg-white/82"
    >
      <AccordionTrigger className="px-4 py-4 no-underline hover:no-underline">
        <div className="flex w-full items-start gap-3">
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-forest-soft)]">
                {organization.type.replaceAll("_", " ")}
              </p>
              <SectionPill>{organization.currentUserRole.toLowerCase()}</SectionPill>
            </div>
            <div className="space-y-1">
              <h3 className="font-heading text-2xl text-[var(--color-pine)]">{organization.name}</h3>
              <p className="text-sm text-[var(--color-forest-muted)]">
                {countLabel(organization.memberships.length, "collaborator")} and{" "}
                {countLabel(organization.invites.length, "pending invite")}
              </p>
            </div>
          </div>
        </div>
      </AccordionTrigger>
      <AccordionContent className="px-4 pb-4">
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="space-y-3">
            <p className="text-sm font-medium text-[var(--color-pine)]">Collaborators</p>
            {organization.memberships.length ? (
              <div className="space-y-3">
                {organization.memberships.map((membership) => (
                  <div
                    key={membership.id}
                    className="flex items-start justify-between gap-3 rounded-[1.1rem] border border-[color:var(--color-border-soft)] bg-[var(--color-paper-strong)]/45 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="break-words font-medium text-[var(--color-pine)]">
                        {collaboratorName(membership.user)}
                      </p>
                      <p className="break-words text-sm text-[var(--color-forest-muted)]">
                        {membership.user.email}
                      </p>
                      <p className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-forest-soft)]">
                        {membership.role.toLowerCase()}
                      </p>
                    </div>
                    {canManageCollaborators ? (
                      <form action={removeOrganizationMembership.bind(null, membership.id)}>
                        <ConfirmSubmitButton
                          type="submit"
                          variant="outline"
                          className="rounded-2xl px-4"
                          confirmationMessage={`Remove ${membership.user.email} from ${organization.name}?`}
                        >
                          Remove
                        </ConfirmSubmitButton>
                      </form>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[var(--color-forest-muted)]">No collaborators yet.</p>
            )}
          </div>
          <div className="space-y-3">
            <p className="text-sm font-medium text-[var(--color-pine)]">Pending invites</p>
            {organization.invites.length ? (
              <div className="space-y-3">
                {organization.invites.map((invite) => (
                  <div
                    key={invite.id}
                    className="flex items-start justify-between gap-3 rounded-[1.1rem] border border-[color:var(--color-border-soft)] bg-[var(--color-paper-strong)]/45 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="break-words font-medium text-[var(--color-pine)]">
                        {invite.email}
                      </p>
                      <p className="text-sm text-[var(--color-forest-muted)]">
                        Sent by {collaboratorName(invite.invitedBy)}
                      </p>
                      <p className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-forest-soft)]">
                        {invite.role.toLowerCase()}
                      </p>
                    </div>
                    {canManageCollaborators ? (
                      <form action={revokeOrganizationInvite.bind(null, invite.id)}>
                        <ConfirmSubmitButton
                          type="submit"
                          variant="outline"
                          className="rounded-2xl px-4"
                          confirmationMessage={`Revoke the pending invite for ${invite.email}?`}
                        >
                          Revoke
                        </ConfirmSubmitButton>
                      </form>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[var(--color-forest-muted)]">No pending invites.</p>
            )}
          </div>
        </div>
      </AccordionContent>
    </AccordionItem>
  );
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
            You do not have organizer permissions yet. If you already submitted a request, the
            admin review note will show on your account page once it has been processed.
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
  const ownerManagedOrganizations = dashboard.organizations.filter(
    (organization) => organization.currentUserRole === "OWNER",
  );
  const rideSeries = dashboard.organizations
    .flatMap((organization) =>
      organization.rideSeries.map((ride) => ({
        ...ride,
        organizationName: organization.name,
        organizationListingStatus: organization.listingStatus,
      })),
    )
    .sort((left, right) => right.updatedAt.getTime() - left.updatedAt.getTime());
  const draftRideSeries = rideSeries.filter((ride) => ride.listingStatus !== "PUBLISHED");
  const publishedRideSeries = rideSeries.filter((ride) => ride.listingStatus === "PUBLISHED");
  const eventSeries = dashboard.organizations
    .flatMap((organization) =>
      organization.eventSeries.map((event) => ({
        ...event,
        organizationName: organization.name,
      })),
    )
    .sort((left, right) => right.updatedAt.getTime() - left.updatedAt.getTime());
  const draftEventSeries = eventSeries.filter((event) => event.listingStatus !== "PUBLISHED");
  const publishedEventSeries = eventSeries.filter((event) => event.listingStatus === "PUBLISHED");
  const routeGuides = dashboard.organizations
    .flatMap((organization) =>
      organization.routeGuides.map((route) => ({
        ...route,
        organizationName: organization.name,
      })),
    )
    .sort((left, right) => right.updatedAt.getTime() - left.updatedAt.getTime());
  const draftRouteGuides = routeGuides.filter((route) => route.listingStatus !== "PUBLISHED");
  const publishedRouteGuides = routeGuides.filter((route) => route.listingStatus === "PUBLISHED");

  const defaultSections = [
    !dashboard.organizations.length ? "create-organization" : null,
    ownerManagedOrganizations.length ? "collaborators" : null,
    draftOrganizations.length ? "organization-drafts" : null,
  ].filter(Boolean) as string[];

  return (
    <PageShell className="gap-8 pb-14">
      <section className="organizer-panel organizer-hero organizer-stagger subtle-grid px-6 py-8 sm:px-8 sm:py-10">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl space-y-4">
            <SectionHeading
              eyebrow="Organizer console"
              title="A cleaner control tower for organizations, schedules, and collaborators"
              description="Everything is now grouped into expandable sections so you can open the tool you need, finish the task, and get back out without scrolling past every other form on the page."
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <SectionPill>{countLabel(dashboard.stats.organizations, "organization")}</SectionPill>
            <SectionPill>{countLabel(dashboard.stats.rides, "ride series")}</SectionPill>
            <SectionPill>{countLabel(dashboard.stats.events, "event")}</SectionPill>
            <SectionPill>{countLabel(dashboard.stats.routes, "route guide")}</SectionPill>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Building2} label="Organizations" value={dashboard.stats.organizations} delay={40} />
        <StatCard icon={Bike} label="Ride Series" value={dashboard.stats.rides} delay={120} />
        <StatCard icon={CalendarDays} label="Events" value={dashboard.stats.events} delay={200} />
        <StatCard icon={Map} label="Route Guides" value={dashboard.stats.routes} delay={280} />
      </section>

      <Accordion multiple defaultValue={defaultSections} className="gap-5">
        <ConsoleSection
          value="create-organization"
          icon={Sparkles}
          eyebrow="Setup"
          title={
            dashboard.organizations.length
              ? "Add another organization when you need one"
              : "Create your first organization"
          }
          description="This section is only for the org profile itself. Keep it collapsed until you need a new club, team, shop, or group."
          pill={dashboard.organizations.length ? countLabel(dashboard.organizations.length, "active org") : "Start here"}
        >
          <div className="grid gap-6 lg:grid-cols-[0.82fr_1.18fr]">
            <div className="space-y-4">
              <p className="text-sm leading-7 text-[var(--color-forest-muted)]">
                Ownership already supports multiple organizations. Create each public profile once,
                then manage its rides, events, and routes separately below.
              </p>
            </div>
            <div className="rounded-[1.35rem] border border-[color:var(--color-border-soft)] bg-white/85 p-5">
              <OrganizationOnboardingForm />
            </div>
          </div>
        </ConsoleSection>

        {dashboard.organizations.length ? (
          <ConsoleSection
            value="collaborators"
            icon={Users2}
            eyebrow="Team Access"
            title="Share access without sharing passwords"
            description="Owners can invite collaborators, and each accepted collaborator automatically gets access to that organization's profile, rides, events, and route guides."
            pill={countLabel(ownerManagedOrganizations.length, "owner-managed org")}
          >
            <div className="space-y-6">
              {ownerManagedOrganizations.length ? (
                <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
                  <div className="space-y-4">
                    <p className="text-sm leading-7 text-[var(--color-forest-muted)]">
                      Create an invite link, send it by email or message, and let the recipient sign
                      up or sign in with the invited email address. The app attaches their organizer
                      access automatically after authentication.
                    </p>
                    <div className="rounded-[1.25rem] border border-[color:var(--color-border-soft)] bg-[var(--color-paper-strong)]/45 p-4 text-sm leading-7 text-[var(--color-forest-muted)]">
                      Owners can invite, revoke pending links, and remove collaborators. Editors and
                      contributors can still manage the shared organization&apos;s content.
                    </div>
                  </div>
                  <div className="rounded-[1.35rem] border border-[color:var(--color-border-soft)] bg-white/85 p-5">
                    <OrganizationInviteForm
                      organizations={ownerManagedOrganizations.map((organization) => ({
                        id: organization.id,
                        name: organization.name,
                        type: organization.type,
                      }))}
                    />
                  </div>
                </div>
              ) : (
                <div className="rounded-[1.25rem] border border-[color:var(--color-border-soft)] bg-[var(--color-paper-strong)]/45 p-4 text-sm leading-7 text-[var(--color-forest-muted)]">
                  You can edit shared organizations here, but only owners can invite or remove other
                  collaborators.
                </div>
              )}

              <Accordion
                multiple
                defaultValue={dashboard.organizations.length === 1 ? [dashboard.organizations[0].id] : []}
                className="gap-3"
              >
                {dashboard.organizations.map((organization) => (
                  <CollaboratorOrganizationPanel key={organization.id} organization={organization} />
                ))}
              </Accordion>
            </div>
          </ConsoleSection>
        ) : null}

        {dashboard.organizations.length ? (
          <ConsoleSection
            value="create-content"
            icon={FolderKanban}
            eyebrow="Content Studio"
            title="Open only the form you need"
            description="Rides, events, and routes each live in their own collapsible panel so the page stays compact until you are actively creating something."
            pill="3 creation tools"
          >
            <Accordion className="gap-4" multiple>
              <ConsoleSection
                value="create-ride"
                icon={Bike}
                eyebrow="Create recurring ride"
                title="Add a new ride series"
                description="Open this only when you are actively building or editing ride rhythm details."
                pill={countLabel(draftRideSeries.length, "ride draft")}
              >
                <div className="rounded-[1.35rem] border border-[color:var(--color-border-soft)] bg-white/85 p-5">
                  <RideSeriesForm organizations={organizations} />
                </div>
              </ConsoleSection>
              <ConsoleSection
                value="create-event"
                icon={CalendarDays}
                eyebrow="Create event"
                title="Add a one-off or recurring event"
                description="Keep events separate from rides so the public calendar stays clear."
                pill={countLabel(draftEventSeries.length, "event draft")}
              >
                <div className="rounded-[1.35rem] border border-[color:var(--color-border-soft)] bg-white/85 p-5">
                  <EventSeriesForm organizations={organizations} />
                </div>
              </ConsoleSection>
              <ConsoleSection
                value="create-route"
                icon={Map}
                eyebrow="Create route guide"
                title="Add a route guide for locals or visitors"
                description="Capture a route only when you are ready to fill in the details, not before."
                pill={countLabel(draftRouteGuides.length, "route draft")}
              >
                <div className="rounded-[1.35rem] border border-[color:var(--color-border-soft)] bg-white/85 p-5">
                  <RouteGuideForm organizations={organizations} />
                </div>
              </ConsoleSection>
            </Accordion>
          </ConsoleSection>
        ) : null}

        {draftOrganizations.length ? (
          <ConsoleSection
            value="organization-drafts"
            icon={Flag}
            eyebrow="Drafts"
            title="Organization drafts"
            description="Private organization profiles waiting for publish, revision, or deletion."
            pill={countLabel(draftOrganizations.length, "draft")}
          >
            <div className="grid gap-4 lg:grid-cols-2">
              {draftOrganizations.map((organization) => (
                <ManagementCard
                  key={organization.id}
                  eyebrow={organization.type.replaceAll("_", " ")}
                  title={organization.name}
                  status={organization.listingStatus.replaceAll("_", " ")}
                  tone="draft"
                  location={organization.city}
                  summary={organization.shortDescription}
                >
                  <form action={publishOrganization.bind(null, organization.id)}>
                    <Button type="submit" className="rounded-2xl px-4">
                      Publish
                    </Button>
                  </form>
                  <Button asChild variant="outline" className="rounded-2xl px-4">
                    <Link href={`/organizer/organizations/${organization.id}`}>Edit</Link>
                  </Button>
                  <form action={removeOrganization.bind(null, organization.id)}>
                    <ConfirmSubmitButton
                      type="submit"
                      variant="destructive"
                      className="rounded-2xl px-4"
                      confirmationMessage={`Delete ${organization.name} and all of its listings?`}
                    >
                      Delete
                    </ConfirmSubmitButton>
                  </form>
                </ManagementCard>
              ))}
            </div>
          </ConsoleSection>
        ) : null}

        {publishedOrganizations.length ? (
          <ConsoleSection
            value="organization-published"
            icon={Building2}
            eyebrow="Published"
            title="Published organizations"
            description="Public organization pages that are already live."
            pill={countLabel(publishedOrganizations.length, "published org")}
          >
            <div className="grid gap-4 lg:grid-cols-3">
              {publishedOrganizations.map((organization) => (
                <ManagementCard
                  key={organization.id}
                  eyebrow={organization.type.replaceAll("_", " ")}
                  title={organization.name}
                  status="Published"
                  tone="published"
                  location={organization.city}
                  summary={organization.shortDescription}
                >
                  <Button asChild variant="outline" className="rounded-2xl px-4">
                    <Link
                      href={
                        organization.type === "SHOP" ||
                        organization.type === "BIKE_FRIENDLY_BUSINESS"
                          ? `/shops/${organization.slug}`
                          : `/clubs/${organization.slug}`
                      }
                    >
                      View public page
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="rounded-2xl px-4">
                    <Link href={`/organizer/organizations/${organization.id}`}>Edit</Link>
                  </Button>
                  <form action={moveOrganizationToDraft.bind(null, organization.id)}>
                    <Button type="submit" variant="outline" className="rounded-2xl px-4">
                      Move to draft
                    </Button>
                  </form>
                  <form action={removeOrganization.bind(null, organization.id)}>
                    <ConfirmSubmitButton
                      type="submit"
                      variant="destructive"
                      className="rounded-2xl px-4"
                      confirmationMessage={`Delete ${organization.name} and all of its listings?`}
                    >
                      Delete
                    </ConfirmSubmitButton>
                  </form>
                </ManagementCard>
              ))}
            </div>
          </ConsoleSection>
        ) : null}

        {draftRideSeries.length ? (
          <ConsoleSection
            value="ride-drafts"
            icon={Bike}
            eyebrow="Drafts"
            title="Ride series drafts"
            description="Recurring rides waiting to be published."
            pill={countLabel(draftRideSeries.length, "draft")}
          >
            <div className="grid gap-4 lg:grid-cols-2">
              {draftRideSeries.map((ride) => (
                <ManagementCard
                  key={ride.id}
                  eyebrow={ride.organizationName}
                  title={ride.title}
                  status={ride.listingStatus.replaceAll("_", " ")}
                  tone="draft"
                  location={ride.city}
                  summary={ride.summary}
                  meta={ride.recurrenceSummary}
                >
                  <form action={publishRideSeries.bind(null, ride.id)}>
                    <Button type="submit" className="rounded-2xl px-4">
                      Publish
                    </Button>
                  </form>
                  <Button asChild variant="outline" className="rounded-2xl px-4">
                    <Link href={`/organizer/rides/${ride.id}`}>Edit</Link>
                  </Button>
                  <form action={removeRideSeries.bind(null, ride.id)}>
                    <ConfirmSubmitButton
                      type="submit"
                      variant="destructive"
                      className="rounded-2xl px-4"
                      confirmationMessage={`Delete the ride series ${ride.title}?`}
                    >
                      Delete
                    </ConfirmSubmitButton>
                  </form>
                  {ride.organizationListingStatus !== "PUBLISHED" ? (
                    <div className="w-full rounded-[1.15rem] border border-[color:var(--color-border-soft)] bg-[var(--color-paper-strong)]/45 px-4 py-3 text-sm leading-6 text-[var(--color-forest-muted)]">
                      The parent organization is still a draft, so this ride will not appear on a
                      public club or shop page until that organization is published.
                    </div>
                  ) : null}
                </ManagementCard>
              ))}
            </div>
          </ConsoleSection>
        ) : null}

        {publishedRideSeries.length ? (
          <ConsoleSection
            value="ride-published"
            icon={Bike}
            eyebrow="Published"
            title="Published ride series"
            description="Live recurring rides already showing on the public site."
            pill={countLabel(publishedRideSeries.length, "published ride")}
          >
            <div className="grid gap-4 lg:grid-cols-3">
              {publishedRideSeries.map((ride) => (
                <ManagementCard
                  key={ride.id}
                  eyebrow={ride.organizationName}
                  title={ride.title}
                  status="Published"
                  tone="published"
                  location={ride.city}
                  summary={ride.summary}
                  meta={ride.recurrenceSummary}
                >
                  <Button asChild variant="outline" className="rounded-2xl px-4">
                    <Link href={`/rides/${ride.slug}`}>View public page</Link>
                  </Button>
                  <Button asChild variant="outline" className="rounded-2xl px-4">
                    <Link href={`/organizer/rides/${ride.id}`}>Edit</Link>
                  </Button>
                  <form action={moveRideSeriesToDraft.bind(null, ride.id)}>
                    <Button type="submit" variant="outline" className="rounded-2xl px-4">
                      Move to draft
                    </Button>
                  </form>
                  <form action={removeRideSeries.bind(null, ride.id)}>
                    <ConfirmSubmitButton
                      type="submit"
                      variant="destructive"
                      className="rounded-2xl px-4"
                      confirmationMessage={`Delete the ride series ${ride.title}?`}
                    >
                      Delete
                    </ConfirmSubmitButton>
                  </form>
                </ManagementCard>
              ))}
            </div>
          </ConsoleSection>
        ) : null}

        {draftEventSeries.length ? (
          <ConsoleSection
            value="event-drafts"
            icon={CalendarDays}
            eyebrow="Drafts"
            title="Event drafts"
            description="One-off or recurring events waiting for publish."
            pill={countLabel(draftEventSeries.length, "draft")}
          >
            <div className="grid gap-4 lg:grid-cols-2">
              {draftEventSeries.map((event) => (
                <ManagementCard
                  key={event.id}
                  eyebrow={event.organizationName}
                  title={event.title}
                  status={event.listingStatus.replaceAll("_", " ")}
                  tone="draft"
                  location={event.city}
                  summary={event.summary}
                >
                  <form action={publishEventSeries.bind(null, event.id)}>
                    <Button type="submit" className="rounded-2xl px-4">
                      Publish
                    </Button>
                  </form>
                  <Button asChild variant="outline" className="rounded-2xl px-4">
                    <Link href={`/organizer/events/${event.id}`}>Edit</Link>
                  </Button>
                  <form action={removeEventSeries.bind(null, event.id)}>
                    <ConfirmSubmitButton
                      type="submit"
                      variant="destructive"
                      className="rounded-2xl px-4"
                      confirmationMessage={`Delete the event ${event.title}?`}
                    >
                      Delete
                    </ConfirmSubmitButton>
                  </form>
                </ManagementCard>
              ))}
            </div>
          </ConsoleSection>
        ) : null}

        {publishedEventSeries.length ? (
          <ConsoleSection
            value="event-published"
            icon={CalendarDays}
            eyebrow="Published"
            title="Published events"
            description="Live events already visible on the public calendar."
            pill={countLabel(publishedEventSeries.length, "published event")}
          >
            <div className="grid gap-4 lg:grid-cols-3">
              {publishedEventSeries.map((event) => (
                <ManagementCard
                  key={event.id}
                  eyebrow={event.organizationName}
                  title={event.title}
                  status="Published"
                  tone="published"
                  location={event.city}
                  summary={event.summary}
                >
                  <Button asChild variant="outline" className="rounded-2xl px-4">
                    <Link href={`/events/${event.slug}`}>View public page</Link>
                  </Button>
                  <Button asChild variant="outline" className="rounded-2xl px-4">
                    <Link href={`/organizer/events/${event.id}`}>Edit</Link>
                  </Button>
                  <form action={moveEventSeriesToDraft.bind(null, event.id)}>
                    <Button type="submit" variant="outline" className="rounded-2xl px-4">
                      Move to draft
                    </Button>
                  </form>
                  <form action={removeEventSeries.bind(null, event.id)}>
                    <ConfirmSubmitButton
                      type="submit"
                      variant="destructive"
                      className="rounded-2xl px-4"
                      confirmationMessage={`Delete the event ${event.title}?`}
                    >
                      Delete
                    </ConfirmSubmitButton>
                  </form>
                </ManagementCard>
              ))}
            </div>
          </ConsoleSection>
        ) : null}

        {draftRouteGuides.length ? (
          <ConsoleSection
            value="route-drafts"
            icon={Map}
            eyebrow="Drafts"
            title="Route guide drafts"
            description="Route guides waiting for review or publish."
            pill={countLabel(draftRouteGuides.length, "draft")}
          >
            <div className="grid gap-4 lg:grid-cols-2">
              {draftRouteGuides.map((route) => (
                <ManagementCard
                  key={route.id}
                  eyebrow={route.organizationName}
                  title={route.title}
                  status={route.listingStatus.replaceAll("_", " ")}
                  tone="draft"
                  location={route.city}
                  summary={route.summary}
                >
                  <form action={publishRouteGuide.bind(null, route.id)}>
                    <Button type="submit" className="rounded-2xl px-4">
                      Publish
                    </Button>
                  </form>
                  <Button asChild variant="outline" className="rounded-2xl px-4">
                    <Link href={`/organizer/routes/${route.id}`}>Edit</Link>
                  </Button>
                  <form action={removeRouteGuide.bind(null, route.id)}>
                    <ConfirmSubmitButton
                      type="submit"
                      variant="destructive"
                      className="rounded-2xl px-4"
                      confirmationMessage={`Delete the route guide ${route.title}?`}
                    >
                      Delete
                    </ConfirmSubmitButton>
                  </form>
                </ManagementCard>
              ))}
            </div>
          </ConsoleSection>
        ) : null}

        {publishedRouteGuides.length ? (
          <ConsoleSection
            value="route-published"
            icon={Map}
            eyebrow="Published"
            title="Published route guides"
            description="Live route pages already visible to riders and visitors."
            pill={countLabel(publishedRouteGuides.length, "published route")}
          >
            <div className="grid gap-4 lg:grid-cols-3">
              {publishedRouteGuides.map((route) => (
                <ManagementCard
                  key={route.id}
                  eyebrow={route.organizationName}
                  title={route.title}
                  status="Published"
                  tone="published"
                  location={route.city}
                  summary={route.summary}
                >
                  <Button asChild variant="outline" className="rounded-2xl px-4">
                    <Link href={`/routes/${route.slug}`}>View public page</Link>
                  </Button>
                  <Button asChild variant="outline" className="rounded-2xl px-4">
                    <Link href={`/organizer/routes/${route.id}`}>Edit</Link>
                  </Button>
                  <form action={moveRouteGuideToDraft.bind(null, route.id)}>
                    <Button type="submit" variant="outline" className="rounded-2xl px-4">
                      Move to draft
                    </Button>
                  </form>
                  <form action={removeRouteGuide.bind(null, route.id)}>
                    <ConfirmSubmitButton
                      type="submit"
                      variant="destructive"
                      className="rounded-2xl px-4"
                      confirmationMessage={`Delete the route guide ${route.title}?`}
                    >
                      Delete
                    </ConfirmSubmitButton>
                  </form>
                </ManagementCard>
              ))}
            </div>
          </ConsoleSection>
        ) : null}
      </Accordion>
    </PageShell>
  );
}
