import { afterEach, describe, expect, it, vi } from "vitest";
import { fromZonedTime } from "date-fns-tz";
import { NewsletterIssueStatus, OrganizationMembershipRole } from "@/app/generated/prisma/enums";
import {
  getCurrentNewsletterIssueWeekOf,
  getNewsletterIssueDisplayStatus,
  getNewsletterIssueSchedule,
  isNewsletterManagerRole,
  renderNewsletterRichText,
} from "@/lib/newsletter";

const timezone = "America/Los_Angeles";

function zonedDate(value: string) {
  return fromZonedTime(value, timezone);
}

describe("newsletter scheduling", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("targets the upcoming Monday before the Saturday send window", () => {
    const reference = zonedDate("2026-04-03T10:00:00");

    expect(getCurrentNewsletterIssueWeekOf(reference).toISOString()).toBe(
      zonedDate("2026-04-06T00:00:00").toISOString(),
    );
  });

  it("rolls forward to the following week once Saturday evening send time passes", () => {
    const reference = zonedDate("2026-04-04T19:00:00");

    expect(getCurrentNewsletterIssueWeekOf(reference).toISOString()).toBe(
      zonedDate("2026-04-13T00:00:00").toISOString(),
    );
  });

  it("derives Thursday reminder, Friday lock, and Saturday send times from the issue week", () => {
    const schedule = getNewsletterIssueSchedule(zonedDate("2026-04-13T00:00:00"));

    expect(schedule.reminderAt.toISOString()).toBe(zonedDate("2026-04-09T09:00:00").toISOString());
    expect(schedule.lockAt.toISOString()).toBe(zonedDate("2026-04-10T18:00:00").toISOString());
    expect(schedule.sendAt.toISOString()).toBe(zonedDate("2026-04-11T18:00:00").toISOString());
  });

  it("shows an open issue before the Friday cutoff and locked after it", () => {
    vi.useFakeTimers();

    vi.setSystemTime(zonedDate("2026-04-10T17:30:00"));
    expect(
      getNewsletterIssueDisplayStatus({
        status: NewsletterIssueStatus.OPEN,
        weekOf: zonedDate("2026-04-13T00:00:00"),
      }),
    ).toBe(NewsletterIssueStatus.OPEN);

    vi.setSystemTime(zonedDate("2026-04-10T18:30:00"));
    expect(
      getNewsletterIssueDisplayStatus({
        status: NewsletterIssueStatus.OPEN,
        weekOf: zonedDate("2026-04-13T00:00:00"),
      }),
    ).toBe(NewsletterIssueStatus.LOCKED);
  });

  it("treats owners and editors as newsletter managers", () => {
    expect(isNewsletterManagerRole(OrganizationMembershipRole.OWNER)).toBe(true);
    expect(isNewsletterManagerRole(OrganizationMembershipRole.EDITOR)).toBe(true);
    expect(isNewsletterManagerRole(OrganizationMembershipRole.CONTRIBUTOR)).toBe(false);
  });

  it("preserves safe rich formatting, links, and images", () => {
    const html = renderNewsletterRichText(`
<h3>Weekend highlights</h3>

<p>Bring <strong>layers</strong> and check the <a href="https://example.com/weather">forecast</a>.</p>

<p><img src="/uploads/banner.jpg" alt="Weekend route banner" /></p>
`);

    expect(html).toContain("<h3>Weekend highlights</h3>");
    expect(html).toContain("<strong>layers</strong>");
    expect(html).toContain('href="https://example.com/weather"');
    expect(html).toContain('src="http://localhost:3000/uploads/banner.jpg"');
  });

  it("strips unsafe markup from newsletter rich text", () => {
    const html = renderNewsletterRichText(
      `<p>Hello<script>alert("x")</script><a href="javascript:alert('x')">bad link</a></p>`,
    );

    expect(html).not.toContain("<script");
    expect(html).not.toContain("javascript:");
  });
});
