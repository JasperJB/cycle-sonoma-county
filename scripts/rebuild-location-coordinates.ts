import dotenv from "dotenv";

dotenv.config({ path: process.env.ENV_FILE || ".env.local" });

type BackfillOptions = {
  applyAll: boolean;
  dryRun: boolean;
};

function parseOptions(): BackfillOptions {
  const args = new Set(process.argv.slice(2));

  return {
    applyAll: args.has("--all"),
    dryRun: args.has("--dry-run"),
  };
}

function sleep(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function main() {
  const options = parseOptions();
  const { env } = await import("../lib/env");
  const { prisma } = await import("../lib/prisma");
  const { resolveMapLocation } = await import("../lib/location");

  const usePublicNominatim = !env.GEOCODING_API_URL;
  const delayMs = usePublicNominatim ? 1_100 : 0;

  const [organizations, rides, events, routes] = await Promise.all([
    prisma.organization.findMany({
      where: options.applyAll
        ? { addressLine1: { not: null } }
        : { addressLine1: { not: null }, OR: [{ latitude: null }, { longitude: null }] },
      select: {
        id: true,
        name: true,
        city: true,
        addressLine1: true,
        postalCode: true,
        latitude: true,
        longitude: true,
      },
      orderBy: { name: "asc" },
    }),
    prisma.rideSeries.findMany({
      where: options.applyAll
        ? { meetingAddress: { not: null } }
        : { meetingAddress: { not: null }, OR: [{ latitude: null }, { longitude: null }] },
      select: {
        id: true,
        title: true,
        city: true,
        meetingAddress: true,
        latitude: true,
        longitude: true,
      },
      orderBy: { title: "asc" },
    }),
    prisma.eventSeries.findMany({
      where: options.applyAll
        ? { locationAddress: { not: null } }
        : { locationAddress: { not: null }, OR: [{ latitude: null }, { longitude: null }] },
      select: {
        id: true,
        title: true,
        city: true,
        locationAddress: true,
        latitude: true,
        longitude: true,
      },
      orderBy: { title: "asc" },
    }),
    prisma.routeGuide.findMany({
      where: options.applyAll
        ? { startAddress: { not: null } }
        : { startAddress: { not: null }, OR: [{ latitude: null }, { longitude: null }] },
      select: {
        id: true,
        title: true,
        city: true,
        startAddress: true,
        latitude: true,
        longitude: true,
      },
      orderBy: { title: "asc" },
    }),
  ]);

  let successCount = 0;
  let failureCount = 0;

  async function processRecord(
    kind: "organization" | "ride" | "event" | "route",
    id: string,
    label: string,
    city: string,
    addressLine1: string | null,
    existing: {
      city: string;
      addressLine1?: string | null;
      postalCode?: string | null;
      latitude?: number | null;
      longitude?: number | null;
    },
  ) {
    try {
      const location = await resolveMapLocation({
        city,
        addressLine1,
        postalCode: existing.postalCode,
        label,
        existing,
      });

      if (!options.dryRun) {
        if (kind === "organization") {
          await prisma.organization.update({
            where: { id },
            data: {
              city: location.city,
              addressLine1: location.addressLine1,
              postalCode: location.postalCode,
              latitude: location.latitude,
              longitude: location.longitude,
            },
          });
        } else if (kind === "ride") {
          await prisma.rideSeries.update({
            where: { id },
            data: {
              city: location.city,
              meetingAddress: location.addressLine1,
              latitude: location.latitude,
              longitude: location.longitude,
            },
          });
        } else if (kind === "event") {
          await prisma.eventSeries.update({
            where: { id },
            data: {
              city: location.city,
              locationAddress: location.addressLine1,
              latitude: location.latitude,
              longitude: location.longitude,
            },
          });
        } else {
          await prisma.routeGuide.update({
            where: { id },
            data: {
              city: location.city,
              startAddress: location.addressLine1,
              latitude: location.latitude,
              longitude: location.longitude,
            },
          });
        }
      }

      successCount += 1;
      console.log(`[ok] ${kind}: ${label} -> ${location.latitude}, ${location.longitude}`);
    } catch (error) {
      failureCount += 1;
      console.error(
        `[fail] ${kind}: ${label} -> ${
          error instanceof Error ? error.message : "Unknown geocoding error."
        }`,
      );
    }

    if (delayMs) {
      await sleep(delayMs);
    }
  }

  for (const organization of organizations) {
    await processRecord("organization", organization.id, organization.name, organization.city, organization.addressLine1, organization);
  }

  for (const ride of rides) {
    await processRecord("ride", ride.id, ride.title, ride.city, ride.meetingAddress, ride);
  }

  for (const event of events) {
    await processRecord("event", event.id, event.title, event.city, event.locationAddress, event);
  }

  for (const route of routes) {
    await processRecord("route", route.id, route.title, route.city, route.startAddress, route);
  }

  console.log(
    JSON.stringify(
      {
        dryRun: options.dryRun,
        scanned: organizations.length + rides.length + events.length + routes.length,
        updated: successCount,
        failed: failureCount,
      },
      null,
      2,
    ),
  );

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
