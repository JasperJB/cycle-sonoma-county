"use client";

import { OrganizationMembershipRole } from "@/app/generated/prisma/enums";
import { createOrganizationInviteAction } from "@/app/actions/organizer";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

const roleOptions = [
  {
    value: OrganizationMembershipRole.EDITOR,
    label: "Editor",
    description: "Can manage this organization's content.",
  },
  {
    value: OrganizationMembershipRole.OWNER,
    label: "Owner",
    description: "Can manage content and share access with others.",
  },
  {
    value: OrganizationMembershipRole.CONTRIBUTOR,
    label: "Contributor",
    description: "Stores a collaborator label while keeping organizer editing access.",
  },
] as const;

export function OrganizationInviteForm({
  organizations,
}: {
  organizations: Array<{
    id: string;
    name: string;
    type: string;
  }>;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<OrganizationMembershipRole>(OrganizationMembershipRole.EDITOR);
  const [selectedOrganizationIds, setSelectedOrganizationIds] = useState<string[]>(
    organizations.length === 1 ? [organizations[0].id] : [],
  );
  const [inviteUrl, setInviteUrl] = useState("");
  const [isPending, startTransition] = useTransition();

  const toggleOrganization = (organizationId: string, checked: boolean) => {
    setSelectedOrganizationIds((current) =>
      checked
        ? current.includes(organizationId)
          ? current
          : [...current, organizationId]
        : current.filter((id) => id !== organizationId),
    );
  };

  const copyInviteLink = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Invite link copied.");
    } catch {
      toast.success("Invite link created.");
    }
  };

  return (
    <form
      className="grid gap-5"
      onSubmit={(event) => {
        event.preventDefault();
        startTransition(async () => {
          const result = await createOrganizationInviteAction({
            email,
            organizationIds: selectedOrganizationIds,
            role,
          });

          if (!result.ok) {
            toast.error(result.message || "Unable to create invite link.");
            return;
          }

          setInviteUrl(result.inviteUrl || "");
          if (result.inviteUrl) {
            void copyInviteLink(result.inviteUrl);
          }
          if (result.skippedOrganizationNames?.length) {
            toast.info(
              `${result.skippedOrganizationNames.join(", ")} already had access and were skipped.`,
            );
          }
          setEmail("");
          router.refresh();
        });
      }}
    >
      <div className="grid gap-2">
        <Label htmlFor="invite-email">Invitee email</Label>
        <Input
          id="invite-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="h-12 rounded-2xl"
          placeholder="person@example.com"
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="invite-role">Access level</Label>
        <select
          id="invite-role"
          value={role}
          onChange={(event) => setRole(event.target.value as OrganizationMembershipRole)}
          className="h-12 rounded-2xl border border-[color:var(--color-border-soft)] bg-white/85 px-4 text-sm"
        >
          {roleOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <p className="text-sm leading-6 text-[var(--color-forest-muted)]">
          {roleOptions.find((option) => option.value === role)?.description}
        </p>
      </div>
      <div className="grid gap-3">
        <p className="text-sm font-medium text-[var(--color-pine)]">Organizations to share</p>
        <div className="grid gap-3">
          {organizations.map((organization) => {
            const checked = selectedOrganizationIds.includes(organization.id);

            return (
              <label
                key={organization.id}
                className="flex items-start gap-3 rounded-[1.25rem] border border-[color:var(--color-border-soft)] bg-white/70 px-4 py-3"
              >
                <Checkbox
                  checked={checked}
                  onCheckedChange={(value) => toggleOrganization(organization.id, Boolean(value))}
                  className="mt-1"
                />
                <span className="min-w-0">
                  <span className="block font-medium text-[var(--color-pine)]">
                    {organization.name}
                  </span>
                  <span className="block text-sm text-[var(--color-forest-muted)]">
                    {organization.type.replaceAll("_", " ")}
                  </span>
                </span>
              </label>
            );
          })}
        </div>
      </div>
      {inviteUrl ? (
        <div className="rounded-2xl border border-[color:var(--color-border-soft)] bg-white/70 p-4">
          <p className="text-sm font-medium text-[var(--color-pine)]">Invite link</p>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row">
            <Input readOnly value={inviteUrl} className="rounded-2xl bg-white/85" />
            <Button
              type="button"
              variant="outline"
              className="rounded-2xl px-4"
              onClick={() => void copyInviteLink(inviteUrl)}
            >
              Copy link
            </Button>
          </div>
        </div>
      ) : null}
      <Button type="submit" disabled={isPending} className="w-fit rounded-2xl px-6">
        {isPending ? "Creating invite..." : "Create invite link"}
      </Button>
    </form>
  );
}
