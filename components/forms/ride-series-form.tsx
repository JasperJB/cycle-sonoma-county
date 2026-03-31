"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { createRideSeriesAction } from "@/app/actions/organizer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { rideSeriesSchema } from "@/lib/validators";

const weekdays = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"] as const;

export function RideSeriesForm({
  organizations,
}: {
  organizations: Array<{ id: string; name: string; type: string }>;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const form = useForm({
    resolver: zodResolver(rideSeriesSchema),
    defaultValues: {
      organizationId: organizations[0]?.id || "",
      title: "",
      summary: "",
      description: "",
      city: "",
      rideType: "ROAD",
      paceLabel: "",
      dropPolicy: "NO_DROP",
      meetingLocationName: "",
      meetingAddress: "",
      startDate: "",
      startTimeLocal: "08:00",
      estimatedDurationMinutes: 120,
      routeUrl: "",
      recurrenceMode: "WEEKLY",
      recurrenceInterval: 1,
      weekdays: ["SA"],
      beginnerFriendly: false,
      youthFriendly: false,
    },
  });

  const selectedWeekdays = useWatch({
    control: form.control,
    name: "weekdays",
  }) || [];

  return (
    <form
      className="grid gap-4"
      onSubmit={form.handleSubmit((values) =>
        startTransition(async () => {
          const result = await createRideSeriesAction(values as Parameters<typeof createRideSeriesAction>[0]);

          if (!result.ok) {
            toast.error(result.message || "Unable to create ride.");
            return;
          }

          toast.success(result.message);
          router.refresh();
        }),
      )}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <label className="text-sm font-medium text-[var(--color-pine)]">Organization</label>
          <select
            {...form.register("organizationId")}
            className="h-11 rounded-2xl border border-[color:var(--color-border-soft)] bg-white/85 px-4 text-sm"
          >
            {organizations.map((organization) => (
              <option key={organization.id} value={organization.id}>
                {organization.name}
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
        <label className="text-sm font-medium text-[var(--color-pine)]">Ride title</label>
        <Input {...form.register("title")} className="rounded-2xl bg-white/85" />
      </div>
      <div className="grid gap-2">
        <label className="text-sm font-medium text-[var(--color-pine)]">Summary</label>
        <Textarea {...form.register("summary")} className="rounded-2xl bg-white/85" rows={3} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <label className="text-sm font-medium text-[var(--color-pine)]">Ride type</label>
          <select {...form.register("rideType")} className="h-11 rounded-2xl border border-[color:var(--color-border-soft)] bg-white/85 px-4 text-sm">
            {["ROAD", "GRAVEL", "MOUNTAIN", "E_BIKE", "COMMUTER", "SOCIAL", "TRAINING", "WOMENS", "JUNIOR", "OTHER"].map((type) => (
              <option key={type} value={type}>
                {type.replaceAll("_", " ")}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-2">
          <label className="text-sm font-medium text-[var(--color-pine)]">Drop policy</label>
          <select {...form.register("dropPolicy")} className="h-11 rounded-2xl border border-[color:var(--color-border-soft)] bg-white/85 px-4 text-sm">
            {["NO_DROP", "REGROUP", "DROP"].map((type) => (
              <option key={type} value={type}>
                {type.replaceAll("_", " ")}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="grid gap-2">
          <label className="text-sm font-medium text-[var(--color-pine)]">Pace label</label>
          <Input {...form.register("paceLabel")} className="rounded-2xl bg-white/85" />
        </div>
        <div className="grid gap-2">
          <label className="text-sm font-medium text-[var(--color-pine)]">Start date</label>
          <Input type="date" {...form.register("startDate")} className="rounded-2xl bg-white/85" />
        </div>
        <div className="grid gap-2">
          <label className="text-sm font-medium text-[var(--color-pine)]">Start time</label>
          <Input type="time" {...form.register("startTimeLocal")} className="rounded-2xl bg-white/85" />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <label className="text-sm font-medium text-[var(--color-pine)]">Meeting spot</label>
          <Input {...form.register("meetingLocationName")} className="rounded-2xl bg-white/85" />
        </div>
        <div className="grid gap-2">
          <label className="text-sm font-medium text-[var(--color-pine)]">Route link</label>
          <Input {...form.register("routeUrl")} className="rounded-2xl bg-white/85" />
        </div>
      </div>
      <div className="grid gap-3">
        <label className="text-sm font-medium text-[var(--color-pine)]">Days of week</label>
        <div className="flex flex-wrap gap-2">
          {weekdays.map((weekday) => (
            <button
              key={weekday}
              type="button"
              onClick={() =>
                form.setValue(
                  "weekdays",
                  selectedWeekdays.includes(weekday)
                    ? selectedWeekdays.filter((value) => value !== weekday)
                    : [...selectedWeekdays, weekday],
                )
              }
              className={`rounded-full border px-3 py-1 text-sm ${
                selectedWeekdays.includes(weekday)
                  ? "border-[var(--color-clay)] bg-[var(--color-paper-strong)] text-[var(--color-pine)]"
                  : "border-[color:var(--color-border-soft)] bg-white/85 text-[var(--color-forest-muted)]"
              }`}
            >
              {weekday}
            </button>
          ))}
        </div>
      </div>
      <div className="flex gap-6 text-sm text-[var(--color-pine)]">
        <label className="flex items-center gap-2">
          <input type="checkbox" {...form.register("beginnerFriendly")} />
          Beginner-friendly
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" {...form.register("youthFriendly")} />
          Youth-friendly
        </label>
      </div>
      <Button type="submit" disabled={isPending} className="w-fit rounded-2xl px-6">
        Create ride draft
      </Button>
    </form>
  );
}
