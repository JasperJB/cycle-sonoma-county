import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Bike,
  Building2,
  CalendarDays,
  Flag,
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
import { OrganizerNewsletterForm } from "@/components/forms/organizer-newsletter-form";
import { OrganizationInviteForm } from "@/components/forms/organization-invite-form";
import { OrganizationOnboardingForm } from "@/components/forms/organization-onboarding-form";
import { RideSeriesForm } from "@/components/forms/ride-series-form";
import { RouteGuideForm } from "@/components/forms/route-guide-form";
import { PageShell, SectionHeading } from "@/components/page-shell";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth/user";
import { getOrganizerDashboardData, getOrganizationOptionsForUser } from "@/lib/data/dashboard";
import { getOrganizerNewsletterData } from "@/lib/newsletter";
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

function JumpLink({
  href,
  eyebrow,
  label,
  meta,
}: {
  href: string;
  eyebrow: string;
  label: string;
  meta: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-[1.2rem] border border-[color:var(--color-border-soft)] bg-white/72 px-4 py-4 transition hover:-translate-y-0.5 hover:border-[color:var(--color-clay)]/35 hover:shadow-[0_18px_50px_-34px_rgba(24,58,45,0.35)]"
    >
      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-[var(--color-forest-soft)]">
        {eyebrow}
      </p>
      <p className="mt-2 font-medium text-[var(--color-pine)]">{label}</p>
      <p className="mt-1 text-sm text-[var(--color-forest-muted)]">{meta}</p>
    </Link>
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
  details,
  pill,
  defaultOpen = false,
  children,
}: {
  value: string;
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  description: string;
  details?: ReactNode;
  pill?: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  return (
    <Accordion multiple defaultValue={defaultOpen ? [value] : []} className="w-full">
      <AccordionItem value={value} className="organizer-panel organizer-console-box border-none">
        <AccordionTrigger className="organizer-box-trigger px-5 py-5 no-underline hover:no-underline">
          <div className="flex w-full items-start gap-4">
            <span className="mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--color-pine)]/10 text-[var(--color-pine)]">
              <Icon className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1 space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-forest-soft)]">
                  {eyebrow}
                </p>
                {pill ? <SectionPill>{pill}</SectionPill> : null}
              </div>
              <div className="space-y-2">
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
        <AccordionContent className="organizer-box-content px-5 pb-5">
          <div className="animate-in fade-in-0 slide-in-from-top-3 space-y-5 duration-300">
            {details ? (
              <div className="rounded-[1.15rem] border border-[color:var(--color-border-soft)] bg-[var(--color-paper-strong)]/40 px-4 py-3 text-sm leading-6 text-[var(--color-forest-muted)]">
                {details}
              </div>
            ) : null}
            {children}
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
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
      className="organizer-subpanel rounded-[1.25rem] border-none"
    >
      <AccordionTrigger className="organizer-subpanel-trigger px-4 py-4 no-underline hover:no-underline">
        <div className="flex w-full items-start gap-3">
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-forest-soft)]">
                {organization.type.replaceAll("_", " ")}
              </p>
              <SectionPill>{organization.currentUserRole.toLowerCase()}</SectionPill>
            </div>
            <div className="space-y-2">
              <h3 className="font-heading text-2xl text-[var(--color-pine)]">{organization.name}</h3>
              <p className="text-sm leading-6 text-[var(--color-forest-muted)]">
                Review current collaborators, pending invites, and organization-specific access in
                this box.
              </p>
              <p className="text-sm text-[var(--color-forest-muted)]">
                {countLabel(organization.memberships.length, "collaborator")} and{" "}
                {countLabel(organization.invites.length, "pending invite")}
              </p>
            </div>
          </div>
        </div>
      </AccordionTrigger>
      <AccordionContent className="organizer-subpanel-content px-4 pb-4">
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
  const newsletterData = await getOrganizerNewsletterData(user.id);
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
  const totalDraftItems =
    draftOrganizations.length +
    draftRideSeries.length +
    draftEventSeries.length +
    draftRouteGuides.length;
  const totalPublishedItems =
    publishedOrganizations.length +
    publishedRideSeries.length +
    publishedEventSeries.length +
    publishedRouteGuides.length;

  return (
    <PageShell className="gap-8 pb-14">
      <section className="organizer-panel organizer-hero organizer-stagger subtle-grid px-6 py-8 sm:px-8 sm:py-10">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl space-y-4">
            <SectionHeading
              eyebrow="Organizer console"
              title="Create organizations, invite collaborators, and manage public listings"
              description="Use this console to create organization profiles, create ride series, create events, create route guides, and control which listings are public."
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

      <section className="organizer-panel px-5 py-5 sm:px-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-forest-soft)]">
              Weekly Newsletter
            </p>
            <h2 className="font-heading text-3xl text-[var(--color-pine)]">
              Add your organization updates for the next issue
            </h2>
            <p className="text-sm leading-6 text-[var(--color-forest-muted)]">
              Pick an organization you manage, add its weekly note, and lock everything in before
              Friday evening.
            </p>
          </div>
          <SectionPill>{newsletterData.organizations.length} eligible orgs</SectionPill>
        </div>
        <div className="mt-5 rounded-[1.35rem] border border-[color:var(--color-border-soft)] bg-white/88 p-5">
          <OrganizerNewsletterForm
            issueLabel={`Week of ${newsletterData.issue.schedule.label}`}
            weekRangeLabel={newsletterData.issue.schedule.rangeLabel}
            deadlineLabel="Fri 6:00 PM PT"
            sendLabel="Sat 6:00 PM PT"
            isLocked={newsletterData.issue.displayStatus !== "OPEN"}
            organizations={newsletterData.organizations.map((organization) => ({
              id: organization.id,
              name: organization.name,
              type: organization.type,
              city: organization.city,
              draft: organization.draft
                ? {
                    content: organization.draft.content,
                    lastEditedByName: organization.draft.lastEditedByName,
                    updatedAtLabel: organization.draft.updatedAt.toLocaleString("en-US", {
                      timeZone: "America/Los_Angeles",
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    }),
                    adminOverridden: organization.draft.adminOverridden,
                  }
                : null,
            }))}
          />
        </div>
      </section>

      <section className="organizer-panel px-5 py-5 sm:px-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-forest-soft)]">
              Quick Navigation
            </p>
            <h2 className="font-heading text-3xl text-[var(--color-pine)]">Jump to the task you need</h2>
            <p className="text-sm leading-6 text-[var(--color-forest-muted)]">
              Go straight to setup, creation tools, draft cleanup, or the live listings you need to
              adjust.
            </p>
          </div>
          <SectionPill>{countLabel(totalDraftItems, "draft item")}</SectionPill>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <JumpLink
            href="#organizer-setup"
            eyebrow="Setup"
            label="Organizations and access"
            meta={`${countLabel(dashboard.stats.organizations, "organization")} and ${countLabel(ownerManagedOrganizations.length, "owner-managed org")}`}
          />
          <JumpLink
            href="#organizer-create"
            eyebrow="Create"
            label="Ride, event, and route tools"
            meta={`${countLabel(draftRideSeries.length, "ride draft")}, ${countLabel(draftEventSeries.length, "event draft")}, ${countLabel(draftRouteGuides.length, "route draft")}`}
          />
          <JumpLink
            href="#organizer-drafts"
            eyebrow="Drafts"
            label="Private items waiting for publish"
            meta={countLabel(totalDraftItems, "draft item")}
          />
          <JumpLink
            href="#organizer-live"
            eyebrow="Live"
            label="Published listings"
            meta={countLabel(totalPublishedItems, "published item")}
          />
        </div>
      </section>

      <section id="organizer-setup" className="grid gap-5 xl:grid-cols-2">
        <ConsoleSection
          value="create-organization"
          icon={Sparkles}
          eyebrow="Organization Setup"
          title={
            dashboard.organizations.length
              ? "Create another organization profile"
              : "Create your first organization profile"
          }
          description="Use this box to create the public club, team, shop, or business profile that will own rides, events, and route guides."
          details="After you save the organization, it stays private in this console as a draft until you publish it."
          pill={
            dashboard.organizations.length
              ? countLabel(dashboard.organizations.length, "active organization")
              : "Start here"
          }
          defaultOpen={!dashboard.organizations.length}
        >
          <div className="grid gap-6 lg:grid-cols-[0.82fr_1.18fr]">
            <div className="space-y-4">
              <p className="text-sm leading-7 text-[var(--color-forest-muted)]">
                Create one organization profile for each local entity you manage, then attach ride
                series, events, and route guides to the correct organization below.
              </p>
              <div className="rounded-[1.25rem] border border-[color:var(--color-border-soft)] bg-[var(--color-paper-strong)]/45 p-4 text-sm leading-7 text-[var(--color-forest-muted)]">
                Multi-organization ownership is already supported, so you do not need separate
                accounts for separate clubs, teams, or businesses.
              </div>
            </div>
            <div className="rounded-[1.35rem] border border-[color:var(--color-border-soft)] bg-white/88 p-5">
              <OrganizationOnboardingForm />
            </div>
          </div>
        </ConsoleSection>

        {dashboard.organizations.length ? (
          <ConsoleSection
            value="collaborators"
            icon={Users2}
            eyebrow="Access Control"
            title="Invite someone to manage an organization"
            description="Owners use this box to create an invite link for a collaborator's own login instead of sharing a password."
            details={
              ownerManagedOrganizations.length
                ? "Accepted invites give that person access to the selected organization's profile, ride series, events, and route guides. Only owners can send or revoke invites and remove collaborators."
                : "You can review collaborators below, but only owners can create invite links, revoke pending invites, or remove access."
            }
            pill={countLabel(ownerManagedOrganizations.length, "organization you own")}
            defaultOpen={ownerManagedOrganizations.length > 0 && dashboard.organizations.length === 1}
          >
            <div className="space-y-6">
              {ownerManagedOrganizations.length ? (
                <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
                  <div className="space-y-4">
                    <p className="text-sm leading-7 text-[var(--color-forest-muted)]">
                      Create an invite link for a specific email address, choose the access level,
                      and select which organizations that person can manage.
                    </p>
                    <div className="rounded-[1.25rem] border border-[color:var(--color-border-soft)] bg-[var(--color-paper-strong)]/45 p-4 text-sm leading-7 text-[var(--color-forest-muted)]">
                      When the recipient signs up or signs in with that invited email address, the
                      shared organization access attaches automatically.
                    </div>
                  </div>
                  <div className="rounded-[1.35rem] border border-[color:var(--color-border-soft)] bg-white/88 p-5">
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
                  You can edit shared organizations here, but you cannot send invite links or
                  remove collaborators unless you are an owner on that organization.
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
      </section>

      {dashboard.organizations.length ? (
        <section id="organizer-create" className="grid gap-5 xl:grid-cols-3">
          <ConsoleSection
            value="create-ride"
            icon={Bike}
            eyebrow="Ride Series"
            title="Create a ride series"
            description="Use this box to create a recurring ride listing with schedule, meeting location, pace details, and organizer ownership."
            details="The ride series stays private in this console as a draft until you publish it, and it appears on the public rides page after publish."
            pill={countLabel(draftRideSeries.length, "ride draft")}
          >
            <div className="rounded-[1.35rem] border border-[color:var(--color-border-soft)] bg-white/88 p-5">
              <RideSeriesForm organizations={organizations} />
            </div>
          </ConsoleSection>
          <ConsoleSection
            value="create-event"
            icon={CalendarDays}
            eyebrow="Events"
            title="Create an event"
            description="Use this box to create a one-off or recurring event listing with the details that should appear on the public event calendar."
            details="The event stays private in this console as a draft until you publish it, and it appears on the public events page after publish."
            pill={countLabel(draftEventSeries.length, "event draft")}
          >
            <div className="rounded-[1.35rem] border border-[color:var(--color-border-soft)] bg-white/88 p-5">
              <EventSeriesForm organizations={organizations} />
            </div>
          </ConsoleSection>
          <ConsoleSection
            value="create-route"
            icon={Map}
            eyebrow="Route Guides"
            title="Create a route guide"
            description="Use this box to create a route guide with distance, surface, elevation, and rider guidance for locals or visitors."
            details="The route guide stays private in this console as a draft until you publish it, and it appears on the public routes page after publish."
            pill={countLabel(draftRouteGuides.length, "route draft")}
          >
            <div className="rounded-[1.35rem] border border-[color:var(--color-border-soft)] bg-white/88 p-5">
              <RouteGuideForm organizations={organizations} />
            </div>
          </ConsoleSection>
        </section>
      ) : null}

      <section id="organizer-drafts" className="space-y-5">
        {draftOrganizations.length ? (
          <ConsoleSection
            value="organization-drafts"
            icon={Flag}
            eyebrow="Organization Drafts"
            title="Publish, edit, or delete organization drafts"
            description="Use this box to review organization profiles that are still private and decide whether to publish, revise, or remove them."
            details="Publishing makes the organization page public and allows published listings under that organization to appear on the site."
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
                      Publish organization
                    </Button>
                  </form>
                  <Button asChild variant="outline" className="rounded-2xl px-4">
                    <Link href={`/organizer/organizations/${organization.id}`}>Edit organization profile</Link>
                  </Button>
                  <form action={removeOrganization.bind(null, organization.id)}>
                    <ConfirmSubmitButton
                      type="submit"
                      variant="destructive"
                      className="rounded-2xl px-4"
                      confirmationMessage={`Delete ${organization.name} and all of its listings?`}
                    >
                      Delete organization
                    </ConfirmSubmitButton>
                  </form>
                </ManagementCard>
              ))}
            </div>
          </ConsoleSection>
        ) : null}

        {totalPublishedItems ? <div id="organizer-live" className="scroll-mt-28" /> : null}

        {publishedOrganizations.length ? (
          <ConsoleSection
            value="organization-published"
            icon={Building2}
            eyebrow="Published Organizations"
            title="Manage published organization pages"
            description="Use this box to open, edit, unpublish, or delete organization pages that are already live on the public site."
            details="Moving an organization back to draft hides its public page and can prevent connected listings from appearing publicly."
            pill={countLabel(publishedOrganizations.length, "published organization")}
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
                      Open public page
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="rounded-2xl px-4">
                    <Link href={`/organizer/organizations/${organization.id}`}>Edit organization profile</Link>
                  </Button>
                  <form action={moveOrganizationToDraft.bind(null, organization.id)}>
                    <Button type="submit" variant="outline" className="rounded-2xl px-4">
                      Move organization to draft
                    </Button>
                  </form>
                  <form action={removeOrganization.bind(null, organization.id)}>
                    <ConfirmSubmitButton
                      type="submit"
                      variant="destructive"
                      className="rounded-2xl px-4"
                      confirmationMessage={`Delete ${organization.name} and all of its listings?`}
                    >
                      Delete organization
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
            eyebrow="Ride Series Drafts"
            title="Publish, edit, or delete ride series drafts"
            description="Use this box to review recurring ride listings that are still private and decide whether to publish, revise, or remove them."
            details="Publishing adds the ride series to the public rides page, as long as the parent organization is already published."
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
                      Publish ride series
                    </Button>
                  </form>
                  <Button asChild variant="outline" className="rounded-2xl px-4">
                    <Link href={`/organizer/rides/${ride.id}`}>Edit ride series</Link>
                  </Button>
                  <form action={removeRideSeries.bind(null, ride.id)}>
                    <ConfirmSubmitButton
                      type="submit"
                      variant="destructive"
                      className="rounded-2xl px-4"
                      confirmationMessage={`Delete the ride series ${ride.title}?`}
                    >
                      Delete ride series
                    </ConfirmSubmitButton>
                  </form>
                  {ride.organizationListingStatus !== "PUBLISHED" ? (
                    <div className="w-full rounded-[1.15rem] border border-[color:var(--color-border-soft)] bg-[var(--color-paper-strong)]/45 px-4 py-3 text-sm leading-6 text-[var(--color-forest-muted)]">
                      The parent organization is still a draft, so this ride series will not appear
                      on the public site until that organization is published.
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
            eyebrow="Published Ride Series"
            title="Manage published ride series"
            description="Use this box to open, edit, unpublish, or delete recurring rides that are already live on the public rides page."
            details="Moving a ride series back to draft removes it from the public rides page."
            pill={countLabel(publishedRideSeries.length, "published ride series")}
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
                    <Link href={`/rides/${ride.slug}`}>Open public page</Link>
                  </Button>
                  <Button asChild variant="outline" className="rounded-2xl px-4">
                    <Link href={`/organizer/rides/${ride.id}`}>Edit ride series</Link>
                  </Button>
                  <form action={moveRideSeriesToDraft.bind(null, ride.id)}>
                    <Button type="submit" variant="outline" className="rounded-2xl px-4">
                      Move ride series to draft
                    </Button>
                  </form>
                  <form action={removeRideSeries.bind(null, ride.id)}>
                    <ConfirmSubmitButton
                      type="submit"
                      variant="destructive"
                      className="rounded-2xl px-4"
                      confirmationMessage={`Delete the ride series ${ride.title}?`}
                    >
                      Delete ride series
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
            eyebrow="Event Drafts"
            title="Publish, edit, or delete event drafts"
            description="Use this box to review event listings that are still private and decide whether to publish, revise, or remove them."
            details="Publishing adds the event to the public events page."
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
                      Publish event
                    </Button>
                  </form>
                  <Button asChild variant="outline" className="rounded-2xl px-4">
                    <Link href={`/organizer/events/${event.id}`}>Edit event</Link>
                  </Button>
                  <form action={removeEventSeries.bind(null, event.id)}>
                    <ConfirmSubmitButton
                      type="submit"
                      variant="destructive"
                      className="rounded-2xl px-4"
                      confirmationMessage={`Delete the event ${event.title}?`}
                    >
                      Delete event
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
            eyebrow="Published Events"
            title="Manage published events"
            description="Use this box to open, edit, unpublish, or delete events that are already live on the public events page."
            details="Moving an event back to draft removes it from the public events page."
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
                    <Link href={`/events/${event.slug}`}>Open public page</Link>
                  </Button>
                  <Button asChild variant="outline" className="rounded-2xl px-4">
                    <Link href={`/organizer/events/${event.id}`}>Edit event</Link>
                  </Button>
                  <form action={moveEventSeriesToDraft.bind(null, event.id)}>
                    <Button type="submit" variant="outline" className="rounded-2xl px-4">
                      Move event to draft
                    </Button>
                  </form>
                  <form action={removeEventSeries.bind(null, event.id)}>
                    <ConfirmSubmitButton
                      type="submit"
                      variant="destructive"
                      className="rounded-2xl px-4"
                      confirmationMessage={`Delete the event ${event.title}?`}
                    >
                      Delete event
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
            eyebrow="Route Guide Drafts"
            title="Publish, edit, or delete route guide drafts"
            description="Use this box to review route guides that are still private and decide whether to publish, revise, or remove them."
            details="Publishing adds the route guide to the public routes page."
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
                      Publish route guide
                    </Button>
                  </form>
                  <Button asChild variant="outline" className="rounded-2xl px-4">
                    <Link href={`/organizer/routes/${route.id}`}>Edit route guide</Link>
                  </Button>
                  <form action={removeRouteGuide.bind(null, route.id)}>
                    <ConfirmSubmitButton
                      type="submit"
                      variant="destructive"
                      className="rounded-2xl px-4"
                      confirmationMessage={`Delete the route guide ${route.title}?`}
                    >
                      Delete route guide
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
            eyebrow="Published Route Guides"
            title="Manage published route guides"
            description="Use this box to open, edit, unpublish, or delete route guides that are already live on the public routes page."
            details="Moving a route guide back to draft removes it from the public routes page."
            pill={countLabel(publishedRouteGuides.length, "published route guide")}
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
                    <Link href={`/routes/${route.slug}`}>Open public page</Link>
                  </Button>
                  <Button asChild variant="outline" className="rounded-2xl px-4">
                    <Link href={`/organizer/routes/${route.id}`}>Edit route guide</Link>
                  </Button>
                  <form action={moveRouteGuideToDraft.bind(null, route.id)}>
                    <Button type="submit" variant="outline" className="rounded-2xl px-4">
                      Move route guide to draft
                    </Button>
                  </form>
                  <form action={removeRouteGuide.bind(null, route.id)}>
                    <ConfirmSubmitButton
                      type="submit"
                      variant="destructive"
                      className="rounded-2xl px-4"
                      confirmationMessage={`Delete the route guide ${route.title}?`}
                    >
                      Delete route guide
                    </ConfirmSubmitButton>
                  </form>
                </ManagementCard>
              ))}
            </div>
          </ConsoleSection>
        ) : null}
      </section>
    </PageShell>
  );
}
