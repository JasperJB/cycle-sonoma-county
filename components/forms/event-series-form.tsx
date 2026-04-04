"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useEffect, useTransition } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import {
  createEventSeriesAction,
  updateEventSeriesAction,
} from "@/app/actions/organizer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { eventSeriesSchema, type EventSeriesFormInput } from "@/lib/validators";

const weekdays = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"] as const;
const monthlyWeekOptions = [
  { label: "First", value: 1 },
  { label: "Second", value: 2 },
  { label: "Third", value: 3 },
  { label: "Fourth", value: 4 },
  { label: "Last", value: -1 },
] as const;
type EventSeriesFormValues = EventSeriesFormInput;

function buildDefaultValues(
  organizations: Array<{ id: string; name: string; type: string }>,
  initialValues?: Partial<EventSeriesFormValues>,
): EventSeriesFormValues {
  return {
    organizationId: initialValues?.organizationId || organizations[0]?.id || "",
    title: initialValues?.title || "",
    summary: initialValues?.summary || "",
    description: initialValues?.description || "",
    city: initialValues?.city || "",
    eventType: initialValues?.eventType || "CLINIC",
    startsAtDate: initialValues?.startsAtDate || "",
    startsAtTime: initialValues?.startsAtTime || "09:00",
    durationMinutes: initialValues?.durationMinutes || 180,
    locationName: initialValues?.locationName || "",
    locationAddress: initialValues?.locationAddress || "",
    registrationUrl: initialValues?.registrationUrl || "",
    priceText: initialValues?.priceText || "",
    isRecurring: initialValues?.isRecurring || false,
    recurrenceMode: initialValues?.recurrenceMode || "MONTHLY",
    recurrenceInterval: initialValues?.recurrenceInterval || 1,
    recurrenceUntil: initialValues?.recurrenceUntil || "",
    weekdays: initialValues?.weekdays?.length ? initialValues.weekdays : ["SA"],
    monthlyWeeks: initialValues?.monthlyWeeks?.length ? initialValues.monthlyWeeks : [1],
    monthlyWeekday: initialValues?.monthlyWeekday || "SA",
    customDates: initialValues?.customDates?.length
      ? initialValues.customDates
      : initialValues?.startsAtDate
        ? [initialValues.startsAtDate]
        : [""],
  };
}

