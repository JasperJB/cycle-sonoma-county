"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { saveNewsletterOrganizationDraftAction } from "@/app/actions/organizer";
import { Button } from "@/components/ui/button";
import { NewsletterRichTextEditor } from "@/components/forms/newsletter-rich-text-editor";

type OrganizationOption = {
  id: string;
  name: string;
  type: string;
  city: string;
  draft: {
    content: string;
    lastEditedByName: string;
    updatedAtLabel: string;
    adminOverridden: boolean;
  } | null;
};

type DraftState = {
  content: string;
  lastEditedByName: string;
  updatedAtLabel: string;
  adminOverridden: boolean;
};

export function OrganizerNewsletterForm(props: {
  issueLabel: string;
  weekRangeLabel: string;
  deadlineLabel: string;
  sendLabel: string;
  isLocked: boolean;
  organizations: OrganizationOption[];
}) {
  const [selectedOrganizationId, setSelectedOrganizationId] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [messageTone, setMessageTone] = useState<"neutral" | "error">("neutral");
  const [drafts, setDrafts] = useState<Record<string, DraftState>>(() =>
    Object.fromEntries(
      props.organizations.map((organization) => [
        organization.id,
        {
          content: organization.draft?.content || "",
          lastEditedByName: organization.draft?.lastEditedByName || "Not yet submitted",
          updatedAtLabel: organization.draft?.updatedAtLabel || "Not yet saved",
          adminOverridden: organization.draft?.adminOverridden || false,
        },
      ]),
    ),
  );
  const [isPending, startTransition] = useTransition();

  const selectedOrganization = props.organizations.find(
    (organization) => organization.id === selectedOrganizationId,
  );
  const selectedDraft = selectedOrganizationId ? drafts[selectedOrganizationId] : null;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        <span className="rounded-full border border-[color:var(--color-border-soft)] bg-white/80 px-3 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-[var(--color-pine)]">
          {props.issueLabel}
        </span>
        <span className="rounded-full border border-[color:var(--color-border-soft)] bg-white/80 px-3 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-[var(--color-pine)]">
          Deadline {props.deadlineLabel}
        </span>
        <span className="rounded-full border border-[color:var(--color-border-soft)] bg-white/80 px-3 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-[var(--color-pine)]">
          Send {props.sendLabel}
        </span>
        <span className="rounded-full border border-[color:var(--color-border-soft)] bg-white/80 px-3 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-[var(--color-pine)]">
          {props.isLocked ? "Finalized" : "Open for edits"}
        </span>
      </div>

      <div className="grid gap-2">
        <label
          htmlFor="newsletter-organization"
          className="text-sm font-medium text-[var(--color-pine)]"
        >
          Choose an organization
        </label>
        <select
          id="newsletter-organization"
          value={selectedOrganizationId}
          onChange={(event) => {
            setSelectedOrganizationId(event.target.value);
            setMessage(null);
          }}
          className="h-11 rounded-2xl border border-[color:var(--color-border-soft)] bg-white/90 px-4 text-sm text-[var(--color-pine)]"
        >
          <option value="">Select an organization</option>
          {props.organizations.map((organization) => (
            <option key={organization.id} value={organization.id}>
              {organization.name} • {organization.type.replaceAll("_", " ")}
            </option>
          ))}
        </select>
      </div>

      {!selectedOrganization ? (
        <div className="rounded-[1.2rem] border border-dashed border-[color:var(--color-border-soft)] bg-[var(--color-paper-strong)]/45 px-4 py-5 text-sm leading-6 text-[var(--color-forest-muted)]">
          Pick an organization to load that week&apos;s shared note editor.
        </div>
      ) : (
        <div className="space-y-4 rounded-[1.3rem] border border-[color:var(--color-border-soft)] bg-white/85 p-5">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-forest-soft)]">
                {selectedOrganization.type.replaceAll("_", " ")}
              </p>
              {selectedDraft?.adminOverridden ? (
                <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-amber-800">
                  Admin override applied
                </span>
              ) : null}
            </div>
            <h3 className="font-heading text-2xl text-[var(--color-pine)]">
              {selectedOrganization.name}
            </h3>
            <p className="text-sm text-[var(--color-forest-muted)]">
              {selectedOrganization.city} • Week of {props.weekRangeLabel}
            </p>
            <p className="text-sm text-[var(--color-forest-muted)]">
              Last updated by {selectedDraft?.lastEditedByName || "Not yet submitted"} •{" "}
              {selectedDraft?.updatedAtLabel || "Not yet saved"}
            </p>
          </div>

          <div className="grid gap-2">
            <NewsletterRichTextEditor
              id={`newsletter-draft-${selectedOrganization.id}`}
              label="Organization note"
              rows={7}
              value={selectedDraft?.content || ""}
              onChange={(nextValue) =>
                setDrafts((current) => ({
                  ...current,
                  [selectedOrganization.id]: {
                    ...(current[selectedOrganization.id] || {
                      lastEditedByName: "Not yet submitted",
                      updatedAtLabel: "Not yet saved",
                      adminOverridden: false,
                    }),
                    content: nextValue,
                  },
                }))
              }
              disabled={props.isLocked || isPending}
              className="rounded-2xl bg-white/90"
              placeholder="Add the update this organization wants newsletter readers to see next week."
            />
          </div>

          {props.isLocked ? (
            <div className="rounded-[1.1rem] border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
              Organizer edits are locked for this issue. Admin can still handle emergency changes in
              the admin console until the Saturday evening send.
            </div>
          ) : null}

          {message ? (
            <p
              className={
                messageTone === "error"
                  ? "text-sm text-red-700"
                  : "text-sm text-[var(--color-forest-muted)]"
              }
            >
              {message}
            </p>
          ) : null}

          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              disabled={props.isLocked || isPending || !selectedDraft?.content.trim()}
              className="rounded-2xl px-5"
              onClick={() =>
                startTransition(async () => {
                  const result = await saveNewsletterOrganizationDraftAction({
                    organizationId: selectedOrganization.id,
                    content: selectedDraft?.content || "",
                  });

                  if (!result.ok) {
                    setMessageTone("error");
                    setMessage(result.message || "Unable to save the organization note.");
                    toast.error(result.message || "Unable to save the organization note.");
                    return;
                  }

                  setDrafts((current) => ({
                    ...current,
                    [selectedOrganization.id]: {
                      content: result.draft?.content || current[selectedOrganization.id]?.content || "",
                      lastEditedByName:
                        result.draft?.lastEditedByName ||
                        current[selectedOrganization.id]?.lastEditedByName ||
                        "Saved just now",
                      updatedAtLabel:
                        result.draft?.updatedAtLabel ||
                        current[selectedOrganization.id]?.updatedAtLabel ||
                        "Saved just now",
                      adminOverridden:
                        current[selectedOrganization.id]?.adminOverridden || false,
                    },
                  }));
                  setMessageTone("neutral");
                  setMessage(result.message || "Newsletter update saved.");
                  toast.success(result.message || "Newsletter update saved.");
                })
              }
            >
              {isPending ? "Saving..." : "Save organization note"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
