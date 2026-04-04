import { isAfter } from "date-fns";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import sanitizeHtml from "sanitize-html";
import {
  ListingStatus,
  NewsletterIssueStatus,
  NewsletterStatus,
  OccurrenceStatus,
  OrganizationMembershipRole,
  UserRole,
} from "@/app/generated/prisma/enums";
import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma";

export const NEWSLETTER_TIMEZONE = "America/Los_Angeles";
const REMINDER_HOUR = "09:00";
const LOCK_HOUR = "18:00";
const SEND_HOUR = "18:00";
const MANAGER_ROLES: OrganizationMembershipRole[] = [
  OrganizationMembershipRole.OWNER,
  OrganizationMembershipRole.EDITOR,
];

const issueInclude = {
  organizationDrafts: {
    include: {
      organization: true,
      lastEditedBy: {
        select: {
          id: true,
          email: true,
          displayName: true,
          firstName: true,
          lastName: true,
        },
      },
    },
  },
} as const;

type IssueWithDrafts = Awaited<ReturnType<typeof ensureCurrentNewsletterIssue>>;
type DraftWithRelations = IssueWithDrafts["organizationDrafts"][number];

function zonedDateString(date: Date) {
  return formatInTimeZone(date, NEWSLETTER_TIMEZONE, "yyyy-MM-dd");
}

function shiftZonedDate(dateString: string, days: number) {
  const anchor = fromZonedTime(`${dateString}T12:00:00`, NEWSLETTER_TIMEZONE);
  const shifted = new Date(anchor.getTime() + days * 24 * 60 * 60 * 1000);
  return formatInTimeZone(shifted, NEWSLETTER_TIMEZONE, "yyyy-MM-dd");
}

function zonedDateTime(dateString: string, time: string) {
  return fromZonedTime(`${dateString}T${time}:00`, NEWSLETTER_TIMEZONE);
}

function absoluteUrl(path: string) {
  return new URL(path, env.NEXT_PUBLIC_SITE_URL).toString();
}

function nameForUser(user?: {
  displayName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
} | null) {
  if (!user) {
    return "Unknown editor";
  }

  return (
    user.displayName ||
    [user.firstName, user.lastName].filter(Boolean).join(" ") ||
    user.email ||
    "Unknown editor"
  );
}

const newsletterAllowedTags = [
  "a",
  "blockquote",
  "br",
  "em",
  "h2",
  "h3",
  "h4",
  "img",
  "li",
  "ol",
  "p",
  "strong",
  "u",
  "ul",
] as const;

const newsletterAllowedAttributes: sanitizeHtml.IOptions["allowedAttributes"] = {
  a: ["href", "title"],
  img: ["src", "alt", "width", "height"],
};

function normalizeNewsletterUrl(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return "";
  }

  if (trimmed.startsWith("/")) {
    return absoluteUrl(trimmed);
  }

  if (/^https?:\/\//i.test(trimmed) || /^mailto:/i.test(trimmed)) {
    return trimmed;
  }

  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) {
    return "";
  }

  return `https://${trimmed.replace(/^\/+/, "")}`;
}

export function renderNewsletterRichText(text?: string | null) {
  if (!text?.trim()) {
    return "";
  }

  return text
    .trim()
    .split(/\n\s*\n/)
    .map((paragraph) => {
      const sanitized = sanitizeHtml(paragraph, {
        allowedTags: [...newsletterAllowedTags],
        allowedAttributes: newsletterAllowedAttributes,
        allowedSchemes: ["http", "https", "mailto"],
        selfClosing: ["img", "br"],
        transformTags: {
          a: (tagName, attribs) => ({
            tagName,
            attribs:
              attribs.href && normalizeNewsletterUrl(attribs.href)
                ? {
                    ...attribs,
                    href: normalizeNewsletterUrl(attribs.href),
                  }
                : Object.fromEntries(
                    Object.entries(attribs).filter(([key]) => key !== "href"),
                  ),
          }),
          img: (tagName, attribs) => ({
            tagName,
            attribs:
              attribs.src && normalizeNewsletterUrl(attribs.src)
                ? {
                    ...attribs,
                    src: normalizeNewsletterUrl(attribs.src),
                  }
                : Object.fromEntries(
                    Object.entries(attribs).filter(([key]) => key !== "src"),
                  ),
          }),
        },
      }).trim();

      if (!sanitized) {
        return "";
      }

      if (/^<(h[2-4]|p|ul|ol|blockquote|img)\b/i.test(sanitized)) {
        return sanitized;
      }

      return `<p style="margin: 0 0 14px; line-height: 1.65;">${sanitized.replace(/\n/g, "<br />")}</p>`;
    })
    .filter(Boolean)
    .join("");
}

