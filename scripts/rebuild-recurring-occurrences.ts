import { PrismaPg } from "@prisma/adapter-pg";
import { OccurrenceStatus, OccurrenceOverrideType } from "@/app/generated/prisma/enums";
import { env } from "@/lib/env";
import {
  materializationWindow,
  materializeOccurrences,
  type RecurrenceExceptionInput,
} from "@/lib/recurrence";

type RideExceptionRecord = {
  occurrenceAt: Date;
  overrideType: string;
  newStartsAt: Date | null;
  newEndsAt: Date | null;
  note: string | null;
};

type RecurringRideRecord = {
  id: string;
  recurrenceRule: string | null;
  estimatedDurationMinutes: number;
  exceptions: RideExceptionRecord[];
};

type RecurringEventRecord = {
  id: string;
  recurrenceRule: string | null;
  startsAt: Date;
  endsAt: Date;
};

type PrismaClientInstance = {
  $disconnect: () => Promise<void>;
  $transaction: (operations: Promise<unknown>[]) => Promise<unknown[]>;
  rideSeries: {
    findMany: (args: unknown) => Promise<RecurringRideRecord[]>;
  };
  rideOccurrence: {
    deleteMany: (args: unknown) => Promise<unknown>;
    createMany: (args: unknown) => Promise<unknown>;
  };
  eventSeries: {
    findMany: (args: unknown) => Promise<RecurringEventRecord[]>;
  };
  eventOccurrence: {
    deleteMany: (args: unknown) => Promise<unknown>;
    createMany: (args: unknown) => Promise<unknown>;
  };
};

async function main() {
  const prismaModule = await import("../app/generated/prisma/client");
  const resolvedModule = ("default" in prismaModule ? prismaModule.default : prismaModule) as {
    PrismaClient: new (args: { adapter: PrismaPg }) => PrismaClientInstance;
  };
  const PrismaClient = resolvedModule.PrismaClient;
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: env.DATABASE_URL }),
  });
  const window = materializationWindow();

  try {
    const [rides, events] = await Promise.all([
      prisma.rideSeries.findMany({
        where: { recurrenceRule: { not: "" } },
        include: {
          exceptions: {
            orderBy: { occurrenceAt: "asc" },
          },
        },
      }),
      prisma.eventSeries.findMany({
        where: { recurrenceRule: { not: "" } },
      }),
    ]);

    let rebuiltRideCount = 0;
    let rebuiltRideOccurrenceCount = 0;
    let rebuiltEventCount = 0;
    let rebuiltEventOccurrenceCount = 0;

    for (const ride of rides) {
      if (!ride.recurrenceRule) {
        continue;
      }

      const exceptions: RecurrenceExceptionInput[] = ride.exceptions.map((exception) => ({
        occurrenceAt: exception.occurrenceAt,
        overrideType:
          exception.overrideType === OccurrenceOverrideType.CANCELED
            ? "CANCELED"
            : "RESCHEDULED",
        newStartsAt: exception.newStartsAt,
        newEndsAt: exception.newEndsAt,
        note: exception.note,
      }));

      const occurrences = materializeOccurrences({
        rule: ride.recurrenceRule,
        durationMinutes: ride.estimatedDurationMinutes,
        rangeStart: window.from,
        rangeEnd: window.to,
        exceptions,
      });

      await prisma.$transaction([
        prisma.rideOccurrence.deleteMany({
          where: { rideSeriesId: ride.id },
        }),
        prisma.rideOccurrence.createMany({
          data: occurrences.map((occurrence) => ({
            rideSeriesId: ride.id,
            startsAt: occurrence.startsAt,
            endsAt: occurrence.endsAt,
            status:
              occurrence.status === "CANCELED"
                ? OccurrenceStatus.CANCELED
                : occurrence.status === "RESCHEDULED"
                  ? OccurrenceStatus.RESCHEDULED
                  : OccurrenceStatus.SCHEDULED,
            summaryOverride: occurrence.note ?? undefined,
          })),
        }),
      ]);

      rebuiltRideCount += 1;
      rebuiltRideOccurrenceCount += occurrences.length;
    }

    for (const event of events) {
      if (!event.recurrenceRule) {
        continue;
      }

      const occurrences = materializeOccurrences({
        rule: event.recurrenceRule,
        durationMinutes: Math.max(
          30,
          Math.round((event.endsAt.getTime() - event.startsAt.getTime()) / 60000),
        ),
        rangeStart: window.from,
        rangeEnd: window.to,
      });

      await prisma.$transaction([
        prisma.eventOccurrence.deleteMany({
          where: { eventSeriesId: event.id },
        }),
        prisma.eventOccurrence.createMany({
          data: occurrences.map((occurrence) => ({
            eventSeriesId: event.id,
            startsAt: occurrence.startsAt,
            endsAt: occurrence.endsAt,
            status:
              occurrence.status === "RESCHEDULED"
                ? OccurrenceStatus.RESCHEDULED
                : OccurrenceStatus.SCHEDULED,
          })),
        }),
      ]);

      rebuiltEventCount += 1;
      rebuiltEventOccurrenceCount += occurrences.length;
    }

    console.log(
      JSON.stringify(
        {
          rebuiltRideCount,
          rebuiltRideOccurrenceCount,
          rebuiltEventCount,
          rebuiltEventOccurrenceCount,
          window,
        },
        null,
        2,
      ),
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
