import { redirect } from "next/navigation";
import { VerificationStatus } from "@/app/generated/prisma/enums";
import { updateOrganizationVerificationStatusAction } from "@/app/actions/admin";
import {
  approveVerificationRequestAction,
  rejectVerificationRequestAction,
} from "@/app/actions/organizer";
import { AdminNewsletterConsole } from "@/components/admin-newsletter-console";
import { PageShell, SectionHeading } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth/user";
import { getAdminNewsletterData } from "@/lib/newsletter";
import { getAdminDashboardData, getUserLookupData } from "@/lib/data/dashboard";

async function approveVerification(requestId: string) {
  "use server";
  await approveVerificationRequestAction(requestId, "Approved from admin console.");
}

async function rejectVerification(requestId: string) {
  "use server";
  await rejectVerificationRequestAction(
    requestId,
    "Please add more organizer proof and resubmit.",
  );
}

async function markOrganizationVerified(organizationId: string) {
  "use server";
  await updateOrganizationVerificationStatusAction(
    organizationId,
    VerificationStatus.APPROVED,
  );
}

async function removeOrganizationVerifiedBadge(organizationId: string) {
  "use server";
  await updateOrganizationVerificationStatusAction(
    organizationId,
    VerificationStatus.PENDING,
  );
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const user = await getCurrentUser();

  if (!user) {
    redirect("/auth/signin?returnTo=/admin");
  }

  if (user.globalRole !== "ADMIN") {
    redirect("/account");
  }

  const dashboard = await getAdminDashboardData();
  const newsletterData = await getAdminNewsletterData();
  const users = await getUserLookupData(
    Array.isArray(params.q) ? params.q[0] : params.q,
  );

  return (
    <PageShell className="gap-8">
      <SectionHeading
        eyebrow="Admin console"
        title="Moderation, approvals, sponsors, and site settings"
        description="A simple operational console for one admin to keep organizers, content, and recurring schedules healthy."
      />
      <section className="grid gap-5 lg:grid-cols-5">
        {Object.entries(dashboard.stats).map(([key, value]) => (
          <div key={key} className="surface-card p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-forest-soft)]">
              {key.replace(/([A-Z])/g, " $1")}
            </p>
            <h2 className="mt-3 font-heading text-3xl text-[var(--color-pine)]">{value}</h2>
          </div>
        ))}
      </section>
      <AdminNewsletterConsole data={newsletterData} />
      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="surface-card space-y-4 p-6">
          <h2 className="font-heading text-3xl text-[var(--color-pine)]">Verification queue</h2>
          <div className="grid gap-4">
            {dashboard.verificationRequests.map((request) => (
              <div
                key={request.id}
                className="rounded-[1.25rem] border border-[color:var(--color-border-soft)] bg-white/70 p-4"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-forest-soft)]">
                  {request.status}
                </p>
                <h3 className="mt-2 font-heading text-2xl text-[var(--color-pine)]">
                  {request.organizationName}
                </h3>
                <p className="text-sm leading-7 text-[var(--color-forest-muted)]">
                  {request.user.email} · {request.organizationType.replaceAll("_", " ")}
                </p>
                <p className="mt-2 text-sm leading-6 text-[var(--color-forest-muted)]">
                  {request.note}
                </p>
                {request.status === "PENDING" ? (
                  <div className="mt-4 flex gap-3">
                    <form action={approveVerification.bind(null, request.id)}>
                      <Button type="submit" className="rounded-2xl px-4">
                        Approve
                      </Button>
                    </form>
                    <form action={rejectVerification.bind(null, request.id)}>
                      <Button type="submit" variant="outline" className="rounded-2xl px-4">
                        Reject
                      </Button>
                    </form>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-6">
          <div className="surface-card space-y-4 p-6">
            <h2 className="font-heading text-3xl text-[var(--color-pine)]">
              Organization verification
            </h2>
            <p className="text-sm leading-7 text-[var(--color-forest-muted)]">
              Add or remove the verified badge on published clubs, shops, and services without
              waiting for a fresh organizer request.
            </p>
            <div className="grid gap-3">
              {dashboard.organizations.map((organization) => {
                const isVerified =
                  organization.verificationStatus === VerificationStatus.APPROVED;

                return (
                  <div
                    key={organization.id}
                    className="rounded-[1.1rem] border border-[color:var(--color-border-soft)] bg-white/70 px-4 py-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-1">
                        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-forest-soft)]">
                          {organization.verificationStatus} ·{" "}
                          {organization.type.replaceAll("_", " ")}
                        </p>
                        <p className="font-medium text-[var(--color-pine)]">
                          {organization.name}
                        </p>
                        <p className="text-sm text-[var(--color-forest-muted)]">
                          {organization.city} · {organization.listingStatus.replaceAll("_", " ")}
                        </p>
                      </div>
                      <form
                        action={
                          isVerified
                            ? removeOrganizationVerifiedBadge.bind(null, organization.id)
                            : markOrganizationVerified.bind(null, organization.id)
                        }
                      >
                        <Button
                          type="submit"
                          variant={isVerified ? "outline" : "default"}
                          className="rounded-2xl px-4"
                        >
                          {isVerified ? "Remove verified badge" : "Mark verified"}
                        </Button>
                      </form>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="surface-card space-y-4 p-6">
            <h2 className="font-heading text-3xl text-[var(--color-pine)]">Reports</h2>
            <div className="grid gap-3">
              {dashboard.reports.map((report) => (
                <div
                  key={report.id}
                  className="rounded-[1.1rem] border border-[color:var(--color-border-soft)] bg-white/70 px-4 py-4"
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-forest-soft)]">
                    {report.status}
                  </p>
                  <p className="mt-2 text-sm font-medium text-[var(--color-pine)]">
                    {report.reason.replaceAll("_", " ")}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-[var(--color-forest-muted)]">
                    {report.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
          <div className="surface-card space-y-4 p-6">
            <h2 className="font-heading text-3xl text-[var(--color-pine)]">Stale recurring rides</h2>
            <div className="grid gap-3">
              {dashboard.staleRides.map((ride) => (
                <div
                  key={ride.id}
                  className="rounded-[1.1rem] border border-[color:var(--color-border-soft)] bg-white/70 px-4 py-4"
                >
                  <p className="text-sm font-medium text-[var(--color-pine)]">{ride.title}</p>
                  <p className="text-sm text-[var(--color-forest-muted)]">{ride.organization.name}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
      <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="surface-card space-y-4 p-6">
          <h2 className="font-heading text-3xl text-[var(--color-pine)]">User lookup</h2>
          <form className="grid gap-3">
            <input
              type="text"
              name="q"
              defaultValue={Array.isArray(params.q) ? params.q[0] : params.q}
              placeholder="Search by email or display name"
              className="h-11 rounded-2xl border border-[color:var(--color-border-soft)] bg-white/85 px-4 text-sm"
            />
            <Button type="submit" className="w-fit rounded-2xl px-5">
              Search users
            </Button>
          </form>
          <div className="grid gap-3">
            {users.map((lookupUser) => (
              <div
                key={lookupUser.id}
                className="rounded-[1.1rem] border border-[color:var(--color-border-soft)] bg-white/70 px-4 py-4"
              >
                <p className="font-medium text-[var(--color-pine)]">{lookupUser.email}</p>
                <p className="text-sm text-[var(--color-forest-muted)]">
                  {lookupUser.displayName || "No display name"} · {lookupUser.globalRole}
                </p>
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-6">
          <div className="surface-card space-y-4 p-6">
            <h2 className="font-heading text-3xl text-[var(--color-pine)]">Sponsor placements</h2>
            <div className="grid gap-3">
              {dashboard.sponsorPlacements.map((placement) => (
                <div
                  key={placement.id}
                  className="rounded-[1.1rem] border border-[color:var(--color-border-soft)] bg-white/70 px-4 py-4"
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-forest-soft)]">
                    {placement.slot}
                  </p>
                  <p className="mt-2 font-medium text-[var(--color-pine)]">{placement.title}</p>
                  <p className="text-sm text-[var(--color-forest-muted)]">{placement.href}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="surface-card space-y-4 p-6">
            <h2 className="font-heading text-3xl text-[var(--color-pine)]">Site settings</h2>
            <div className="grid gap-3">
              {dashboard.siteSettings.map((setting) => (
                <div
                  key={setting.key}
                  className="rounded-[1.1rem] border border-[color:var(--color-border-soft)] bg-white/70 px-4 py-4"
                >
                  <p className="font-medium text-[var(--color-pine)]">{setting.key}</p>
                  <pre className="mt-2 overflow-auto text-xs text-[var(--color-forest-muted)]">
                    {JSON.stringify(setting.value, null, 2)}
                  </pre>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