function renderList(items: string[]) {
  if (!items.length) {
    return '<p style="margin: 0; line-height: 1.65;">No updates available.</p>';
  }

  return `<ul style="margin: 0; padding-left: 18px;">${items
    .map((item) => `<li style="margin: 0 0 10px;">${item}</li>`)
    .join("")}</ul>`;
}

function formatOccurrenceTime(date: Date) {
  return formatInTimeZone(date, NEWSLETTER_TIMEZONE, "EEE, MMM d • h:mm a");
}

function formatWeekLabel(weekOf: Date) {
  return formatInTimeZone(weekOf, NEWSLETTER_TIMEZONE, "MMM d, yyyy");
}

function formatWeekRange(weekOf: Date) {
  const endOfWeek = zonedDateTime(shiftZonedDate(zonedDateString(weekOf), 6), "00:00");
  return `${formatInTimeZone(weekOf, NEWSLETTER_TIMEZONE, "MMM d")} - ${formatInTimeZone(
    endOfWeek,
    NEWSLETTER_TIMEZONE,
    "MMM d, yyyy",
  )}`;
}

function buildSubject(weekOf: Date) {
  return `Cycle Sonoma County weekly newsletter • Week of ${formatWeekLabel(weekOf)}`;
}

function organizationSort(left: { name: string }, right: { name: string }) {
  return left.name.localeCompare(right.name);
}

export function isNewsletterManagerRole(role: OrganizationMembershipRole) {
  return MANAGER_ROLES.includes(role);
}

export function getNewsletterIssueSchedule(weekOfInput: Date) {
  const weekOfString = zonedDateString(weekOfInput);
  const weekOf = zonedDateTime(weekOfString, "00:00");
  const reminderAt = zonedDateTime(shiftZonedDate(weekOfString, -4), REMINDER_HOUR);
  const lockAt = zonedDateTime(shiftZonedDate(weekOfString, -3), LOCK_HOUR);
  const sendAt = zonedDateTime(shiftZonedDate(weekOfString, -2), SEND_HOUR);
  const weekEndExclusive = zonedDateTime(shiftZonedDate(weekOfString, 7), "00:00");

  return {
    weekOf,
    reminderAt,
    lockAt,
    sendAt,
    weekEndExclusive,
    label: formatWeekLabel(weekOf),
    rangeLabel: formatWeekRange(weekOf),
  };
}

export function getCurrentNewsletterIssueWeekOf(reference = new Date()) {
  const localDate = zonedDateString(reference);
  const isoDay = Number(formatInTimeZone(reference, NEWSLETTER_TIMEZONE, "i"));
  const daysUntilSaturday = (6 - isoDay + 7) % 7;
  let nextSaturday = shiftZonedDate(localDate, daysUntilSaturday);

  if (isAfter(reference, zonedDateTime(nextSaturday, SEND_HOUR)) || reference.getTime() === zonedDateTime(nextSaturday, SEND_HOUR).getTime()) {
    nextSaturday = shiftZonedDate(nextSaturday, 7);
  }

  return zonedDateTime(shiftZonedDate(nextSaturday, 2), "00:00");
}

export function getNewsletterIssueDisplayStatus(issue: {
  status: NewsletterIssueStatus;
  weekOf: Date;
}) {
  const schedule = getNewsletterIssueSchedule(issue.weekOf);
  const now = new Date();

  if (issue.status === NewsletterIssueStatus.SENT) {
    return NewsletterIssueStatus.SENT;
  }

  if (now >= schedule.lockAt) {
    return NewsletterIssueStatus.LOCKED;
  }

  return NewsletterIssueStatus.OPEN;
}

