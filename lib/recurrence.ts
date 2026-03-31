import { addDays, addMinutes, addMonths, addWeeks, isAfter, isBefore } from "date-fns";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { RRule, type ByWeekday, rrulestr } from "rrule";

const weekdayMap = {
  SU: RRule.SU,
  MO: RRule.MO,
  TU: RRule.TU,
  WE: RRule.WE,
  TH: RRule.TH,
  FR: RRule.FR,
  SA: RRule.SA,
} satisfies Record<string, ByWeekday>;

export type FrequencyMode = "WEEKLY" | "MONTHLY";
export type WeekdayCode = keyof typeof weekdayMap;
export type OverrideType = "CANCELED" | "RESCHEDULED" | "UPDATED";

export type RecurrenceBuilderInput = {
  frequency: FrequencyMode;
  timezone: string;
  startDate: string;
  startTime: string;
  interval?: number;
  weekdays?: WeekdayCode[];
  monthlyWeek?: number;
  monthlyWeekday?: WeekdayCode;
  until?: string | null;
};

export type RecurrenceExceptionInput = {
  occurrenceAt: Date;
  overrideType: OverrideType;
  newStartsAt?: Date | null;
  newEndsAt?: Date | null;
  note?: string | null;
};

export type MaterializedOccurrence = {
  startsAt: Date;
  endsAt: Date;
  status: "SCHEDULED" | "CANCELED" | "RESCHEDULED";
  note?: string | null;
};

export function combineZonedDate(date: string, time: string, timezone: string) {
  return fromZonedTime(`${date}T${time}:00`, timezone);
}

export function buildRecurrenceRule(input: RecurrenceBuilderInput) {
  const dtstart = combineZonedDate(input.startDate, input.startTime, input.timezone);
  const rule = new RRule({
    freq: input.frequency === "MONTHLY" ? RRule.MONTHLY : RRule.WEEKLY,
    interval: input.interval ?? 1,
    dtstart,
    tzid: input.timezone,
    byweekday:
      input.frequency === "MONTHLY"
        ? input.monthlyWeekday && input.monthlyWeek
          ? [weekdayMap[input.monthlyWeekday].nth(input.monthlyWeek)]
          : undefined
        : input.weekdays?.length
          ? input.weekdays.map((code) => weekdayMap[code])
          : undefined,
    until: input.until
      ? fromZonedTime(
          `${input.until}T${input.startTime}:00`,
          input.timezone,
        )
      : undefined,
  });

  return rule.toString();
}

export function recurrenceToText(rule: string) {
  const text = rrulestr(rule).toText();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function materializeOccurrences(args: {
  rule: string;
  durationMinutes: number;
  rangeStart: Date;
  rangeEnd: Date;
  exceptions?: RecurrenceExceptionInput[];
}) {
  const rule = rrulestr(args.rule);
  const matches = rule.between(args.rangeStart, args.rangeEnd, true);
  const exceptionMap = new Map(
    (args.exceptions ?? []).map((exception) => [
      exception.occurrenceAt.toISOString(),
      exception,
    ]),
  );

  return matches
    .map<MaterializedOccurrence | null>((startsAt) => {
      const exception = exceptionMap.get(startsAt.toISOString());
      const endsAt = addMinutes(startsAt, args.durationMinutes);

      if (!exception) {
        return {
          startsAt,
          endsAt,
          status: "SCHEDULED",
        };
      }

      if (exception.overrideType === "CANCELED") {
        return {
          startsAt,
          endsAt,
          status: "CANCELED",
          note: exception.note,
        };
      }

      return {
        startsAt: exception.newStartsAt ?? startsAt,
        endsAt: exception.newEndsAt ?? endsAt,
        status: "RESCHEDULED",
        note: exception.note,
      };
    })
    .filter((occurrence): occurrence is MaterializedOccurrence => Boolean(occurrence))
    .sort((left, right) => left.startsAt.getTime() - right.startsAt.getTime());
}

export function getNextUpcomingOccurrence(
  occurrences: MaterializedOccurrence[],
  reference = new Date(),
) {
  return occurrences.find(
    (occurrence) =>
      occurrence.status !== "CANCELED" && isAfter(occurrence.startsAt, reference),
  );
}

export function needsReconfirmation(lastConfirmedAt?: Date | null, reference = new Date()) {
  if (!lastConfirmedAt) {
    return true;
  }

  return isBefore(lastConfirmedAt, addDays(reference, -90));
}

export function materializationWindow(reference = new Date()) {
  return {
    from: addDays(reference, -1),
    to: addWeeks(reference, 16),
  };
}

export function defaultArchiveDate(startsAt: Date) {
  return addDays(startsAt, 1);
}

export function defaultUntilDate(frequency: FrequencyMode, startDate: Date) {
  return frequency === "MONTHLY" ? addMonths(startDate, 6) : addWeeks(startDate, 12);
}

export function formatOccurrenceRange(
  startsAt: Date,
  endsAt: Date,
  timezone = "America/Los_Angeles",
) {
  return `${formatInTimeZone(startsAt, timezone, "EEE, MMM d • h:mm a")} to ${formatInTimeZone(
    endsAt,
    timezone,
    "h:mm a zzz",
  )}`;
}
