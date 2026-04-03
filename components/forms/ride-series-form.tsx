"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useEffect, useTransition } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import {
  createRideSeriesAction,
  updateRideSeriesAction,
} from "@/app/actions/organizer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { rideSeriesSchema, type RideSeriesFormInput } from "@/lib/validators";

const weekdays = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"] as const;
const monthlyWeekOptions = [
  { label: "First", value: 1 },
  { label: "Second", value: 2 },
  { label: "Third", value: 3 },
  { label: "Fourth", value: 4 },
  { label: "Last", value: -1 },
] as const;
type RideSeriesFormValues = RideSeriesFormInput;

function buildDefaultValues(
  organizations: Array<{ id: string; name: string; type: string }>,
  initialValues?: Partial<RideSeriesFormValues>,
): RideSeriesFormValues {
  return {
    organizationId: initialValues?.organizationId || organizations[0]?.id || "",
    title: initialValues?.title || "",
    summary: initialValues?.summary || "",
    description: initialValues?.description || "",
    city: initialValues?.city || "",
    rideType: initialValues?.rideType || "ROAD",
    paceLabel: initialValues?.paceLabel || "",
    dropPolicy: initialValues?.dropPolicy || "NO_DROP",
    skillLevel: initialValues?.skillLevel || "",
    meetingLocationName: initialValues?.meetingLocationName || "",
    meetingAddress: initialValues?.meetingAddress || "",
    startDate: initialValues?.startDate || "",
    startTimeLocal: initialValues?.startTimeLocal || "08:00",
    estimatedDurationMinutes: initialValues?.estimatedDurationMinutes || 120,
    routeUrl: initialValues?.routeUrl || "",
    beginnerFriendly: initialValues?.beginnerFriendly || false,
    youthFriendly: initialValues?.youthFriendly || false,
    recurrenceMode: initialValues?.recurrenceMode || "WEEKLY",
    recurrenceInterval: initialValues?.recurrenceInterval || 1,
    weekdays: initialValues?.weekdays?.length ? initialValues.weekdays : ["SA"],
    monthlyWeeks: initialValues?.monthlyWeeks?.length ? initialValues.monthlyWeeks : [1],
    monthlyWeekday: initialValues?.monthlyWeekday || "SA",
    recurrenceUntil: initialValues?.recurrenceUntil || "",
    customDates: initialValues?.customDates?.length
      ? initialValues.customDates
      : initialValues?.startDate
        ? [initialValues.startDate]
        : [""],
  };
}