export function isNewsletterIssueLocked(issue: {
  status: NewsletterIssueStatus;
  weekOf: Date;
}) {
  return getNewsletterIssueDisplayStatus(issue) !== NewsletterIssueStatus.OPEN;
}

async function syncNewsletterSubscriberLinks() {
  await prisma.$executeRawUnsafe(`
    UPDATE "NewsletterSubscriber" AS "subscriber"
    SET "userId" = "user"."id"
    FROM "User" AS "user"
    WHERE LOWER("subscriber"."email") = LOWER("user"."email")
      AND "subscriber"."userId" IS NULL
  `);
}

export async function ensureCurrentNewsletterIssue() {
  await syncNewsletterSubscriberLinks();
  const weekOf = getCurrentNewsletterIssueWeekOf();

  return prisma.newsletterIssue.upsert({
    where: { weekOf },
    update: {},
    create: {
      weekOf,
      status: NewsletterIssueStatus.OPEN,
    },
    include: issueInclude,
  });
}

export async function getNewsletterIssueHistory(limit = 8) {
  const issues = await prisma.newsletterIssue.findMany({
    orderBy: { weekOf: "desc" },
    take: limit,
    include: issueInclude,
  });

  return issues.map((issue) => ({
    ...issue,
    displayStatus: getNewsletterIssueDisplayStatus(issue),
    schedule: getNewsletterIssueSchedule(issue.weekOf),
  }));
}

async function getCurrentIssueWithFallback() {
  const issue = await ensureCurrentNewsletterIssue();

  return {
    ...issue,
    displayStatus: getNewsletterIssueDisplayStatus(issue),
    schedule: getNewsletterIssueSchedule(issue.weekOf),
  };
}

export async function getOrganizerNewsletterData(userId: string) {
  const [issue, user] = await Promise.all([
    getCurrentIssueWithFallback(),
    prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        globalRole: true,
        memberships: {
          where: {
            role: {
              in: MANAGER_ROLES,
            },
          },
          include: {
            organization: {
              select: {
                id: true,
                name: true,
                slug: true,
                type: true,
                city: true,
              },
            },
          },
          orderBy: {
            organization: {
              name: "asc",
            },
          },
        },
      },
    }),
  ]);

  const organizations =
    user.globalRole === UserRole.ADMIN
      ? await prisma.organization.findMany({
          orderBy: { name: "asc" },
          select: {
            id: true,
            name: true,
            slug: true,
            type: true,
            city: true,
          },
        })
      : user.memberships.map((membership) => membership.organization);
  const draftByOrganizationId = new Map(
    issue.organizationDrafts.map((draft) => [draft.organizationId, draft]),
  );

  return {
    issue,
    organizations: organizations.map((organization) => {
      const draft = draftByOrganizationId.get(organization.id);

      return {
        ...organization,
        draft: draft
          ? {
              id: draft.id,
              content: draft.content,
              adminOverridden: draft.adminOverridden,
              updatedAt: draft.updatedAt,
              lastEditedByName: nameForUser(draft.lastEditedBy),
            }
          : null,
      };
    }),
  };
}

