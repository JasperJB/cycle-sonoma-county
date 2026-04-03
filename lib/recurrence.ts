import { addDays, addMinutes, addMonths, addWeeks, isAfter, isBefore } from "date-fns";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { RRule, type ByWeekday, rrulestr } from "rrule";

export const DEFAULT_RECURRENCE_TIMEZONE = "America/Los_Angeles";
const CUSTOM_RECURRENCE_PREFIX = "CUSTOM";

const weekdayMap = {
  SU: RRule.SU,
  MO: RRule.MO,
  TU: RRule.TU,
  WE: RRule.WE,
  TH: RRule.TH,
  FR: RRule.FR,
  SA: RRule.SA,
} satisfies Record<string, ByWeekday>;
const rruleWeekdayCodes = ["MO", "TU", "WE", "TH", "FR", "SA", "SU"] as const;

function isRRuleWeekday(
  weekday: ByWeekday,
): weekday is Extract<ByWeekday, { weekday: number; n?: number | undefined }> {
  return typeof weekday === "object" && weekday !== null && "weekday" in weekday;
}

export type FrequencyMode = "CUSTOM" | "WEEKLY" | "MONTHLY";
export type WeekdayCode = keyof typeof weekdayMap;
export type MonthlyWeekPosition = 1 | 2 | 3 | 4 | -1;
export type OverrideType = "CANCELED" | "RESCHEDULED" | "UPDATED";

