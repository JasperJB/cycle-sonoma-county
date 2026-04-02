import { describe, expect, it } from "vitest";
import {
  buildRecurrenceRule,
  materializeOccurrences,
  needsReconfirmation,
  parseRecurrenceRule,
  recurrenceToText,
} from "@/lib/recurrence";
import { addDays } from "date-fns";

describe("recurrence engine", () => {
  it("builds weekly recurrence rules and materializes upcoming dates", () => {
    const rule = buildRecurrenceRule({
      frequency: "WEEKLY",
      timezone: "America/Los_Angeles",
      startDate: "2026-04-02",
      startTime: "08:30",
      interval: 1,
      weekdays: ["TH"],
      until: "2026-04-30",
    });

    const occurrences = materializeOccurrences({
      rule,
      durationMinutes: 120,
      rangeStart: new Date("2026-04-01T00:00:00.000Z"),
      rangeEnd: new Date("2026-04-30T23:59:59.000Z"),
    });

    expect(occurrences).toHaveLength(5);
    expect(recurrenceToText(rule).toLowerCase()).toContain("every week");
  });

  it("supports first-saturday monthly patterns", () => {
    const rule = buildRecurrenceRule({
      frequency: "MONTHLY",
      timezone: "America/Los_Angeles",
      startDate: "2026-04-04",
      startTime: "09:00",
      interval: 1,
      monthlyWeeks: [1],
      monthlyWeekday: "SA",
      until: "2026-07-31",
    });

    const occurrences = materializeOccurrences({
      rule,
      durationMinutes: 180,
      rangeStart: new Date("2026-04-01T00:00:00.000Z"),
      rangeEnd: new Date("2026-07-31T23:59:59.000Z"),
    });

    expect(occurrences).toHaveLength(4);
    expect(occurrences[0].startsAt.toISOString()).toContain("2026-04-04");
    expect(occurrences[1].startsAt.toISOString()).toContain("2026-05-02");
  });

  it("supports bi-weekly weekly patterns", () => {
    const rule = buildRecurrenceRule({
      frequency: "WEEKLY",
      timezone: "America/Los_Angeles",
      startDate: "2026-04-01",
      startTime: "08:00",
      interval: 2,
      weekdays: ["WE"],
      until: "2026-05-31",
    });

    const occurrences = materializeOccurrences({
      rule,
      durationMinutes: 90,
      rangeStart: new Date("2026-04-01T00:00:00.000Z"),
      rangeEnd: new Date("2026-05-31T23:59:59.000Z"),
    });

    expect(occurrences[0].startsAt.toISOString()).toContain("2026-04-01");
    expect(occurrences[1].startsAt.getTime() - occurrences[0].startsAt.getTime()).toBe(
      14 * 24 * 60 * 60 * 1000,
    );
    expect(recurrenceToText(rule).toLowerCase()).toContain("2 weeks");
  });

  it("preserves local wall-clock time when formatting occurrences", () => {
    const rule = buildRecurrenceRule({
      frequency: "WEEKLY",
      timezone: "America/Los_Angeles",
      startDate: "2026-04-05",
      startTime: "09:00",
      interval: 1,
      weekdays: ["SU"],
    });

    const occurrences = materializeOccurrences({
      rule,
      durationMinutes: 180,
      rangeStart: new Date("2026-04-01T00:00:00.000Z"),
      rangeEnd: new Date("2026-04-30T23:59:59.000Z"),
    });

    expect(occurrences[0].startsAt.toISOString()).toBe("2026-04-05T16:00:00.000Z");
  });

  it("supports first-and-third monthly weekday patterns and parses them back", () => {
    const rule = buildRecurrenceRule({
      frequency: "MONTHLY",
      timezone: "America/Los_Angeles",
      startDate: "2026-04-01",
      startTime: "08:00",
      interval: 1,
      monthlyWeeks: [1, 3],
      monthlyWeekday: "WE",
      until: "2026-06-30",
    });

    const occurrences = materializeOccurrences({
      rule,
      durationMinutes: 90,
      rangeStart: new Date("2026-04-01T00:00:00.000Z"),
      rangeEnd: new Date("2026-06-30T23:59:59.000Z"),
    });
    const parsed = parseRecurrenceRule(rule);

    expect(occurrences).toHaveLength(6);
    expect(occurrences[0].startsAt.toISOString()).toContain("2026-04-01");
    expect(occurrences[1].startsAt.toISOString()).toContain("2026-04-15");
    expect(parsed.frequency).toBe("MONTHLY");
    expect(parsed.monthlyWeeks).toEqual([1, 3]);
    expect(parsed.monthlyWeekday).toBe("WE");
  });

  it("applies cancellations and reschedules", () => {
    const rule = buildRecurrenceRule({
      frequency: "WEEKLY",
      timezone: "America/Los_Angeles",
      startDate: "2026-04-02",
      startTime: "08:30",
      interval: 1,
      weekdays: ["TH"],
      until: "2026-04-30",
    });

    const occurrences = materializeOccurrences({
      rule,
      durationMinutes: 120,
      rangeStart: new Date("2026-04-01T00:00:00.000Z"),
      rangeEnd: new Date("2026-04-30T23:59:59.000Z"),
      exceptions: [
        {
          occurrenceAt: new Date("2026-04-09T15:30:00.000Z"),
          overrideType: "CANCELED",
          note: "Storm day",
        },
        {
          occurrenceAt: new Date("2026-04-16T15:30:00.000Z"),
          overrideType: "RESCHEDULED",
          newStartsAt: new Date("2026-04-17T00:30:00.000Z"),
          newEndsAt: new Date("2026-04-17T02:30:00.000Z"),
        },
      ],
    });

    expect(occurrences[1].status).toBe("CANCELED");
    expect(occurrences[2].status).toBe("RESCHEDULED");
    expect(occurrences[2].startsAt.toISOString()).toContain("2026-04-17");
  });

  it("marks stale recurring rides after ninety days", () => {
    const reference = new Date("2026-04-01T00:00:00.000Z");

    expect(needsReconfirmation(addDays(reference, -91), reference)).toBe(true);
    expect(needsReconfirmation(addDays(reference, -20), reference)).toBe(false);
    expect(needsReconfirmation(undefined, reference)).toBe(true);
  });
});