export async function getAdminNewsletterData() {
  const issue = await getCurrentIssueWithFallback();
  const history = await getNewsletterIssueHistory(6);
  const organizations = await prisma.organization.findMany({
    orderBy: { name: "asc" },
    include: {
      memberships: {
        where: {
          role: {
            in: MANAGER_ROLES,
          },
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              displayName: true,
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: [{ role: "asc" }, { createdAt: "asc" }],
      },
    },
  });
  const draftByOrganizationId = new Map(
    issue.organizationDrafts.map((draft) => [draft.organizationId, draft]),
  );
  const rows = organizations
    .map((organization) => {
      const draft = draftByOrganizationId.get(organization.id);

      return {
        organization: {
          id: organization.id,
          name: organization.name,
          slug: organization.slug,
          type: organization.type,
          city: organization.city,
        },
        managerCount: organization.memberships.length,
        managers: organization.memberships.map((membership) => ({
          id: membership.user.id,
          name: nameForUser(membership.user),
          email: membership.user.email,
          role: membership.role,
        })),
        draft: draft
          ? {
              id: draft.id,
              content: draft.content,
              adminOverridden: draft.adminOverridden,
              updatedAt: draft.updatedAt,
              lastEditedByName: nameForUser(draft.lastEditedBy),
            }
          : null,
      };
    })
    .sort((left, right) => organizationSort(left.organization, right.organization));

  return {
    issue,
    history,
    rows,
    stats: {
      draftsSubmitted: rows.filter((row) => row.draft).length,
      draftsMissing: rows.filter((row) => !row.draft).length,
      overriddenDrafts: rows.filter((row) => row.draft?.adminOverridden).length,
    },
  };
}

async function loadIssueContent(issue: IssueWithDrafts) {
  const schedule = getNewsletterIssueSchedule(issue.weekOf);
  const [rides, events, routes] = await Promise.all([
    prisma.rideOccurrence.findMany({
      where: {
        startsAt: {
          gte: schedule.weekOf,
          lt: schedule.weekEndExclusive,
        },
        status: { not: OccurrenceStatus.CANCELED },
        rideSeries: {
          listingStatus: ListingStatus.PUBLISHED,
          organization: {
            listingStatus: ListingStatus.PUBLISHED,
          },
        },
      },
      include: {
        rideSeries: {
          include: {
            organization: true,
          },
        },
      },
      orderBy: { startsAt: "asc" },
    }),
    prisma.eventOccurrence.findMany({
      where: {
        startsAt: {
          gte: schedule.weekOf,
          lt: schedule.weekEndExclusive,
        },
        status: { not: OccurrenceStatus.CANCELED },
        eventSeries: {
          listingStatus: ListingStatus.PUBLISHED,
          organization: {
            listingStatus: ListingStatus.PUBLISHED,
          },
        },
      },
      include: {
        eventSeries: {
          include: {
            organization: true,
          },
        },
      },
      orderBy: { startsAt: "asc" },
    }),
    prisma.routeGuide.findMany({
      where: {
        listingStatus: ListingStatus.PUBLISHED,
      },
      orderBy: [{ touristFriendly: "desc" }, { createdAt: "desc" }],
      take: 4,
      include: {
        organization: true,
      },
    }),
  ]);

  const ridesByOrganizationId = new Map<string, typeof rides>();
  const eventsByOrganizationId = new Map<string, typeof events>();

  for (const ride of rides) {
    const current = ridesByOrganizationId.get(ride.rideSeries.organizationId) || [];
    current.push(ride);
    ridesByOrganizationId.set(ride.rideSeries.organizationId, current);
  }

  for (const event of events) {
    const current = eventsByOrganizationId.get(event.eventSeries.organizationId) || [];
    current.push(event);
    eventsByOrganizationId.set(event.eventSeries.organizationId, current);
  }

  return {
    schedule,
    rides,
    events,
    routes,
    ridesByOrganizationId,
    eventsByOrganizationId,
    draftsByOrganizationId: new Map(issue.organizationDrafts.map((draft) => [draft.organizationId, draft])),
  };
}

function renderRideItem(ride: Awaited<ReturnType<typeof loadIssueContent>>["rides"][number]) {
  const href = absoluteUrl(`/rides/${ride.rideSeries.slug}`);
  return `<strong><a href="${href}" style="color: #163126;">${sanitizeHtml(ride.rideSeries.title, {
    allowedTags: [],
    allowedAttributes: {},
  })}</a></strong> • ${sanitizeHtml(
    ride.rideSeries.organization.name,
    { allowedTags: [], allowedAttributes: {} },
  )} • ${formatOccurrenceTime(ride.startsAt)}`;
}

function renderEventItem(event: Awaited<ReturnType<typeof loadIssueContent>>["events"][number]) {
  const href = absoluteUrl(`/events/${event.eventSeries.slug}`);
  return `<strong><a href="${href}" style="color: #163126;">${sanitizeHtml(event.eventSeries.title, {
    allowedTags: [],
    allowedAttributes: {},
  })}</a></strong> • ${sanitizeHtml(
    event.eventSeries.organization.name,
    { allowedTags: [], allowedAttributes: {} },
  )} • ${formatOccurrenceTime(event.startsAt)}`;
}

function renderRouteItem(route: Awaited<ReturnType<typeof loadIssueContent>>["routes"][number]) {
  const href = absoluteUrl(`/routes/${route.slug}`);
  return `<strong><a href="${href}" style="color: #163126;">${sanitizeHtml(route.title, {
    allowedTags: [],
    allowedAttributes: {},
  })}</a></strong> • ${sanitizeHtml(route.city, {
    allowedTags: [],
    allowedAttributes: {},
  })} • ${route.distanceMiles} mi / ${route.elevationFeet} ft`;
}

function renderSection(title: string, body: string) {
  return `
    <section style="margin: 0 0 28px;">
      <h2 style="margin: 0 0 12px; font-size: 22px; color: #163126;">${sanitizeHtml(title, {
        allowedTags: [],
        allowedAttributes: {},
      })}</h2>
      ${body}
    </section>
  `;
}

function renderOrgSection(
  organization: DraftWithRelations["organization"],
  draft: DraftWithRelations | undefined,
  rides: Awaited<ReturnType<typeof loadIssueContent>>["rides"],
  events: Awaited<ReturnType<typeof loadIssueContent>>["events"],
) {
  const pieces: string[] = [];

  if (draft?.content) {
    pieces.push(renderNewsletterRichText(draft.content));
  }

  if (rides.length) {
    pieces.push(renderSection("Rides", renderList(rides.map(renderRideItem))));
  }

  if (events.length) {
    pieces.push(renderSection("Events", renderList(events.map(renderEventItem))));
  }

  if (!pieces.length) {
    pieces.push('<p style="margin: 0; line-height: 1.65;">No organization-specific updates were added for this week.</p>');
  }

  return renderSection(
    organization.name,
    `<p style="margin: 0 0 14px; color: #4b6358;">${sanitizeHtml(organization.city, {
      allowedTags: [],
      allowedAttributes: {},
    })}</p>${pieces.join("")}`,
  );
}

function renderNewsletterShell(args: {
  issue: IssueWithDrafts;
  intro: string;
  sections: string[];
}) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 760px; margin: 0 auto; color: #163126;">
      <header style="padding: 28px 0 24px; border-bottom: 1px solid #d7e1db; margin-bottom: 28px;">
        <p style="margin: 0 0 8px; font-size: 12px; letter-spacing: 0.18em; text-transform: uppercase; color: #6a7f75;">
          Weekly newsletter
        </p>
        <h1 style="margin: 0 0 10px; font-size: 32px; color: #163126;">Cycle Sonoma County</h1>
        <p style="margin: 0; font-size: 17px; line-height: 1.6;">${sanitizeHtml(args.intro, {
          allowedTags: [],
          allowedAttributes: {},
        })}</p>
        <p style="margin: 14px 0 0; font-size: 13px; color: #6a7f75;">Week of ${formatWeekRange(
          args.issue.weekOf,
        )}</p>
      </header>
      ${args.sections.join("")}
    </div>
  `;
}

function renderReminderEmail(args: {
  managerName: string;
  organizationNames: string[];
  issue: IssueWithDrafts;
}) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 680px; margin: 0 auto; color: #163126;">
      <h1 style="font-size: 28px; margin: 0 0 16px;">Newsletter reminder</h1>
      <p style="line-height: 1.65; margin: 0 0 14px;">${sanitizeHtml(args.managerName, {
        allowedTags: [],
        allowedAttributes: {},
      })}, please add your organization update for the week of ${formatWeekRange(args.issue.weekOf)} by Friday at 6:00 PM Pacific.</p>
      <p style="line-height: 1.65; margin: 0 0 14px;">Missing organization updates:</p>
      ${renderList(
        args.organizationNames.map((organizationName) =>
          sanitizeHtml(organizationName, { allowedTags: [], allowedAttributes: {} }),
        ),
      )}
      <p style="line-height: 1.65; margin: 16px 0 0;">Open the organizer console to add or revise each organization's weekly note.</p>
    </div>
  `;
}

