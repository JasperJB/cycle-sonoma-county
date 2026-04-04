import { formatInTimeZone } from "date-fns-tz";
import {
  forceSendNewsletterAction,
  overrideNewsletterOrganizationDraftAction,
  previewNewsletterAction,
  saveNewsletterGlobalSectionAction,
} from "@/app/actions/admin";
import { NewsletterRichTextEditor } from "@/components/forms/newsletter-rich-text-editor";
import { Button } from "@/components/ui/button";

function formatTimestamp(date: Date | null | undefined) {
  if (!date) {
    return "Not yet";
  }

  return formatInTimeZone(date, "America/Los_Angeles", "MMM d, yyyy • h:mm a");
}

export function AdminNewsletterConsole({ data }: { data: Awaited<ReturnType<typeof import("@/lib/newsletter").getAdminNewsletterData>> }) {
  async function saveGlobalSection(formData: FormData) {
    "use server";
    await saveNewsletterGlobalSectionAction({
      content: String(formData.get("content") || ""),
    });
  }

  async function saveOverride(organizationId: string, formData: FormData) {
    "use server";
    await overrideNewsletterOrganizationDraftAction({
      organizationId,
      content: String(formData.get("content") || ""),
    });
  }

  async function previewIssue() {
    "use server";
    await previewNewsletterAction();
  }

  async function sendIssue() {
    "use server";
    await forceSendNewsletterAction();
  }

  return (
    <section id="newsletter-console" className="grid gap-6">
      <div className="surface-card space-y-4 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-forest-soft)]">
              Admin / Newsletter console
            </p>
            <h2 className="font-heading text-3xl text-[var(--color-pine)]">
              Weekly tailored newsletter
            </h2>
            <p className="max-w-3xl text-sm leading-7 text-[var(--color-forest-muted)]">
              Review the current issue, write the global section, override organization notes when
              needed, and preview or send the weekly issue.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full border border-[color:var(--color-border-soft)] bg-white/80 px-3 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-[var(--color-pine)]">
              Week of {data.issue.schedule.label}
            </span>
            <span className="rounded-full border border-[color:var(--color-border-soft)] bg-white/80 px-3 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-[var(--color-pine)]">
              {data.issue.displayStatus}
            </span>
          </div>
        </div>
        <div className="grid gap-4 lg:grid-cols-4">
          <div className="rounded-[1.2rem] border border-[color:var(--color-border-soft)] bg-white/75 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-forest-soft)]">
              Reminder
            </p>
            <p className="mt-2 text-sm text-[var(--color-pine)]">
              Thu 9:00 AM PT
            </p>
            <p className="mt-1 text-sm text-[var(--color-forest-muted)]">
              {data.issue.reminderSentAt
                ? `${data.issue.reminderDryRun ? "Dry run" : "Sent"} to ${data.issue.reminderSentCount} manager${data.issue.reminderSentCount === 1 ? "" : "s"}`
                : "Waiting to send"}
            </p>
          </div>
          <div className="rounded-[1.2rem] border border-[color:var(--color-border-soft)] bg-white/75 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-forest-soft)]">
              Organizer lock
            </p>
            <p className="mt-2 text-sm text-[var(--color-pine)]">
              Fri 6:00 PM PT
            </p>
            <p className="mt-1 text-sm text-[var(--color-forest-muted)]">
              {formatTimestamp(data.issue.lockedAt)}
            </p>
          </div>
          <div className="rounded-[1.2rem] border border-[color:var(--color-border-soft)] bg-white/75 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-forest-soft)]">
              Send window
            </p>
            <p className="mt-2 text-sm text-[var(--color-pine)]">
              Sat 6:00 PM PT
            </p>
            <p className="mt-1 text-sm text-[var(--color-forest-muted)]">
              {data.issue.sentAt
                ? `${data.issue.sendDryRun ? "Dry run" : "Sent"} • ${data.issue.sentCount} delivered`
                : "Waiting to send"}
            </p>
          </div>
          <div className="rounded-[1.2rem] border border-[color:var(--color-border-soft)] bg-white/75 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-forest-soft)]">
              Draft coverage
            </p>
            <p className="mt-2 text-sm text-[var(--color-pine)]">
              {data.stats.draftsSubmitted} submitted / {data.stats.draftsMissing} missing
            </p>
            <p className="mt-1 text-sm text-[var(--color-forest-muted)]">
              {data.stats.overriddenDrafts} admin override{data.stats.overriddenDrafts === 1 ? "" : "s"}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
        <div className="surface-card space-y-4 p-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-forest-soft)]">
              Global section
            </p>
            <h3 className="mt-2 font-heading text-3xl text-[var(--color-pine)]">
              Admin-wide message
            </h3>
          </div>
          <form action={saveGlobalSection} className="space-y-4">
            <NewsletterRichTextEditor
              name="content"
              label="Admin-wide message"
              rows={9}
              defaultValue={data.issue.globalSection || ""}
              className="rounded-2xl bg-white/90"
              placeholder="Write the section that every newsletter recipient should receive."
            />
            <Button type="submit" className="rounded-2xl px-5">
              Save global section
            </Button>
          </form>
        </div>

        <div className="surface-card space-y-4 p-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-forest-soft)]">
              Preview and send
            </p>
            <h3 className="mt-2 font-heading text-3xl text-[var(--color-pine)]">
              Final assembled variants
            </h3>
            <p className="mt-2 text-sm leading-7 text-[var(--color-forest-muted)]">
              Linked subscribers receive the admin section, followed-organization notes, and the
              county-wide week-ahead roundup. Unlinked subscribers keep the admin-only fallback.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <form action={previewIssue}>
              <Button type="submit" className="rounded-2xl px-5">
                Refresh previews
              </Button>
            </form>
            <form action={sendIssue}>
              <Button type="submit" variant="outline" className="rounded-2xl px-5">
                Send current issue now
              </Button>
            </form>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-[1.2rem] border border-[color:var(--color-border-soft)] bg-white/80 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-forest-soft)]">
                Linked preview
              </p>
              <div className="mt-3 max-h-[28rem] overflow-auto rounded-[1rem] border border-[color:var(--color-border-soft)] bg-[var(--color-paper-strong)]/35 p-4">
                {data.issue.linkedPreviewHtml ? (
                  <div dangerouslySetInnerHTML={{ __html: data.issue.linkedPreviewHtml }} />
                ) : (
                  <p className="text-sm text-[var(--color-forest-muted)]">
                    Generate a preview to store the linked-recipient snapshot.
                  </p>
                )}
              </div>
            </div>
            <div className="rounded-[1.2rem] border border-[color:var(--color-border-soft)] bg-white/80 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-forest-soft)]">
                Unlinked preview
              </p>
              <div className="mt-3 max-h-[28rem] overflow-auto rounded-[1rem] border border-[color:var(--color-border-soft)] bg-[var(--color-paper-strong)]/35 p-4">
                {data.issue.unlinkedPreviewHtml ? (
                  <div dangerouslySetInnerHTML={{ __html: data.issue.unlinkedPreviewHtml }} />
                ) : (
                  <p className="text-sm text-[var(--color-forest-muted)]">
                    Generate a preview to store the admin-only fallback snapshot.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="surface-card space-y-4 p-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-forest-soft)]">
            Organization drafts
          </p>
          <h3 className="mt-2 font-heading text-3xl text-[var(--color-pine)]">
            Contribution status and overrides
          </h3>
        </div>
        <div className="grid gap-4">
          {data.rows.map((row) => (
            <div
              key={row.organization.id}
              className="rounded-[1.2rem] border border-[color:var(--color-border-soft)] bg-white/78 p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-forest-soft)]">
                      {row.organization.type.replaceAll("_", " ")}
                    </p>
                    <span className="rounded-full border border-[color:var(--color-border-soft)] bg-[var(--color-paper-strong)]/55 px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[var(--color-pine)]">
                      {row.draft ? "Submitted" : "Missing"}
                    </span>
                    {row.draft?.adminOverridden ? (
                      <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-amber-800">
                        Admin overridden
                      </span>
                    ) : null}
                  </div>
                  <h4 className="font-heading text-2xl text-[var(--color-pine)]">
                    {row.organization.name}
                  </h4>
                  <p className="text-sm text-[var(--color-forest-muted)]">
                    {row.organization.city} • {row.managerCount} manager{row.managerCount === 1 ? "" : "s"}
                  </p>
                  <p className="text-sm text-[var(--color-forest-muted)]">
                    {row.draft
                      ? `Last edited by ${row.draft.lastEditedByName} • ${formatTimestamp(row.draft.updatedAt)}`
                      : "No organization note has been saved for this issue."}
                  </p>
                </div>
                <div className="max-w-lg text-sm text-[var(--color-forest-muted)]">
                  {row.managers.length
                    ? row.managers.map((manager) => `${manager.name} (${manager.role.toLowerCase()})`).join(", ")
                    : "No owner/editor managers are attached to this organization."}
                </div>
              </div>
              <form action={saveOverride.bind(null, row.organization.id)} className="mt-4 space-y-3">
                <NewsletterRichTextEditor
                  name="content"
                  label={`Override for ${row.organization.name}`}
                  rows={5}
                  defaultValue={row.draft?.content || ""}
                  className="rounded-2xl bg-white/90"
                  placeholder="Write or replace the organization-specific note for this issue."
                />
                <Button type="submit" variant="outline" className="rounded-2xl px-5">
                  Save admin override
                </Button>
              </form>
            </div>
          ))}
        </div>
      </div>

      <div className="surface-card space-y-4 p-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-forest-soft)]">
            Issue history
          </p>
          <h3 className="mt-2 font-heading text-3xl text-[var(--color-pine)]">
            Recent weekly issues
          </h3>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          {data.history.map((issue) => (
            <div
              key={issue.id}
              className="rounded-[1.2rem] border border-[color:var(--color-border-soft)] bg-white/78 p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-forest-soft)]">
                    Week of {issue.schedule.label}
                  </p>
                  <h4 className="mt-2 font-heading text-2xl text-[var(--color-pine)]">
                    {issue.displayStatus}
                  </h4>
                </div>
                <span className="rounded-full border border-[color:var(--color-border-soft)] bg-[var(--color-paper-strong)]/55 px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[var(--color-pine)]">
                  {issue.sendDryRun ? "Dry run" : "Live"}
                </span>
              </div>
              <p className="mt-3 text-sm text-[var(--color-forest-muted)]">
                Reminder: {issue.reminderSentAt ? formatTimestamp(issue.reminderSentAt) : "Not yet"}
              </p>
              <p className="text-sm text-[var(--color-forest-muted)]">
                Sent: {issue.sentAt ? `${formatTimestamp(issue.sentAt)} • ${issue.sentCount} delivered` : "Not yet"}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
