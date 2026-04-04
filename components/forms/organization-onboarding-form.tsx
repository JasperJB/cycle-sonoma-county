"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import {
  createOrganizationAction,
  updateOrganizationAction,
} from "@/app/actions/organizer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  organizationOnboardingSchema,
  type OrganizationOnboardingInput,
} from "@/lib/validators";

const types = [
  "SHOP",
  "BIKE_FRIENDLY_BUSINESS",
  "CLUB",
  "TEAM",
  "ADVOCACY",
  "EVENT_PROMOTER",
  "COACH",
  "INFORMAL_GROUP",
] as const;

function buildDefaultValues(
  initialValues?: Partial<OrganizationOnboardingInput>,
): OrganizationOnboardingInput {
  return {
    organizationType: initialValues?.organizationType || "CLUB",
    name: initialValues?.name || "",
    shortDescription: initialValues?.shortDescription || "",
    description: initialValues?.description || "",
    city: initialValues?.city || "",
    websiteUrl: initialValues?.websiteUrl || "",
    socialUrl: initialValues?.socialUrl || "",
    addressLine1: initialValues?.addressLine1 || "",
    offersRentals: initialValues?.offersRentals || false,
    latitude: initialValues?.latitude,
    longitude: initialValues?.longitude,
  };
}

export function OrganizationOnboardingForm({
  organizationId,
  initialValues,
  submitLabel = "Save organization draft",
  redirectTo,
}: {
  organizationId?: string;
  initialValues?: Partial<OrganizationOnboardingInput>;
  submitLabel?: string;
  redirectTo?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const defaultValues = buildDefaultValues(initialValues);
  const form = useForm({
    resolver: zodResolver(organizationOnboardingSchema),
    defaultValues,
  });
  const organizationType = useWatch({
    control: form.control,
    name: "organizationType",
  });
  const showRentalOption =
    organizationType === "SHOP" || organizationType === "BIKE_FRIENDLY_BUSINESS";

  return (
    <form
      className="grid gap-4"
      onSubmit={form.handleSubmit((values) =>
        startTransition(async () => {
          const result = organizationId
            ? await updateOrganizationAction(organizationId, values as OrganizationOnboardingInput)
            : await createOrganizationAction(values as OrganizationOnboardingInput);

          if (!result.ok) {
            toast.error(result.message || "Unable to save organization.");
            return;
          }

          toast.success(result.message);

          if (redirectTo) {
            router.push(redirectTo);
            return;
          }

          if (!organizationId) {
            form.reset(buildDefaultValues());
          }

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
        <label className="text-sm font-medium text-[var(--color-pine)]">
          Address or meetup spot
        </label>
        <Input
          {...form.register("addressLine1")}
          placeholder="123 Example St"
          className="rounded-2xl bg-white/85"
        />
        <p className="text-xs text-[var(--color-forest-muted)]">
          This address is geocoded when you save so the organization can show up on the explore map.
        </p>
      </div>
      {showRentalOption ? (
        <label className="flex items-center gap-2 text-sm text-[var(--color-pine)]">
          <input type="checkbox" {...form.register("offersRentals")} />
          Has bike rental services
        </label>
      ) : null}
      <Button type="submit" disabled={isPending} className="w-fit rounded-2xl px-6">
        {submitLabel}
      </Button>
    </form>
  );
}