async function buildRecipientNewsletter(args: {
  issue: IssueWithDrafts;
  content: Awaited<ReturnType<typeof loadIssueContent>>;
  subscriber: {
    email: string;
    user?: {
      id: string;
      follows: Array<{ organizationId: string }>;
    } | null;
  };
}) {
  const subject = buildSubject(args.issue.weekOf);
  const globalSection = args.issue.globalSection?.trim()
    ? renderSection("From the admin desk", renderNewsletterRichText(args.issue.globalSection))
    : "";

  if (!args.subscriber.user) {
    return {
      subject,
      html: renderNewsletterShell({
        issue: args.issue,
        intro: "A short admin update for the upcoming Sonoma County cycling week.",
        sections: [
          globalSection ||
            renderSection(
              "From the admin desk",
              "<p style=\"margin: 0; line-height: 1.65;\">No admin-wide note was added for this issue.</p>",
            ),
        ],
      }),
    };
  }

  const followedOrganizationIds = [...new Set(args.subscriber.user.follows.map((follow) => follow.organizationId))];
  const followedDrafts = followedOrganizationIds
    .map((organizationId) => args.content.draftsByOrganizationId.get(organizationId))
    .filter(Boolean) as DraftWithRelations[];
  const followedSections = followedOrganizationIds
    .map((organizationId) => {
      const draft = args.content.draftsByOrganizationId.get(organizationId);
      const organization = draft?.organization;
      const rides = args.content.ridesByOrganizationId.get(organizationId) || [];
      const events = args.content.eventsByOrganizationId.get(organizationId) || [];

      if (!organization || (!draft && !rides.length && !events.length)) {
        return null;
      }

      return renderOrgSection(organization, draft, rides, events);
    })
    .filter(Boolean) as string[];
  const countyRoundup = renderSection(
    "County-wide week ahead",
    [
      renderSection("All rides", renderList(args.content.rides.map(renderRideItem))),
      renderSection("All events", renderList(args.content.events.map(renderEventItem))),
      renderSection("Route ideas", renderList(args.content.routes.map(renderRouteItem))),
    ].join(""),
  );
  const intro =
    followedDrafts.length || followedSections.length
      ? "Your followed organizations plus the full county-wide week ahead."
      : "Your weekly Sonoma County roundup, with personalization ready when you follow organizations.";

  return {
    subject,
    html: renderNewsletterShell({
      issue: args.issue,
      intro,
      sections: [
        globalSection ||
          renderSection(
            "From the admin desk",
            "<p style=\"margin: 0; line-height: 1.65;\">No admin-wide note was added for this issue.</p>",
          ),
        followedSections.length
          ? renderSection("Updates from organizations you follow", followedSections.join(""))
          : "",
        countyRoundup,
      ].filter(Boolean),
    }),
  };
}

