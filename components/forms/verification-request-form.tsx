"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { createVerificationRequestAction } from "@/app/actions/organizer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { verificationRequestSchema } from "@/lib/validators";
import { sonomaCities } from "@/lib/site";

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

export function VerificationRequestForm() {
  const form = useForm({
    resolver: zodResolver(verificationRequestSchema),
    defaultValues: {
      organizationName: "",
      organizationType: "CLUB",
      websiteOrSocialUrl: "",
      note: "",
    },
  });
  const [isPending, startTransition] = useTransition();

  return (
    <form
      className="grid gap-5"
      onSubmit={form.handleSubmit((values) =>
        startTransition(async () => {
          const result = await createVerificationRequestAction(values as Parameters<typeof createVerificationRequestAction>[0]);

          if (!result.ok) {
            toast.error(result.message || "Unable to submit request.");
            return;
          }

          toast.success(result.message);
          form.reset();
        }),
      )}
    >
      <div className="grid gap-2">
        <label className="text-sm font-medium text-[var(--color-pine)]">Organization name</label>
        <Input {...form.register("organizationName")} className="rounded-2xl bg-white/85" />
      </div>
      <div className="grid gap-2">
        <label className="text-sm font-medium text-[var(--color-pine)]">Organization type</label>
        <select
          {...form.register("organizationType")}
          className="h-12 rounded-2xl border border-[color:var(--color-border-soft)] bg-white/85 px-4 text-sm"
        >
          {types.map((type) => (
            <option key={type} value={type}>
              {type.replaceAll("_", " ")}
            </option>
          ))}
        </select>
      </div>
      <div className="grid gap-2">
        <label className="text-sm font-medium text-[var(--color-pine)]">Website or social link</label>
        <Input {...form.register("websiteOrSocialUrl")} className="rounded-2xl bg-white/85" />
      </div>
      <div className="grid gap-2">
        <label className="text-sm font-medium text-[var(--color-pine)]">Short verification note</label>
        <Textarea
          {...form.register("note")}
          rows={5}
          className="rounded-2xl bg-white/85"
          placeholder={`Tell the admin who you are, what you organize, and which Sonoma communities you serve. Cities covered might include ${sonomaCities.slice(0, 4).join(", ")}.`}
        />
      </div>
      <Button type="submit" disabled={isPending} className="w-fit rounded-2xl px-6">
        Submit request
      </Button>
    </form>
  );
}