export function RideSeriesForm({
  organizations,
  rideSeriesId,
  initialValues,
  submitLabel = "Create ride draft",
  redirectTo,
}: {
  organizations: Array<{ id: string; name: string; type: string }>;
  rideSeriesId?: string;
  initialValues?: Partial<RideSeriesFormValues>;
  submitLabel?: string;
  redirectTo?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const defaultValues = buildDefaultValues(organizations, initialValues);
  const form = useForm<RideSeriesFormValues>({
    resolver: zodResolver(rideSeriesSchema),
    defaultValues,
  });
  const { fields: customDateFields, append: appendCustomDate } = useFieldArray({
    control: form.control,
    name: "customDates" as never,
  });

  const selectedWeekdays = useWatch({
    control: form.control,
    name: "weekdays",
  }) || [];
  const recurrenceMode = useWatch({
    control: form.control,
    name: "recurrenceMode",
  });
  const selectedMonthlyWeeks = useWatch({
    control: form.control,
    name: "monthlyWeeks",
  }) || [];
  const customDates = useWatch({
    control: form.control,
    name: "customDates",
  }) || [];
  const startDate = useWatch({
    control: form.control,
    name: "startDate",
  });

  useEffect(() => {
    if (recurrenceMode !== "CUSTOM" || customDateFields.length) {
      return;
    }

    appendCustomDate(startDate || "");
  }, [appendCustomDate, customDateFields.length, recurrenceMode, startDate]);

  return (
    <form
      className="grid gap-4"
      onSubmit={form.handleSubmit((values) =>
        startTransition(async () => {
          const result = rideSeriesId
            ? await updateRideSeriesAction(rideSeriesId, values)
            : await createRideSeriesAction(values);

          if (!result.ok) {
            toast.error(result.message || "Unable to save ride.");
            return;
          }

          toast.success(result.message);

          if (redirectTo) {
            router.push(redirectTo);
            return;
          }

          if (!rideSeriesId) {
            form.reset(buildDefaultValues(organizations));
          }

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
      <div className="grid gap-2">
        <label className="text-sm font-medium text-[var(--color-pine)]">Description</label>
        <Textarea {...form.register("description")} className="rounded-2xl bg-white/85" rows={4} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <label className="text-sm font-medium text-[var(--color-pine)]">Ride type</label>
          <select
            {...form.register("rideType")}
            className="h-11 rounded-2xl border border-[color:var(--color-border-soft)] bg-white/85 px-4 text-sm"
          >
            {["ROAD", "GRAVEL", "MOUNTAIN", "E_BIKE", "COMMUTER", "SOCIAL", "TRAINING", "WOMENS", "JUNIOR", "OTHER"].map((type) => (
              <option key={type} value={type}>
                {type.replaceAll("_", " ")}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-2">
          <label className="text-sm font-medium text-[var(--color-pine)]">Drop policy</label>
          <select
            {...form.register("dropPolicy")}
            className="h-11 rounded-2xl border border-[color:var(--color-border-soft)] bg-white/85 px-4 text-sm"
          >
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
          <label className="text-sm font-medium text-[var(--color-pine)]">Meeting address</label>
          <Input
            {...form.register("meetingAddress")}
            placeholder="123 Example St"
            className="rounded-2xl bg-white/85"
          />
          <p className="text-xs text-[var(--color-forest-muted)]">
            Saved rides geocode this address automatically so the ride pin lands in the right place.
          </p>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="grid gap-2">
          <label className="text-sm font-medium text-[var(--color-pine)]">Route link</label>
          <Input {...form.register("routeUrl")} className="rounded-2xl bg-white/85" />
        </div>
        <div className="grid gap-2">
          <label className="text-sm font-medium text-[var(--color-pine)]">Skill level</label>
          <Input {...form.register("skillLevel")} className="rounded-2xl bg-white/85" />
        </div>
        <div className="grid gap-2">
          <label className="text-sm font-medium text-[var(--color-pine)]">Duration (minutes)</label>
          <Input
            type="number"
            {...form.register("estimatedDurationMinutes")}
            className="rounded-2xl bg-white/85"
          />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="grid gap-2">
          <label className="text-sm font-medium text-[var(--color-pine)]">Recurrence</label>
          <select
            {...form.register("recurrenceMode")}
            className="h-11 rounded-2xl border border-[color:var(--color-border-soft)] bg-white/85 px-4 text-sm"
          >
            <option value="CUSTOM">Custom</option>
            <option value="WEEKLY">Weekly</option>
            <option value="MONTHLY">Monthly</option>
          </select>
        </div>
        {recurrenceMode !== "CUSTOM" ? (
          <>
            <div className="grid gap-2">
              <label className="text-sm font-medium text-[var(--color-pine)]">Interval</label>
              <Input
                type="number"
                {...form.register("recurrenceInterval")}
                className="rounded-2xl bg-white/85"
              />
              <p className="text-xs text-[var(--color-forest-muted)]">
                {recurrenceMode === "WEEKLY"
                  ? "Use 2 for every other week."
                  : "Use 2 for every other month."}
              </p>
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium text-[var(--color-pine)]">Ends on</label>
              <Input
                type="date"
                {...form.register("recurrenceUntil")}
                className="rounded-2xl bg-white/85"
              />
            </div>
          </>
        ) : null}
      </div>
      {recurrenceMode === "CUSTOM" ? (
        <div className="grid gap-3">
          <div className="flex items-center justify-between gap-3">
            <label className="text-sm font-medium text-[var(--color-pine)]">Dates</label>
            <Button
              type="button"
              variant="outline"
              className="rounded-2xl"
              onClick={() => appendCustomDate(customDates[customDates.length - 1] || startDate || "")}
            >
              Add date
            </Button>
          </div>
          <div className="grid gap-3">
            {customDateFields.map((field, index) => (
              <Input
                key={field.id}
                type="date"
                {...form.register(`customDates.${index}`)}
                className="rounded-2xl bg-white/85"
              />
            ))}
          </div>
        </div>
      ) : recurrenceMode === "WEEKLY" ? (
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
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-3">
            <label className="text-sm font-medium text-[var(--color-pine)]">Weeks of the month</label>
            <div className="flex flex-wrap gap-2">
              {monthlyWeekOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() =>
                    form.setValue(
                      "monthlyWeeks",
                      selectedMonthlyWeeks.includes(option.value)
                        ? selectedMonthlyWeeks.filter((value) => value !== option.value)
                        : [...selectedMonthlyWeeks, option.value].sort((left, right) =>
                            left === -1 ? 1 : right === -1 ? -1 : left - right,
                          ),
                    )
                  }
                  className={`rounded-full border px-3 py-1 text-sm ${
                    selectedMonthlyWeeks.includes(option.value)
                      ? "border-[var(--color-clay)] bg-[var(--color-paper-strong)] text-[var(--color-pine)]"
                      : "border-[color:var(--color-border-soft)] bg-white/85 text-[var(--color-forest-muted)]"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium text-[var(--color-pine)]">Monthly weekday</label>
            <select
              {...form.register("monthlyWeekday")}
              className="h-11 rounded-2xl border border-[color:var(--color-border-soft)] bg-white/85 px-4 text-sm"
            >
              {weekdays.map((weekday) => (
                <option key={weekday} value={weekday}>
                  {weekday}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
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
        {submitLabel}
      </Button>
    </form>
  );
}