async function getPreviewRecipient() {
  const linkedSubscriber = await prisma.newsletterSubscriber.findFirst({
    where: {
      status: NewsletterStatus.ACTIVE,
      userId: {
        not: null,
      },
      user: {
        follows: {
          some: {},
        },
      },
    },
    include: {
      user: {
        select: {
          id: true,
          follows: {
            select: {
              organizationId: true,
            },
          },
        },
      },
    },
    orderBy: { subscribedAt: "asc" },
  });

  if (linkedSubscriber) {
    return linkedSubscriber;
  }

  const followedUser = await prisma.user.findFirst({
    where: {
      follows: {
        some: {},
      },
    },
    select: {
      id: true,
      email: true,
      follows: {
        select: {
          organizationId: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return followedUser
    ? {
        email: followedUser.email,
        user: {
          id: followedUser.id,
          follows: followedUser.follows,
        },
      }
    : {
        email: "preview@cyclesonoma.demo",
        user: {
          id: "preview",
          follows: [],
        },
      };
}

async function sendViaResend(args: { to: string; subject: string; html: string }) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: env.NEWSLETTER_FROM_EMAIL,
      to: [args.to],
      subject: args.subject,
      html: args.html,
    }),
  });

  if (!response.ok) {
    throw new Error(`Resend API failed with status ${response.status}`);
  }
}