export type RecurrenceBuilderInput = {
  frequency: FrequencyMode;
  timezone: string;
  startDate: string;
  startTime: string;
  interval?: number;
  weekdays?: WeekdayCode[];
  monthlyWeeks?: MonthlyWeekPosition[];
  monthlyWeek?: number;
  monthlyWeekday?: WeekdayCode;
  customDates?: string[];
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

function parseCustomRecurrenceRule(rule: string) {
  if (!rule.startsWith(`${CUSTOM_RECURRENCE_PREFIX};`)) {
    return null;
  }

  const values = new URLSearchParams(rule.slice(`${CUSTOM_RECURRENCE_PREFIX};`.length));
  const timezone = values.get("tzid") || DEFAULT_RECURRENCE_TIMEZONE;
  const startTime = values.get("time") || "00:00";
  const customDates = (values.get("dates") || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  return {
    timezone,
    startTime,
    customDates,
  };
}

export function buildRecurrenceRule(input: RecurrenceBuilderInput) {
  if (input.frequency === "CUSTOM") {
    const customDates = [...new Set(input.customDates?.filter(Boolean) || [])].sort();
    const values = new URLSearchParams({
      tzid: input.timezone,
      time: input.startTime,
      dates: customDates.join(","),
    });

    return `${CUSTOM_RECURRENCE_PREFIX};${values.toString()}`;
  }

  const dtstart = combineZonedDate(input.startDate, input.startTime, input.timezone);
  const monthlyWeeks = input.monthlyWeeks?.length
    ? input.monthlyWeeks
    : input.monthlyWeek
      ? [input.monthlyWeek as MonthlyWeekPosition]
      : undefined;
  const rule = new RRule({
    freq: input.frequency === "MONTHLY" ? RRule.MONTHLY : RRule.WEEKLY,
    interval: input.interval ?? 1,
    dtstart,
    tzid: input.timezone,
    byweekday:
      input.frequency === "MONTHLY"
        ? input.monthlyWeekday && monthlyWeeks?.length
          ? monthlyWeeks.map((week) => weekdayMap[input.monthlyWeekday!].nth(week))
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
  const customRule = parseCustomRecurrenceRule(rule);

  if (customRule) {
    if (!customRule.customDates.length) {
      return "Custom dates";
    }

    const formattedDates = customRule.customDates.map((date) =>
      formatInTimeZone(combineZonedDate(date, customRule.startTime, customRule.timezone), customRule.timezone, "MMM d"),
    );

    if (formattedDates.length === 1) {
      return `Custom date on ${formattedDates[0]}`;
    }

    if (formattedDates.length === 2) {
      return `Custom dates on ${formattedDates[0]} and ${formattedDates[1]}`;
    }

    return `Custom dates on ${formattedDates[0]}, ${formattedDates[1]}, and ${formattedDates.length - 2} more`;
  }

  const text = rrulestr(rule).toText();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function parseRecurrenceRule(rule: string): {
  frequency: FrequencyMode;
  interval: number;
  weekdays: WeekdayCode[];
  monthlyWeeks: MonthlyWeekPosition[];
  monthlyWeekday?: WeekdayCode;
  customDates: string[];
  until?: Date;
  timezone?: string | null;
} {
  const customRule = parseCustomRecurrenceRule(rule);

  if (customRule) {
    return {
      frequency: "CUSTOM",
      interval: 1,
      weekdays: [],
      monthlyWeeks: [],
      monthlyWeekday: undefined,
      customDates: customRule.customDates,
      until: customRule.customDates.length
        ? combineZonedDate(
            customRule.customDates[customRule.customDates.length - 1],
            customRule.startTime,
            customRule.timezone,
          )
        : undefined,
      timezone: customRule.timezone,
    };
  }

  const parsed = rrulestr(rule);
  const frequency = parsed.origOptions.freq === RRule.MONTHLY ? "MONTHLY" : "WEEKLY";
  const byweekday = Array.isArray(parsed.origOptions.byweekday)
    ? parsed.origOptions.byweekday
    : parsed.origOptions.byweekday
      ? [parsed.origOptions.byweekday]
      : [];
  const normalizedWeekdays = byweekday.filter(isRRuleWeekday);
  const firstWeekday = normalizedWeekdays[0];

  return {
    frequency,
    interval: parsed.origOptions.interval ?? 1,
    weekdays:
      frequency === "WEEKLY"
        ? normalizedWeekdays.map(
            (weekday) => rruleWeekdayCodes[weekday.weekday],
          )
        : [],
    monthlyWeeks:
      frequency === "MONTHLY"
        ? normalizedWeekdays
            .map((weekday) => weekday.n)
            .filter((value): value is MonthlyWeekPosition => Boolean(value))
        : [],
    monthlyWeekday:
      frequency === "MONTHLY" && firstWeekday
        ? rruleWeekdayCodes[firstWeekday.weekday]
        : undefined,
    customDates: [],
    until: parsed.origOptions.until ?? undefined,
    timezone: parsed.origOptions.tzid,
  };
}

export function materializeOccurrences(args: {
  rule: string;
  durationMinutes: number;
  rangeStart: Date;
  rangeEnd: Date;
  exceptions?: RecurrenceExceptionInput[];
}) {
  const customRule = parseCustomRecurrenceRule(args.rule);
  const exceptionMap = new Map(
    (args.exceptions ?? []).map((exception) => [
      exception.occurrenceAt.toISOString(),
      exception,
    ]),
  );

  if (customRule) {
    return customRule.customDates
      .map((date) => combineZonedDate(date, customRule.startTime, customRule.timezone))
      .filter(
        (startsAt) =>
          !isBefore(startsAt, args.rangeStart) && !isAfter(startsAt, args.rangeEnd),
      )
      .map<MaterializedOccurrence>((startsAt) => {
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
      .sort((left, right) => left.startsAt.getTime() - right.startsAt.getTime());
  }

  const rule = rrulestr(args.rule);
  const matches = rule.between(args.rangeStart, args.rangeEnd, true);

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
  if (frequency === "MONTHLY") {
    return addMonths(startDate, 6);
  }

  return addWeeks(startDate, 12);
}

export function formatOccurrenceStart(
  startsAt: Date,
  timezone = DEFAULT_RECURRENCE_TIMEZONE,
  pattern = "EEE, MMM d • h:mm a",
) {
  return formatInTimeZone(startsAt, timezone, pattern);
}

export function formatDateInTimezone(
  date: Date,
  timezone = DEFAULT_RECURRENCE_TIMEZONE,
  pattern = "MMM d, yyyy",
) {
  return formatInTimeZone(date, timezone, pattern);
}

export function formatOccurrenceRange(
  startsAt: Date,
  endsAt: Date,
  timezone = DEFAULT_RECURRENCE_TIMEZONE,
) {
  return `${formatInTimeZone(startsAt, timezone, "EEE, MMM d • h:mm a")} to ${formatInTimeZone(
    endsAt,
    timezone,
    "h:mm a zzz",
  )}`;
}

