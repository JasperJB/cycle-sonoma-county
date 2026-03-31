"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { createEventSeriesAction } from "@/app/actions/organizer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { eventSeriesSchema } from "@/lib/validators";

export function EventSeriesForm({
  organizations,
}: {
  organizations: Array<{ id: string; name: string; type: string }>;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const form = useForm({
    resolver: zodResolver(eventSeriesSchema),
    defaultValues: {
      organizationId: organizations[0]?.id || "",
      title: "",
      summary: "",
      description: "",
      city: "",
      eventType: "CLINIC",
      startsAtDate: "",
      startsAtTime: "09:00",
      endsAtDate: "",
      endsAtTime: "12:00",
      locationName: "",
      locationAddress: "",
      registrationUrl: "",
      priceText: "",
      isRecurring: false,
      recurrenceMode: "MONTHLY",
      recurrenceInterval: 1,
      monthlyWeek: 1,
      monthlyWeekday: "SA",
    },
  });

  return (
    <form
      className="grid gap-4"
      onSubmit={form.handleSubmit((values) =>
        startTransition(async () => {
          const result = await createEventSeriesAction(values as Parameters<typeof createEventSeriesAction>[0]);

          if (!result.ok) {
            toast.error(result.message || "Unable to create event.");
            return;
          }

          toast.success(result.message);
          router.refresh();
        }),
      )}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <select {...form.register("organizationId")} className="h-11 rounded-2xl border border-[color:var(--color-border-soft)] bg-white/85 px-4 text-sm">
          {organizations.map((organization) => (
            <option key={organization.id} value={organization.id}>
              {organization.name}
            </option>
          ))}
        </select>
        <Input {...form.register("city")} placeholder="City" className="rounded-2xl bg-white/85" />
      </div>
      <Input {...form.register("title")} placeholder="Event title" className="rounded-2xl bg-white/85" />
      <Textarea {...form.register("summary")} placeholder="Short summary" className="rounded-2xl bg-white/85" rows={3} />
      <div className="grid gap-4 sm:grid-cols-2">
        <select {...form.register("eventType")} className="h-11 rounded-2xl border border-[color:var(--color-border-soft)] bg-white/85 px-4 text-sm">
          {["RACE", "FONDO", "CLINIC", "TRAIL_WORK_DAY", "SWAP_MEET", "ADVOCACY_MEETING", "FESTIVAL", "YOUTH_EVENT", "OTHER"].map((type) => (
            <option key={type} value={type}>
              {type.replaceAll("_", " ")}
            </option>
          ))}
        </select>
        <Input {...form.register("priceText")} placeholder="Price text" className="rounded-2xl bg-white/85" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input type="date" {...form.register("startsAtDate")} className="rounded-2xl bg-white/85" />
        <Input type="time" {...form.register("startsAtTime")} className="rounded-2xl bg-white/85" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input type="date" {...form.register("endsAtDate")} className="rounded-2xl bg-white/85" />
        <Input type="time" {...form.register("endsAtTime")} className="rounded-2xl bg-white/85" />
      </div>
      <Input {...form.register("locationName")} placeholder="Location name" className="rounded-2xl bg-white/85" />
      <Input {...form.register("registrationUrl")} placeholder="Registration URL" className="rounded-2xl bg-white/85" />
      <label className="flex items-center gap-2 text-sm text-[var(--color-pine)]">
        <input type="checkbox" {...form.register("isRecurring")} />
        Recurring event series
      </label>
      <Button type="submit" disabled={isPending} className="w-fit rounded-2xl px-6">
        Create event draft
      </Button>
    </form>
  );
}