export async function previewCurrentNewsletterIssue() {
  const issue = await ensureCurrentNewsletterIssue();
  const content = await loadIssueContent(issue);
  const linkedPreviewRecipient = await getPreviewRecipient();
  const linkedPreview = await buildRecipientNewsletter({
    issue,
    content,
    subscriber: linkedPreviewRecipient,
  });
  const unlinkedPreview = await buildRecipientNewsletter({
    issue,
    content,
    subscriber: {
      email: "preview-unlinked@cyclesonoma.demo",
      user: null,
    },
  });

  const updatedIssue = await prisma.newsletterIssue.update({
    where: { id: issue.id },
    data: {
      previewSubject: linkedPreview.subject,
      linkedPreviewHtml: linkedPreview.html,
      unlinkedPreviewHtml: unlinkedPreview.html,
    },
    include: issueInclude,
  });

  return {
    issue: updatedIssue,
    subject: linkedPreview.subject,
    linkedPreviewHtml: linkedPreview.html,
    unlinkedPreviewHtml: unlinkedPreview.html,
  };
}

export async function saveNewsletterGlobalSection(content: string) {
  const issue = await ensureCurrentNewsletterIssue();

  return prisma.newsletterIssue.update({
    where: { id: issue.id },
    data: {
      globalSection: content.trim(),
    },
    include: issueInclude,
  });
}

async function loadIssueForEditing() {
  const issue = await ensureCurrentNewsletterIssue();

  if (isNewsletterIssueLocked(issue) || issue.status === NewsletterIssueStatus.SENT) {
    throw new Error("This newsletter issue is finalized.");
  }

  return issue;
}

export async function saveNewsletterOrganizationDraft(args: {
  userId: string;
  organizationId: string;
  content: string;
  adminOverride?: boolean;
}) {
  const issue = args.adminOverride ? await ensureCurrentNewsletterIssue() : await loadIssueForEditing();

  if (args.adminOverride && issue.status === NewsletterIssueStatus.SENT) {
    throw new Error("This newsletter issue has already been sent.");
  }

  return prisma.newsletterOrganizationDraft.upsert({
    where: {
      issueId_organizationId: {
        issueId: issue.id,
        organizationId: args.organizationId,
      },
    },
    update: {
      content: args.content.trim(),
      adminOverridden: args.adminOverride ?? false,
      lastEditedById: args.userId,
    },
    create: {
      issueId: issue.id,
      organizationId: args.organizationId,
      content: args.content.trim(),
      adminOverridden: args.adminOverride ?? false,
      lastEditedById: args.userId,
    },
    include: {
      organization: true,
      lastEditedBy: {
        select: {
          email: true,
          displayName: true,
          firstName: true,
          lastName: true,
        },
      },
    },
  });
}

