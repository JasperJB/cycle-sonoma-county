import { format } from "date-fns";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";

const dayMap = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

export async function buildNewsletterDigest() {
  const [rides, events, sponsors, routes] = await Promise.all([
    prisma.rideOccurrence.findMany({
      where: {
        startsAt: {
          gte: new Date(),
        },
        status: { not: "CANCELED" },
      },
      include: {
        rideSeries: {
          include: {
            organization: true,
          },
        },
      },
      orderBy: { startsAt: "asc" },
      take: 5,
    }),
    prisma.eventOccurrence.findMany({
      where: {
        startsAt: {
          gte: new Date(),
        },
        status: { not: "CANCELED" },
      },
      include: {
        eventSeries: {
          include: {
            organization: true,
          },
        },
      },
      orderBy: { startsAt: "asc" },
      take: 5,
    }),
    prisma.sponsorPlacement.findMany({
      where: { isActive: true },
      orderBy: [{ slot: "asc" }, { priority: "desc" }],
      take: 3,
    }),
    prisma.routeGuide.findMany({
      where: { listingStatus: "PUBLISHED" },
      orderBy: [{ touristFriendly: "desc" }, { createdAt: "desc" }],
      take: 2,
    }),
  ]);

  const subject = `Cycle Sonoma County digest • ${format(new Date(), "MMM d, yyyy")}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 720px; margin: 0 auto; color: #163126;">
      <h1 style="font-size: 28px;">Cycle Sonoma County</h1>
      <p style="font-size: 16px; line-height: 1.6;">Upcoming rides, events, and route ideas from around Sonoma County.</p>
      <h2>Upcoming rides</h2>
      <ul>
        ${rides
          .map(
            (ride) =>
              `<li><strong>${ride.rideSeries.title}</strong> • ${ride.rideSeries.organization.name} • ${format(
                ride.startsAt,
                "EEE, MMM d h:mm a",
              )}</li>`,
          )
          .join("")}
      </ul>
      <h2>Upcoming events</h2>
      <ul>
        ${events
          .map(
            (event) =>
              `<li><strong>${event.eventSeries.title}</strong> • ${event.eventSeries.organization.name} • ${format(
                event.startsAt,
                "EEE, MMM d h:mm a",
              )}</li>`,
          )
          .join("")}
      </ul>
      <h2>Route ideas</h2>
      <ul>
        ${routes
          .map(
            (route) =>
              `<li><strong>${route.title}</strong> • ${route.distanceMiles} mi / ${route.elevationFeet} ft</li>`,
          )
          .join("")}
      </ul>
      <h2>Sponsor placements</h2>
      <ul>
        ${sponsors
          .map(
            (sponsor) =>
              `<li><strong>${sponsor.title}</strong>${sponsor.blurb ? ` • ${sponsor.blurb}` : ""}</li>`,
          )
          .join("")}
      </ul>
    </div>
  `;

  return { subject, html, rides, events, sponsors, routes };
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

export async function runNewsletterDigest(options?: { force?: boolean }) {
  const digestDate = new Date(new Date().toDateString());
  const sendDay = env.NEWSLETTER_SEND_DAY.toLowerCase();
  const todayName = dayMap[new Date().getDay()];

  if (!options?.force && todayName !== sendDay) {
    return {
      status: "skipped",
      reason: `Configured send day is ${sendDay}.`,
    };
  }

  const existing = await prisma.newsletterDigest.findUnique({
    where: { digestDate },
  });

  if (existing) {
    return {
      status: existing.status,
      digest: existing,
    };
  }

  const { subject, html } = await buildNewsletterDigest();
  const subscribers = await prisma.newsletterSubscriber.findMany({
    where: { status: "ACTIVE" },
  });
  const dryRun = !(env.RESEND_API_KEY && env.NEWSLETTER_FROM_EMAIL);

  if (!dryRun) {
    for (const subscriber of subscribers) {
      await sendViaResend({
        to: subscriber.email,
        subject,
        html,
      });
    }
  }

  const digest = await prisma.newsletterDigest.create({
    data: {
      digestDate,
      dryRun,
      status: dryRun ? "dry_run" : "sent",
      subject,
      previewHtml: html,
      sentCount: dryRun ? 0 : subscribers.length,
    },
  });

  return {
    status: digest.status,
    digest,
  };
}
