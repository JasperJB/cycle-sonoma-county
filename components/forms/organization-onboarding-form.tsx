"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { createOrganizationAction } from "@/app/actions/organizer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { organizationOnboardingSchema } from "@/lib/validators";

const types = [
  "SHOP",
  "CLUB",
  "TEAM",
  "ADVOCACY",
  "EVENT_PROMOTER",
  "COACH",
  "INFORMAL_GROUP",
] as const;

export function OrganizationOnboardingForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const form = useForm({
    resolver: zodResolver(organizationOnboardingSchema),
    defaultValues: {
      organizationType: "CLUB",
      name: "",
      shortDescription: "",
      description: "",
      city: "",
      websiteUrl: "",
      socialUrl: "",
      addressLine1: "",
    },
  });

  return (
    <form
      className="grid gap-4"
      onSubmit={form.handleSubmit((values) =>
        startTransition(async () => {
          const result = await createOrganizationAction(values as Parameters<typeof createOrganizationAction>[0]);

          if (!result.ok) {
            toast.error(result.message || "Unable to create organization.");
            return;
          }

          toast.success(result.message);
          router.refresh();
        }),
      )}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <label className="text-sm font-medium text-[var(--color-pine)]">Type</label>
          <select
            {...form.register("organizationType")}
            className="h-11 rounded-2xl border border-[color:var(--color-border-soft)] bg-white/85 px-4 text-sm"
          >
            {types.map((type) => (
              <option key={type} value={type}>
                {type.replaceAll("_", " ")}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-2">
          <label className="text-sm font-medium text-[var(--color-pine)]">City</label>
          <Input {...form.register("city")} className="rounded-2xl bg-white/85" />
        </div>
      </div>
      <div className="grid gap-2">
        <label className="text-sm font-medium text-[var(--color-pine)]">Organization name</label>
        <Input {...form.register("name")} className="rounded-2xl bg-white/85" />
      </div>
      <div className="grid gap-2">
        <label className="text-sm font-medium text-[var(--color-pine)]">Short description</label>
        <Textarea {...form.register("shortDescription")} className="rounded-2xl bg-white/85" rows={3} />
      </div>
      <div className="grid gap-2">
        <label className="text-sm font-medium text-[var(--color-pine)]">Longer description</label>
        <Textarea {...form.register("description")} className="rounded-2xl bg-white/85" rows={4} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <label className="text-sm font-medium text-[var(--color-pine)]">Website</label>
          <Input {...form.register("websiteUrl")} className="rounded-2xl bg-white/85" />
        </div>
        <div className="grid gap-2">
          <label className="text-sm font-medium text-[var(--color-pine)]">Social link</label>
          <Input {...form.register("socialUrl")} className="rounded-2xl bg-white/85" />
        </div>
      </div>
      <div className="grid gap-2">
        <label className="text-sm font-medium text-[var(--color-pine)]">Address (optional)</label>
        <Input {...form.register("addressLine1")} className="rounded-2xl bg-white/85" />
      </div>
      <Button type="submit" disabled={isPending} className="w-fit rounded-2xl px-6">
        Save organization draft
      </Button>
    </form>
  );
}