export function EventSeriesForm({
  organizations,
  eventSeriesId,
  initialValues,
  submitLabel = "Create event draft",
  redirectTo,
}: {
  organizations: Array<{ id: string; name: string; type: string }>;
  eventSeriesId?: string;
  initialValues?: Partial<EventSeriesFormValues>;
  submitLabel?: string;
  redirectTo?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const defaultValues = buildDefaultValues(organizations, initialValues);
  const form = useForm<EventSeriesFormValues>({
    resolver: zodResolver(eventSeriesSchema),
    defaultValues,
  });
  const { fields: customDateFields, append: appendCustomDate } = useFieldArray({
    control: form.control,
    name: "customDates" as never,
  });
  const isRecurring = useWatch({
    control: form.control,
    name: "isRecurring",
  });
  const recurrenceMode = useWatch({
    control: form.control,
    name: "recurrenceMode",
  });
  const selectedWeekdays = useWatch({
    control: form.control,
    name: "weekdays",
  }) || [];
  const selectedMonthlyWeeks = useWatch({
    control: form.control,
    name: "monthlyWeeks",
  }) || [];
  const customDates = useWatch({
    control: form.control,
    name: "customDates",
  }) || [];
  const startsAtDate = useWatch({
    control: form.control,
    name: "startsAtDate",
  });
  const scheduleType = !isRecurring
    ? "ONE_OFF"
    : recurrenceMode === "WEEKLY" || recurrenceMode === "MONTHLY"
      ? recurrenceMode
      : "CUSTOM";

  useEffect(() => {
    if (!isRecurring || recurrenceMode !== "CUSTOM" || customDateFields.length) {
      return;
    }

    appendCustomDate(startsAtDate || "");
  }, [appendCustomDate, customDateFields.length, isRecurring, recurrenceMode, startsAtDate]);

  useEffect(() => {
    if (!isRecurring || recurrenceMode !== "CUSTOM") {
      return;
    }

    const firstCustomDate = customDates.find(Boolean);

    if (firstCustomDate && firstCustomDate !== startsAtDate) {
      form.setValue("startsAtDate", firstCustomDate);
    }
  }, [customDates, form, isRecurring, recurrenceMode, startsAtDate]);

  return (
    <form
      className="grid gap-4"
      onSubmit={form.handleSubmit((values) =>
        startTransition(async () => {
          const result = eventSeriesId
            ? await updateEventSeriesAction(eventSeriesId, values)
            : await createEventSeriesAction(values);

          if (!result.ok) {
            toast.error(result.message || "Unable to save event.");
            return;
          }

          toast.success(result.message);

          if (redirectTo) {
            router.push(redirectTo);
            return;
          }

          if (!eventSeriesId) {
            form.reset(buildDefaultValues(organizations));
          }

          router.refresh();
        }),
      )}
    >
      <div className="grid gap-4 sm:grid-cols-2">
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
        <Input {...form.register("city")} placeholder="City" className="rounded-2xl bg-white/85" />
      </div>
      <Input {...form.register("title")} placeholder="Event title" className="rounded-2xl bg-white/85" />
      <Textarea
        {...form.register("summary")}
        placeholder="Short summary"
        className="rounded-2xl bg-white/85"
        rows={3}
      />
      <Textarea
        {...form.register("description")}
        placeholder="Description"
        className="rounded-2xl bg-white/85"
        rows={4}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <select
          {...form.register("eventType")}
          className="h-11 rounded-2xl border border-[color:var(--color-border-soft)] bg-white/85 px-4 text-sm"
        >
          {["RACE", "FONDO", "CLINIC", "TRAIL_WORK_DAY", "SWAP_MEET", "ADVOCACY_MEETING", "FESTIVAL", "YOUTH_EVENT", "OTHER"].map((type) => (
            <option key={type} value={type}>
              {type.replaceAll("_", " ")}
            </option>
          ))}
        </select>
        <Input {...form.register("priceText")} placeholder="Price text" className="rounded-2xl bg-white/85" />
      </div>
      <Input {...form.register("locationName")} placeholder="Location name" className="rounded-2xl bg-white/85" />
      <div className="grid gap-2">
        <Input
          {...form.register("locationAddress")}
          placeholder="123 Example St"
          className="rounded-2xl bg-white/85"
        />
        <p className="text-xs text-[var(--color-forest-muted)]">
          Event addresses are geocoded on save so each listing gets a reliable map pin.
        </p>
      </div>
      <Input
        {...form.register("registrationUrl")}
        placeholder="Registration URL"
        className="rounded-2xl bg-white/85"
      />
      <div className="grid gap-2 sm:max-w-sm">
        <label className="text-sm font-medium text-[var(--color-pine)]">Schedule</label>
        <select
          value={scheduleType}
          onChange={(event) => {
            const nextValue = event.target.value as "ONE_OFF" | "CUSTOM" | "WEEKLY" | "MONTHLY";

            if (nextValue === "ONE_OFF") {
              form.setValue("isRecurring", false);
              return;
            }

            form.setValue("isRecurring", true);
            form.setValue("recurrenceMode", nextValue);
          }}
          className="h-11 rounded-2xl border border-[color:var(--color-border-soft)] bg-white/85 px-4 text-sm"
        >
          <option value="ONE_OFF">One-off</option>
          <option value="CUSTOM">Custom dates</option>
          <option value="WEEKLY">Weekly</option>
          <option value="MONTHLY">Monthly</option>
        </select>
        <p className="text-xs text-[var(--color-forest-muted)]">
          Use custom dates for race series that run on a fixed set of calendar dates.
        </p>
      </div>
      {!isRecurring || recurrenceMode !== "CUSTOM" ? (
        <div className="grid gap-4 sm:grid-cols-3">
          <Input type="date" {...form.register("startsAtDate")} className="rounded-2xl bg-white/85" />
          <Input type="time" {...form.register("startsAtTime")} className="rounded-2xl bg-white/85" />
          <Input
            type="number"
            {...form.register("durationMinutes")}
            placeholder="Duration (minutes)"
            className="rounded-2xl bg-white/85"
          />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <input type="hidden" {...form.register("startsAtDate")} />
          <Input type="time" {...form.register("startsAtTime")} className="rounded-2xl bg-white/85" />
          <Input
            type="number"
            {...form.register("durationMinutes")}
            placeholder="Duration (minutes)"
            className="rounded-2xl bg-white/85"
          />
        </div>
      )}
      {isRecurring ? (
        <>
          {recurrenceMode === "CUSTOM" ? (
            <div className="grid gap-3">
              <div className="flex items-center justify-between gap-3">
                <label className="text-sm font-medium text-[var(--color-pine)]">Dates</label>
                <div className="flex flex-wrap gap-2">
                  {customDateFields.length < 8 ? (
                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-2xl"
                      onClick={() => {
                        const seedValue = customDates[customDates.length - 1] || startsAtDate || "";

                        for (let index = customDateFields.length; index < 8; index += 1) {
                          appendCustomDate(seedValue);
                        }
                      }}
                    >
                      Add to 8 dates
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-2xl"
                    onClick={() =>
                      appendCustomDate(customDates[customDates.length - 1] || startsAtDate || "")
                    }
                  >
                    Add date
                  </Button>
                </div>
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
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="grid gap-1">
                  <Input
                    type="number"
                    {...form.register("recurrenceInterval")}
                    placeholder="Interval"
                    className="rounded-2xl bg-white/85"
                  />
                  <p className="text-xs text-[var(--color-forest-muted)]">
                    {recurrenceMode === "WEEKLY"
                      ? "Use 2 for every other week."
                      : "Use 2 for every other month."}
                  </p>
                </div>
                <Input
                  type="date"
                  {...form.register("recurrenceUntil")}
                  className="rounded-2xl bg-white/85"
                />
              </div>
              {recurrenceMode === "WEEKLY" ? (
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
            </>
          )}
        </>
      ) : null}
      <Button type="submit" disabled={isPending} className="w-fit rounded-2xl px-6">
        {submitLabel}
      </Button>
    </form>
  );
}