async function sendReminderEmails(issue: IssueWithDrafts) {
  const organizations = await prisma.organization.findMany({
    orderBy: { name: "asc" },
    include: {
      memberships: {
        where: {
          role: {
            in: MANAGER_ROLES,
          },
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              displayName: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      },
    },
  });
  const draftedOrganizationIds = new Set(issue.organizationDrafts.map((draft) => draft.organizationId));
  const remindersByUser = new Map<string, { email: string; name: string; organizations: string[] }>();

  for (const organization of organizations) {
    if (draftedOrganizationIds.has(organization.id)) {
      continue;
    }

    for (const membership of organization.memberships) {
      const existing = remindersByUser.get(membership.user.id) || {
        email: membership.user.email,
        name: nameForUser(membership.user),
        organizations: [],
      };
      existing.organizations.push(organization.name);
      remindersByUser.set(membership.user.id, existing);
    }
  }

  const recipients = [...remindersByUser.values()].sort((left, right) => left.email.localeCompare(right.email));
  const dryRun = !(env.RESEND_API_KEY && env.NEWSLETTER_FROM_EMAIL);

  if (!dryRun) {
    for (const recipient of recipients) {
      await sendViaResend({
        to: recipient.email,
        subject: `Reminder: add your Cycle Sonoma County newsletter update by Friday at 6 PM`,
        html: renderReminderEmail({
          managerName: recipient.name,
          organizationNames: recipient.organizations,
          issue,
        }),
      });
    }
  }

  await prisma.newsletterIssue.update({
    where: { id: issue.id },
    data: {
      reminderSentAt: new Date(),
      reminderSentCount: recipients.length,
      reminderDryRun: dryRun,
    },
  });

  return {
    dryRun,
    recipientCount: recipients.length,
  };
}

async function sendIssue(issue: IssueWithDrafts) {
  const activeSubscribers = await prisma.newsletterSubscriber.findMany({
    where: {
      status: NewsletterStatus.ACTIVE,
    },
    include: {
      user: {
        select: {
          id: true,
          follows: {
            select: {
              organizationId: true,
            },
          },
        },
      },
    },
    orderBy: { subscribedAt: "asc" },
  });
  const content = await loadIssueContent(issue);
  const dryRun = !(env.RESEND_API_KEY && env.NEWSLETTER_FROM_EMAIL);
  let sentCount = 0;
  let linkedPreviewHtml = issue.linkedPreviewHtml;
  let unlinkedPreviewHtml = issue.unlinkedPreviewHtml;
  let previewSubject = issue.previewSubject;

  for (const subscriber of activeSubscribers) {
    const recipientNewsletter = await buildRecipientNewsletter({
      issue,
      content,
      subscriber,
    });

    previewSubject ||= recipientNewsletter.subject;
    if (subscriber.user && !linkedPreviewHtml) {
      linkedPreviewHtml = recipientNewsletter.html;
    }
    if (!subscriber.user && !unlinkedPreviewHtml) {
      unlinkedPreviewHtml = recipientNewsletter.html;
    }

    if (!dryRun) {
      await sendViaResend({
        to: subscriber.email,
        subject: recipientNewsletter.subject,
        html: recipientNewsletter.html,
      });
      sentCount += 1;
    }
  }

  await prisma.newsletterIssue.update({
    where: { id: issue.id },
    data: {
      status: NewsletterIssueStatus.SENT,
      lockedAt: issue.lockedAt || new Date(),
      sentAt: new Date(),
      sendDryRun: dryRun,
      sentCount: dryRun ? 0 : sentCount,
      previewSubject: previewSubject || buildSubject(issue.weekOf),
      linkedPreviewHtml,
      unlinkedPreviewHtml,
    },
  });

  if (!dryRun && activeSubscribers.length) {
    await prisma.newsletterSubscriber.updateMany({
      where: {
        id: {
          in: activeSubscribers.map((subscriber) => subscriber.id),
        },
      },
      data: {
        lastDigestSentAt: new Date(),
      },
    });
  }

  return {
    dryRun,
    subscriberCount: activeSubscribers.length,
    sentCount: dryRun ? 0 : sentCount,
  };
}

export async function forceSendCurrentNewsletterIssue() {
  const issue = await ensureCurrentNewsletterIssue();

  if (issue.status === NewsletterIssueStatus.SENT) {
    return {
      status: issue.status,
      issue,
    };
  }

  return sendIssue(issue);
}

export async function runNewsletterAutomation() {
  const issue = await ensureCurrentNewsletterIssue();
  const schedule = getNewsletterIssueSchedule(issue.weekOf);
  const now = new Date();
  const result = {
    issueWeekOf: issue.weekOf,
    reminder: "not_due",
    lock: "not_due",
    send: "not_due",
  };

  if (!issue.reminderSentAt && now >= schedule.reminderAt) {
    const reminderResult = await sendReminderEmails(issue);
    result.reminder = reminderResult.dryRun
      ? `dry_run:${reminderResult.recipientCount}`
      : `sent:${reminderResult.recipientCount}`;
  }

  if (issue.status === NewsletterIssueStatus.OPEN && now >= schedule.lockAt) {
    await prisma.newsletterIssue.update({
      where: { id: issue.id },
      data: {
        status: NewsletterIssueStatus.LOCKED,
        lockedAt: now,
      },
    });
    result.lock = "locked";
  }

  if (issue.status !== NewsletterIssueStatus.SENT && now >= schedule.sendAt) {
    const sendResult = await sendIssue({
      ...issue,
      status: NewsletterIssueStatus.LOCKED,
    });
    result.send = sendResult.dryRun
      ? `dry_run:${sendResult.subscriberCount}`
      : `sent:${sendResult.sentCount}`;
  }

  return result;
}
