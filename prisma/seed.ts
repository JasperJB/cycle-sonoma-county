import { PrismaPg } from "@prisma/adapter-pg";
import {
  ClubKind,
  DifficultyLevel,
  DropPolicy,
  EventType,
  FavoriteTargetType,
  ListingStatus,
  NewsletterStatus,
  OccurrenceOverrideType,
  OccurrenceStatus,
  OrganizationMembershipRole,
  OrganizationType,
  PrismaClient,
  ReportReason,
  ReportStatus,
  RideType,
  SponsorSlot,
  SurfaceType,
  UserRole,
  VerificationStatus,
} from "../app/generated/prisma/client";
import {
  buildRecurrenceRule,
  combineZonedDate,
  defaultArchiveDate,
  materializationWindow,
  materializeOccurrences,
  recurrenceToText,
} from "../lib/recurrence";
import { addDays, subDays } from "date-fns";
import slugify from "slugify";

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString:
      process.env.DATABASE_URL ||
      "postgresql://postgres:password@127.0.0.1:5432/cycle_sonoma_county?schema=public",
  }),
});
const timezone = "America/Los_Angeles";

function slug(value: string) {
  return slugify(value, { lower: true, strict: true });
}

function searchDocument(parts: Array<string | undefined | null>) {
  return parts.filter(Boolean).join(" ").toLowerCase();
}

function localDate(date: string, time: string) {
  return combineZonedDate(date, time, timezone);
}

async function main() {
  await prisma.auditLog.deleteMany();
  await prisma.report.deleteMany();
  await prisma.newsletterDigest.deleteMany();
  await prisma.newsletterSubscriber.deleteMany();
  await prisma.sponsorPlacement.deleteMany();
  await prisma.favorite.deleteMany();
  await prisma.follow.deleteMany();
  await prisma.rideException.deleteMany();
  await prisma.rideOccurrence.deleteMany();
  await prisma.eventOccurrence.deleteMany();
  await prisma.routeGuide.deleteMany();
  await prisma.eventSeries.deleteMany();
  await prisma.rideSeries.deleteMany();
  await prisma.shopProfile.deleteMany();
  await prisma.clubProfile.deleteMany();
  await prisma.organizationMembership.deleteMany();
  await prisma.verificationRequest.deleteMany();
  await prisma.organization.deleteMany();
  await prisma.siteSetting.deleteMany();
  await prisma.user.deleteMany();

  const adminUser = await prisma.user.create({
    data: {
      email: "admin@cyclesonoma.demo",
      firstName: "Avery",
      lastName: "Quinn",
      displayName: "Avery Quinn",
      city: "Santa Rosa",
      globalRole: UserRole.ADMIN,
      isOrganizerApproved: true,
      onboardingCompletedAt: subDays(new Date(), 30),
      bio: "Site administrator and local ride steward for Cycle Sonoma County.",
    },
  });

  const organizerUser = await prisma.user.create({
    data: {
      email: "organizer@cyclesonoma.demo",
      firstName: "Mira",
      lastName: "Solis",
      displayName: "Mira Solis",
      city: "Sebastopol",
      globalRole: UserRole.ORGANIZER,
      isOrganizerApproved: true,
      onboardingCompletedAt: subDays(new Date(), 21),
      bio: "Community organizer focused on beginner-friendly rides and youth programming.",
    },
  });

  const memberUser = await prisma.user.create({
    data: {
      email: "member@cyclesonoma.demo",
      firstName: "Jonah",
      lastName: "Hart",
      displayName: "Jonah Hart",
      city: "Petaluma",
      globalRole: UserRole.MEMBER,
      isOrganizerApproved: false,
      bio: "Weekend rider, route collector, and newsletter subscriber.",
    },
  });

  const shopOwner = await prisma.user.create({
    data: {
      email: "shop-owner@cyclesonoma.demo",
      firstName: "Tessa",
      lastName: "Lane",
      displayName: "Tessa Lane",
      city: "Santa Rosa",
      globalRole: UserRole.ORGANIZER,
      isOrganizerApproved: true,
      onboardingCompletedAt: subDays(new Date(), 18),
    },
  });

  const clubLeader = await prisma.user.create({
    data: {
      email: "club-lead@cyclesonoma.demo",
      firstName: "Diego",
      lastName: "Mar",
      displayName: "Diego Mar",
      city: "Healdsburg",
      globalRole: UserRole.ORGANIZER,
      isOrganizerApproved: true,
      onboardingCompletedAt: subDays(new Date(), 14),
    },
  });

  const organizations = await Promise.all([
    prisma.organization.create({
      data: {
        slug: slug("Harborline Cycle Works"),
        name: "Harborline Cycle Works",
        shortDescription: "A coastal-minded service shop with rental bikes and all-day repair support.",
        description:
          "Fictional neighborhood bike shop focused on rental-ready road bikes, e-bike troubleshooting, and visitor-friendly fit advice.",
        type: OrganizationType.SHOP,
        listingStatus: ListingStatus.PUBLISHED,
        verificationStatus: VerificationStatus.APPROVED,
        city: "Santa Rosa",
        addressLine1: "18 Lantern Yard",
        postalCode: "95403",
        latitude: 38.4512,
        longitude: -122.7367,
        websiteUrl: "https://harborline-cycle-works.demo",
        phone: "(707) 555-0101",
        email: "hello@harborline-cycle-works.demo",
        logoUrl: "/demo-media/harborline-logo.svg",
        bannerUrl: "/demo-media/harborline-banner.jpg",
        verifiedBadgeLabel: "Verified shop",
        publishedAt: subDays(new Date(), 45),
        searchDocument: searchDocument([
          "Harborline Cycle Works",
          "Santa Rosa rentals repair bike fit e-bike support",
        ]),
        memberships: {
          create: [
            {
              userId: shopOwner.id,
              role: OrganizationMembershipRole.OWNER,
            },
            {
              userId: organizerUser.id,
              role: OrganizationMembershipRole.EDITOR,
            },
          ],
        },
        shopProfile: {
          create: {
            serviceCategories: ["Service", "Rental", "Bike Fit", "Visitor Support"],
            brands: ["Solstice", "Vale", "Granite"],
            hours: {
              mon: "9a-5p",
              tue: "9a-6p",
              wed: "9a-6p",
              thu: "9a-6p",
              fri: "9a-6p",
              sat: "8a-4p",
              sun: "10a-3p",
            },
            offersRentals: true,
            offersBikeFit: true,
            offersRepair: true,
            supportsEBikes: true,
            rentalDetails: "Road, gravel, and hybrid rentals by reservation.",
          },
        },
      },
    }),
    prisma.organization.create({
      data: {
        slug: slug("Verde Loop Bicycle Atelier"),
        name: "Verde Loop Bicycle Atelier",
        shortDescription: "Fictional downtown Petaluma shop blending commuter builds with gravel service.",
        description:
          "A warm, efficient service hub for commuters and mixed-surface riders with same-day repair windows.",
        type: OrganizationType.SHOP,
        listingStatus: ListingStatus.PUBLISHED,
        verificationStatus: VerificationStatus.APPROVED,
        city: "Petaluma",
        addressLine1: "42 Copper Alley",
        postalCode: "94952",
        latitude: 38.2328,
        longitude: -122.6383,
        websiteUrl: "https://verde-loop.demo",
        phone: "(707) 555-0128",
        email: "team@verde-loop.demo",
        verifiedBadgeLabel: "Verified shop",
        publishedAt: subDays(new Date(), 38),
        searchDocument: searchDocument([
          "Verde Loop Bicycle Atelier",
          "Petaluma commuter gravel repair fittings rentals",
        ]),
        memberships: {
          create: [{ userId: organizerUser.id, role: OrganizationMembershipRole.OWNER }],
        },
        shopProfile: {
          create: {
            serviceCategories: ["Repair", "Commuter", "Wheel Builds"],
            brands: ["Brookmere", "Crest", "Loom"],
            hours: {
              mon: "Closed",
              tue: "10a-6p",
              wed: "10a-6p",
              thu: "10a-6p",
              fri: "10a-6p",
              sat: "9a-4p",
              sun: "9a-2p",
            },
            offersRentals: false,
            offersBikeFit: true,
            offersRepair: true,
            supportsEBikes: false,
          },
        },
      },
    }),
    prisma.organization.create({
      data: {
        slug: slug("North Quarry Velo Service"),
        name: "North Quarry Velo Service",
        shortDescription: "A fictional Windsor repair studio with gravel demo bikes and suspension tune-ups.",
        description:
          "North Quarry supports trail, gravel, and e-bike riders with long-form diagnostics and event tech support.",
        type: OrganizationType.SHOP,
        listingStatus: ListingStatus.PUBLISHED,
        verificationStatus: VerificationStatus.APPROVED,
        city: "Windsor",
        addressLine1: "7 Mason Spur",
        postalCode: "95492",
        latitude: 38.5523,
        longitude: -122.8166,
        websiteUrl: "https://north-quarry.demo",
        phone: "(707) 555-0189",
        email: "service@north-quarry.demo",
        verifiedBadgeLabel: "Verified shop",
        publishedAt: subDays(new Date(), 30),
        searchDocument: searchDocument([
          "North Quarry Velo Service",
          "Windsor gravel mountain suspension repair demo bikes e-bike",
        ]),
        memberships: {
          create: [{ userId: shopOwner.id, role: OrganizationMembershipRole.EDITOR }],
        },
        shopProfile: {
          create: {
            serviceCategories: ["Suspension", "Trail", "Demo Fleet"],
            brands: ["Summit", "Breaker", "Northline"],
            offersRentals: true,
            offersBikeFit: false,
            offersRepair: true,
            supportsEBikes: true,
            rentalDetails: "Gravel and hardtail demo bikes for guided route testing.",
          },
        },
      },
    }),
    prisma.organization.create({
      data: {
        slug: slug("Misty Ridge Cycling Club"),
        name: "Misty Ridge Cycling Club",
        shortDescription: "An all-ages fictional club with steady road rides and social regroup stops.",
        description:
          "Misty Ridge is a welcoming road club built around steady weekend miles, coffee stops, and light pace splits.",
        type: OrganizationType.CLUB,
        listingStatus: ListingStatus.PUBLISHED,
        verificationStatus: VerificationStatus.APPROVED,
        city: "Santa Rosa",
        websiteUrl: "https://misty-ridge.demo",
        stravaUrl: "https://www.strava.com/clubs/misty-ridge-demo",
        verifiedBadgeLabel: "Verified club",
        publishedAt: subDays(new Date(), 35),
        searchDocument: searchDocument([
          "Misty Ridge Cycling Club road club Santa Rosa social regroup no-drop",
        ]),
        memberships: {
          create: [{ userId: clubLeader.id, role: OrganizationMembershipRole.OWNER }],
        },
        clubProfile: {
          create: {
            clubKind: ClubKind.OFFICIAL,
            disciplines: ["Road", "Endurance"],
            audienceTags: ["Adults", "Visitors Welcome", "Beginner A/B"],
            membershipInfo: "Free membership with optional annual jersey order.",
            whoItsFor: "Riders who like steady group pacing, regroup points, and low-pressure route variety.",
            regularScheduleText: "Thursday tempo and Saturday coffee ride.",
            socialLinks: {
              instagram: "https://instagram.com/misty-ridge-demo",
              strava: "https://www.strava.com/clubs/misty-ridge-demo",
            },
          },
        },
      },
    }),
    prisma.organization.create({
      data: {
        slug: slug("Golden Hour Gravel"),
        name: "Golden Hour Gravel",
        shortDescription: "Fictional Sebastopol social group for sunset gravel loops and bakery stops.",
        description:
          "A no-pressure social group with mixed-surface rides, route options, and plenty of regrouping.",
        type: OrganizationType.INFORMAL_GROUP,
        listingStatus: ListingStatus.PUBLISHED,
        verificationStatus: VerificationStatus.APPROVED,
        city: "Sebastopol",
        websiteUrl: "https://golden-hour-gravel.demo",
        publishedAt: subDays(new Date(), 28),
        searchDocument: searchDocument([
          "Golden Hour Gravel Sebastopol social mixed-surface beginner gravel",
        ]),
        memberships: {
          create: [{ userId: organizerUser.id, role: OrganizationMembershipRole.OWNER }],
        },
        clubProfile: {
          create: {
            clubKind: ClubKind.SOCIAL,
            disciplines: ["Gravel", "Adventure"],
            audienceTags: ["Beginner Friendly", "Social", "No-Drop"],
            membershipInfo: "Open RSVP list, no dues.",
            whoItsFor: "Anyone looking for a social mixed-surface ride with route shortcuts.",
            regularScheduleText: "Every other Sunday morning.",
            socialLinks: {
              instagram: "https://instagram.com/golden-hour-gravel-demo",
            },
          },
        },
      },
    }),
    prisma.organization.create({
      data: {
        slug: slug("Redwood Juniors MTB"),
        name: "Redwood Juniors MTB",
        shortDescription: "A fictional youth development team serving Sonoma County middle and high school riders.",
        description:
          "Redwood Juniors focuses on progression-based trail skills, race prep, and volunteer trail stewardship.",
        type: OrganizationType.TEAM,
        listingStatus: ListingStatus.PUBLISHED,
        verificationStatus: VerificationStatus.APPROVED,
        city: "Rohnert Park",
        websiteUrl: "https://redwood-juniors.demo",
        publishedAt: subDays(new Date(), 24),
        searchDocument: searchDocument([
          "Redwood Juniors MTB youth team school mountain bike Rohnert Park",
        ]),
        memberships: {
          create: [{ userId: organizerUser.id, role: OrganizationMembershipRole.EDITOR }],
        },
        clubProfile: {
          create: {
            clubKind: ClubKind.SCHOOL_MTB,
            disciplines: ["Mountain Bike", "Skills", "Racing"],
            audienceTags: ["Youth", "School Team", "Beginner Welcome"],
            membershipInfo: "Seasonal registration with scholarship-supported loaner fleet.",
            whoItsFor: "Middle and high school riders building trail confidence in a structured environment.",
            regularScheduleText: "Tuesday skill sessions and seasonal weekend events.",
            youthFocused: true,
            socialLinks: {
              instagram: "https://instagram.com/redwood-juniors-demo",
            },
          },
        },
      },
    }),
    prisma.organization.create({
      data: {
        slug: slug("Riverlight Racing"),
        name: "Riverlight Racing",
        shortDescription: "A fictional Healdsburg racing club for disciplined climbing and race prep sessions.",
        description:
          "Riverlight Racing runs focused training rides for experienced riders targeting fondos and regional races.",
        type: OrganizationType.CLUB,
        listingStatus: ListingStatus.PUBLISHED,
        verificationStatus: VerificationStatus.APPROVED,
        city: "Healdsburg",
        websiteUrl: "https://riverlight-racing.demo",
        stravaUrl: "https://www.strava.com/clubs/riverlight-racing-demo",
        publishedAt: subDays(new Date(), 22),
        searchDocument: searchDocument([
          "Riverlight Racing Healdsburg training climbing race prep advanced",
        ]),
        memberships: {
          create: [{ userId: clubLeader.id, role: OrganizationMembershipRole.OWNER }],
        },
        clubProfile: {
          create: {
            clubKind: ClubKind.STRAVA,
            disciplines: ["Road", "Race", "Climbing"],
            audienceTags: ["Advanced", "Drop Ride"],
            membershipInfo: "Request to join, safety orientation required for race-pace rides.",
            whoItsFor: "Riders training for big climbing days and regional road events.",
            regularScheduleText: "Wednesday hill repeats and selective race calendar.",
            socialLinks: {
              strava: "https://www.strava.com/clubs/riverlight-racing-demo",
            },
          },
        },
      },
    }),
    prisma.organization.create({
      data: {
        slug: slug("Petaluma Pedal Commons"),
        name: "Petaluma Pedal Commons",
        shortDescription: "A fictional community cycling collective centered on errands, access, and everyday riding.",
        description:
          "Pedal Commons mixes advocacy, casual city rides, and practical support for newer riders.",
        type: OrganizationType.ADVOCACY,
        listingStatus: ListingStatus.PUBLISHED,
        verificationStatus: VerificationStatus.APPROVED,
        city: "Petaluma",
        websiteUrl: "https://pedal-commons.demo",
        publishedAt: subDays(new Date(), 18),
        searchDocument: searchDocument([
          "Petaluma Pedal Commons advocacy social family rides community",
        ]),
        memberships: {
          create: [{ userId: organizerUser.id, role: OrganizationMembershipRole.EDITOR }],
        },
        clubProfile: {
          create: {
            clubKind: ClubKind.SOCIAL,
            disciplines: ["Advocacy", "Community", "Urban"],
            audienceTags: ["Family Friendly", "Local", "New Riders"],
            membershipInfo: "Open community list, volunteer-led.",
            whoItsFor: "Residents who want practical local riding knowledge and low-barrier group meetups.",
            regularScheduleText: "Monthly advocacy meetups and community rollouts.",
            socialLinks: {
              website: "https://pedal-commons.demo",
            },
          },
        },
      },
    }),
    prisma.organization.create({
      data: {
        slug: slug("Foxglove Event Collective"),
        name: "Foxglove Event Collective",
        shortDescription: "A fictional local event promoter curating fondos, clinics, and trail stewardship.",
        description:
          "Foxglove produces small-footprint cycling events across Sonoma County with a focus on route quality and community impact.",
        type: OrganizationType.EVENT_PROMOTER,
        listingStatus: ListingStatus.PUBLISHED,
        verificationStatus: VerificationStatus.APPROVED,
        city: "Sonoma",
        websiteUrl: "https://foxglove-events.demo",
        publishedAt: subDays(new Date(), 20),
        searchDocument: searchDocument([
          "Foxglove Event Collective promoter fondo clinic Sonoma",
        ]),
        memberships: {
          create: [{ userId: organizerUser.id, role: OrganizationMembershipRole.OWNER }],
        },
      },
    }),
  ]);

  const organizationMap = new Map(
    organizations.map((organization) => [organization.name, organization]),
  );
  const window = materializationWindow();

  const rideInputs = [
    {
      title: "Thursday Tempo Window",
      organizationName: "Misty Ridge Cycling Club",
      city: "Santa Rosa",
      rideType: RideType.ROAD,
      paceLabel: "Steady B / brisk B+",
      dropPolicy: DropPolicy.REGROUP,
      difficulty: DifficultyLevel.MODERATE,
      skillLevel: "Comfortable riding in a rotating paceline",
      distanceMinMiles: 24,
      distanceMaxMiles: 34,
      elevationMinFeet: 1100,
      elevationMaxFeet: 1700,
      meetingLocationName: "North End Plaza",
      meetingAddress: "127 Mendocino Ave, Santa Rosa",
      latitude: 38.4431,
      longitude: -122.7135,
      startDate: "2026-01-08",
      startTimeLocal: "17:45",
      estimatedDurationMinutes: 105,
      routeUrl: "https://ridewithgps.com/routes/tempo-window-demo",
      rideWithGpsUrl: "https://ridewithgps.com/routes/tempo-window-demo",
      rainPolicy: "Heavy rain cancels. Light drizzle becomes endurance pace.",
      helmetRequired: true,
      beginnerFriendly: false,
      youthFriendly: false,
      frequency: "WEEKLY" as const,
      interval: 1,
      weekdays: ["TH"] as const,
      summary: "A brisk evening road ride with regroup points before the final tempo stretch.",
      description:
        "Expect two steady effort segments, a mid-ride regroup, and lights required after dusk.",
      lastConfirmedAt: subDays(new Date(), 20),
    },
    {
      title: "Saturday Coast Coffee Cruise",
      organizationName: "Harborline Cycle Works",
      city: "Santa Rosa",
      rideType: RideType.SOCIAL,
      paceLabel: "Conversational",
      dropPolicy: DropPolicy.NO_DROP,
      difficulty: DifficultyLevel.EASY,
      skillLevel: "Comfortable riding 12-15 mph",
      distanceMinMiles: 18,
      distanceMaxMiles: 28,
      elevationMinFeet: 500,
      elevationMaxFeet: 900,
      meetingLocationName: "Harborline Cycle Works",
      meetingAddress: "18 Lantern Yard, Santa Rosa",
      latitude: 38.4512,
      longitude: -122.7367,
      startDate: "2026-01-10",
      startTimeLocal: "08:30",
      estimatedDurationMinutes: 150,
      routeUrl: "https://ridewithgps.com/routes/coast-coffee-cruise-demo",
      rideWithGpsUrl: "https://ridewithgps.com/routes/coast-coffee-cruise-demo",
      rainPolicy: "Cancelled for storm warnings or standing water alerts.",
      helmetRequired: true,
      beginnerFriendly: true,
      youthFriendly: true,
      frequency: "WEEKLY" as const,
      interval: 1,
      weekdays: ["SA"] as const,
      summary: "An approachable weekend ride for visitors and newer locals, with a bakery stop built in.",
      description:
        "This ride is tuned for tourists, no-drop riders, and anyone building up confidence on Sonoma back roads.",
      lastConfirmedAt: subDays(new Date(), 12),
    },
    {
      title: "West County Gravel Social",
      organizationName: "Golden Hour Gravel",
      city: "Sebastopol",
      rideType: RideType.GRAVEL,
      paceLabel: "Social with optional spicier segments",
      dropPolicy: DropPolicy.NO_DROP,
      difficulty: DifficultyLevel.MODERATE,
      skillLevel: "Comfortable on washboard and loose corners",
      distanceMinMiles: 22,
      distanceMaxMiles: 38,
      elevationMinFeet: 1200,
      elevationMaxFeet: 2400,
      meetingLocationName: "Willow Yard Market",
      meetingAddress: "201 Willow St, Sebastopol",
      latitude: 38.4011,
      longitude: -122.8242,
      startDate: "2026-01-11",
      startTimeLocal: "09:00",
      estimatedDurationMinutes: 210,
      routeUrl: "https://ridewithgps.com/routes/west-county-gravel-demo",
      rideWithGpsUrl: "https://ridewithgps.com/routes/west-county-gravel-demo",
      rainPolicy: "Route swaps to fireroads when clay sections are too soft.",
      helmetRequired: true,
      beginnerFriendly: true,
      youthFriendly: false,
      frequency: "WEEKLY" as const,
      interval: 2,
      weekdays: ["SU"] as const,
      summary: "Every-other-Sunday gravel ride with optional route short-cuts and a social finish.",
      description:
        "Mixed surfaces, bakery morale, and route options for first-time gravel riders.",
      lastConfirmedAt: subDays(new Date(), 8),
    },
    {
      title: "Redwood Juniors Skills Loop",
      organizationName: "Redwood Juniors MTB",
      city: "Rohnert Park",
      rideType: RideType.MOUNTAIN,
      paceLabel: "Skills-first",
      dropPolicy: DropPolicy.NO_DROP,
      difficulty: DifficultyLevel.EASY,
      skillLevel: "Open to riders building trail confidence",
      distanceMinMiles: 8,
      distanceMaxMiles: 14,
      elevationMinFeet: 500,
      elevationMaxFeet: 900,
      meetingLocationName: "Coyote Ridge Trailhead",
      meetingAddress: "11 Pine Bend, Rohnert Park",
      latitude: 38.3432,
      longitude: -122.7048,
      startDate: "2026-01-06",
      startTimeLocal: "16:15",
      estimatedDurationMinutes: 100,
      routeUrl: "https://ridewithgps.com/routes/redwood-juniors-demo",
      rideWithGpsUrl: "https://ridewithgps.com/routes/redwood-juniors-demo",
      rainPolicy: "Skills clinic moves to school lot drills when trails are closed.",
      helmetRequired: true,
      beginnerFriendly: true,
      youthFriendly: true,
      frequency: "MONTHLY" as const,
      interval: 1,
      monthlyWeek: 1,
      monthlyWeekday: "TU" as const,
      summary: "A first-Tuesday youth trail skills ride with coaching stations and group regrouping.",
      description:
        "Designed for middle and high school riders with coach supervision and progression-based skill stops.",
      lastConfirmedAt: subDays(new Date(), 14),
    },
    {
      title: "Moonlit Trail Spin",
      organizationName: "North Quarry Velo Service",
      city: "Windsor",
      rideType: RideType.E_BIKE,
      paceLabel: "Steady with lights",
      dropPolicy: DropPolicy.REGROUP,
      difficulty: DifficultyLevel.MODERATE,
      skillLevel: "Comfortable riding after sunset with trail etiquette",
      distanceMinMiles: 15,
      distanceMaxMiles: 21,
      elevationMinFeet: 700,
      elevationMaxFeet: 1200,
      meetingLocationName: "North Quarry Velo Service",
      meetingAddress: "7 Mason Spur, Windsor",
      latitude: 38.5523,
      longitude: -122.8166,
      startDate: "2026-01-14",
      startTimeLocal: "18:30",
      estimatedDurationMinutes: 120,
      routeUrl: "https://ridewithgps.com/routes/moonlit-trail-spin-demo",
      rideWithGpsUrl: "https://ridewithgps.com/routes/moonlit-trail-spin-demo",
      rainPolicy: "Fog or wet roots may shorten the route.",
      helmetRequired: true,
      beginnerFriendly: false,
      youthFriendly: false,
      frequency: "MONTHLY" as const,
      interval: 1,
      monthlyWeek: 2,
      monthlyWeekday: "WE" as const,
      summary: "A second-Wednesday evening ride with lights, regroups, and e-bike friendly pacing.",
      description:
        "Expect mellow trail connectors, shop-led gear checks, and a smooth tempo rather than sprinting.",
      lastConfirmedAt: subDays(new Date(), 28),
    },
    {
      title: "Healdsburg Climb Collective",
      organizationName: "Riverlight Racing",
      city: "Healdsburg",
      rideType: RideType.TRAINING,
      paceLabel: "Race-pace on the climbs",
      dropPolicy: DropPolicy.DROP,
      difficulty: DifficultyLevel.ADVANCED,
      skillLevel: "High fitness and confident descending required",
      distanceMinMiles: 34,
      distanceMaxMiles: 52,
      elevationMinFeet: 2800,
      elevationMaxFeet: 4800,
      meetingLocationName: "Old Mill Staging Lot",
      meetingAddress: "99 Mill St, Healdsburg",
      latitude: 38.6132,
      longitude: -122.8692,
      startDate: "2026-01-07",
      startTimeLocal: "17:30",
      estimatedDurationMinutes: 140,
      routeUrl: "https://ridewithgps.com/routes/healdsburg-climb-demo",
      rideWithGpsUrl: "https://ridewithgps.com/routes/healdsburg-climb-demo",
      rainPolicy: "Cancelled for wet descents or low visibility.",
      helmetRequired: true,
      beginnerFriendly: false,
      youthFriendly: false,
      frequency: "WEEKLY" as const,
      interval: 1,
      weekdays: ["WE"] as const,
      summary: "A competitive climbing workout with optional regroup at the summit only.",
      description:
        "Drop ride pacing, lights recommended, and route adjusts for daylight savings windows.",
      lastConfirmedAt: subDays(new Date(), 110),
    },
  ];

  for (const rideInput of rideInputs) {
    const organization = organizationMap.get(rideInput.organizationName)!;
    const recurrenceRule = buildRecurrenceRule({
      frequency: rideInput.frequency,
      timezone,
      startDate: rideInput.startDate,
      startTime: rideInput.startTimeLocal,
      interval: rideInput.interval,
      weekdays: rideInput.weekdays as ("SU" | "MO" | "TU" | "WE" | "TH" | "FR" | "SA")[] | undefined,
      monthlyWeek: rideInput.monthlyWeek,
      monthlyWeekday: rideInput.monthlyWeekday as
        | "SU"
        | "MO"
        | "TU"
        | "WE"
        | "TH"
        | "FR"
        | "SA"
        | undefined,
      until: "2026-12-31",
    });

    const ride = await prisma.rideSeries.create({
      data: {
        organizationId: organization.id,
        slug: slug(rideInput.title),
        title: rideInput.title,
        summary: rideInput.summary,
        description: rideInput.description,
        city: rideInput.city,
        listingStatus: ListingStatus.PUBLISHED,
        rideType: rideInput.rideType,
        paceLabel: rideInput.paceLabel,
        dropPolicy: rideInput.dropPolicy,
        difficulty: rideInput.difficulty,
        skillLevel: rideInput.skillLevel,
        distanceMinMiles: rideInput.distanceMinMiles,
        distanceMaxMiles: rideInput.distanceMaxMiles,
        elevationMinFeet: rideInput.elevationMinFeet,
        elevationMaxFeet: rideInput.elevationMaxFeet,
        meetingLocationName: rideInput.meetingLocationName,
        meetingAddress: rideInput.meetingAddress,
        latitude: rideInput.latitude,
        longitude: rideInput.longitude,
        startDate: localDate(rideInput.startDate, rideInput.startTimeLocal),
        startTimeLocal: rideInput.startTimeLocal,
        estimatedDurationMinutes: rideInput.estimatedDurationMinutes,
        routeUrl: rideInput.routeUrl,
        rideWithGpsUrl: rideInput.rideWithGpsUrl,
        rainPolicy: rideInput.rainPolicy,
        helmetRequired: rideInput.helmetRequired,
        beginnerFriendly: rideInput.beginnerFriendly,
        youthFriendly: rideInput.youthFriendly,
        recurrenceRule,
        recurrenceSummary: recurrenceToText(recurrenceRule),
        recurrenceTimezone: timezone,
        recurrenceEndsAt: localDate("2026-12-31", rideInput.startTimeLocal),
        publishedAt: subDays(new Date(), 14),
        lastConfirmedAt: rideInput.lastConfirmedAt,
        staleAt: addDays(rideInput.lastConfirmedAt, 90),
        needsReconfirmation: addDays(rideInput.lastConfirmedAt, 90) < new Date(),
        searchDocument: searchDocument([
          rideInput.title,
          rideInput.summary,
          rideInput.description,
          rideInput.city,
          organization.name,
          rideInput.rideType,
        ]),
      },
    });

    const exceptions =
      rideInput.title === "Saturday Coast Coffee Cruise"
        ? [
            {
              occurrenceAt: localDate("2026-04-11", "08:30"),
              overrideType: OccurrenceOverrideType.CANCELED,
              note: "Organizer canceled due to coastal storm advisory.",
            },
          ]
        : rideInput.title === "Moonlit Trail Spin"
          ? [
              {
                occurrenceAt: localDate("2026-04-08", "18:30"),
                overrideType: OccurrenceOverrideType.RESCHEDULED,
                newStartsAt: localDate("2026-04-09", "18:45"),
                newEndsAt: localDate("2026-04-09", "20:45"),
                note: "Shifted one day for moon visibility and trail closure.",
              },
            ]
          : undefined;

    const upcoming = materializeOccurrences({
      rule: recurrenceRule,
      durationMinutes: rideInput.estimatedDurationMinutes,
      rangeStart: window.from,
      rangeEnd: window.to,
      exceptions,
    });

    if (exceptions) {
      await prisma.rideException.createMany({
        data: exceptions.map((exception) => ({
          rideSeriesId: ride.id,
          occurrenceAt: exception.occurrenceAt,
          overrideType: exception.overrideType,
          newStartsAt:
            "newStartsAt" in exception ? exception.newStartsAt : undefined,
          newEndsAt: "newEndsAt" in exception ? exception.newEndsAt : undefined,
          note: exception.note,
        })),
      });
    }

    await prisma.rideOccurrence.createMany({
      data: upcoming.map((occurrence) => ({
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
    });
  }

  const eventInputs = [
    {
      title: "Foxglove Spring Fondo Preview Clinic",
      organizationName: "Foxglove Event Collective",
      eventType: EventType.CLINIC,
      city: "Sonoma",
      startsAt: localDate("2026-04-18", "10:00"),
      endsAt: localDate("2026-04-18", "13:30"),
      locationName: "Valley Commons Pavilion",
      locationAddress: "21 Creekside Ave, Sonoma",
      latitude: 38.2937,
      longitude: -122.458,
      registrationUrl: "https://foxglove-events.demo/clinic",
      priceText: "$25 suggested donation",
      summary: "Pre-season clinic for pacing, nutrition, and route planning.",
      description:
        "A one-off skills clinic aimed at riders preparing for longer spring events.",
    },
    {
      title: "West County Trail Steward Day",
      organizationName: "Foxglove Event Collective",
      eventType: EventType.TRAIL_WORK_DAY,
      city: "Sebastopol",
      startsAt: localDate("2026-01-04", "09:00"),
      endsAt: localDate("2026-01-04", "12:00"),
      locationName: "Bloomfield Trail Gate",
      locationAddress: "88 Bloomfield Rd, Sebastopol",
      latitude: 38.3812,
      longitude: -122.8353,
      registrationUrl: "https://foxglove-events.demo/trail-day",
      priceText: "Free",
      isRecurring: true,
      recurrence: {
        frequency: "MONTHLY" as const,
        interval: 1,
        monthlyWeek: 1,
        monthlyWeekday: "SU" as const,
        startTime: "09:00",
      },
      summary: "A recurring first-Sunday stewardship morning for local trails.",
      description:
        "Volunteer work day with tools provided, beginner welcome, and post-work coffee.",
    },
    {
      title: "Redwood Juniors Skills Festival",
      organizationName: "Redwood Juniors MTB",
      eventType: EventType.YOUTH_EVENT,
      city: "Rohnert Park",
      startsAt: localDate("2026-05-09", "09:30"),
      endsAt: localDate("2026-05-09", "15:30"),
      locationName: "Coyote Ridge Skills Park",
      locationAddress: "11 Pine Bend, Rohnert Park",
      latitude: 38.3432,
      longitude: -122.7048,
      registrationUrl: "https://redwood-juniors.demo/festival",
      priceText: "$15 / scholarships available",
      summary: "Youth clinics, relay games, and bike checks in a one-day event format.",
      description:
        "A welcoming festival for younger riders with progression zones and coach stations.",
    },
    {
      title: "Foxglove Valley Fondo",
      organizationName: "Foxglove Event Collective",
      eventType: EventType.FONDO,
      city: "Healdsburg",
      startsAt: localDate("2026-06-07", "07:00"),
      endsAt: localDate("2026-06-07", "16:00"),
      locationName: "Old Mill Staging Lot",
      locationAddress: "99 Mill St, Healdsburg",
      latitude: 38.6132,
      longitude: -122.8692,
      registrationUrl: "https://foxglove-events.demo/fondo",
      priceText: "$95 early / $125 late",
      summary: "Signature summer fondo with long and medium route options.",
      description:
        "A fictional marquee event with route support, aid stations, and scenic climbs.",
    },
    {
      title: "Pedal Commons Open House",
      organizationName: "Petaluma Pedal Commons",
      eventType: EventType.ADVOCACY_MEETING,
      city: "Petaluma",
      startsAt: localDate("2026-01-13", "18:00"),
      endsAt: localDate("2026-01-13", "19:30"),
      locationName: "Cedar Room",
      locationAddress: "14 Water St, Petaluma",
      latitude: 38.2356,
      longitude: -122.6385,
      registrationUrl: "https://pedal-commons.demo/open-house",
      priceText: "Free",
      isRecurring: true,
      recurrence: {
        frequency: "MONTHLY" as const,
        interval: 1,
        monthlyWeek: 2,
        monthlyWeekday: "TU" as const,
        startTime: "18:00",
      },
      summary: "Recurring advocacy and orientation night for local everyday riders.",
      description:
        "Meet city connectors, learn local route basics, and help shape future programming.",
    },
    {
      title: "Autumn Gear Swap on the Plaza",
      organizationName: "Foxglove Event Collective",
      eventType: EventType.SWAP_MEET,
      city: "Santa Rosa",
      startsAt: localDate("2026-09-19", "10:00"),
      endsAt: localDate("2026-09-19", "14:00"),
      locationName: "Rail Yard Commons",
      locationAddress: "3 Copper Loop, Santa Rosa",
      latitude: 38.4399,
      longitude: -122.7182,
      registrationUrl: "https://foxglove-events.demo/gear-swap",
      priceText: "Free entry",
      summary: "A late-season community swap with route maps, gear tables, and coffee.",
      description:
        "Bring used parts, jackets, and ride nutrition to swap or donate.",
    },
  ];

  for (const eventInput of eventInputs) {
    const organization = organizationMap.get(eventInput.organizationName)!;
    const startDateString = eventInput.startsAt.toISOString().slice(0, 10);
    const recurrenceRule = eventInput.isRecurring
      ? buildRecurrenceRule({
          frequency: eventInput.recurrence!.frequency,
          timezone,
          startDate: startDateString,
          startTime: eventInput.recurrence!.startTime,
          interval: eventInput.recurrence!.interval,
          monthlyWeek: eventInput.recurrence!.monthlyWeek,
          monthlyWeekday: eventInput.recurrence!.monthlyWeekday,
          until: "2026-12-31",
        })
      : undefined;

    const event = await prisma.eventSeries.create({
      data: {
        organizationId: organization.id,
        slug: slug(eventInput.title),
        title: eventInput.title,
        summary: eventInput.summary,
        description: eventInput.description,
        city: eventInput.city,
        listingStatus: ListingStatus.PUBLISHED,
        eventType: eventInput.eventType,
        isRecurring: Boolean(eventInput.isRecurring),
        startsAt: eventInput.startsAt,
        endsAt: eventInput.endsAt,
        locationName: eventInput.locationName,
        locationAddress: eventInput.locationAddress,
        latitude: eventInput.latitude,
        longitude: eventInput.longitude,
        registrationUrl: eventInput.registrationUrl,
        priceText: eventInput.priceText,
        recurrenceRule,
        recurrenceSummary: recurrenceRule ? recurrenceToText(recurrenceRule) : null,
        recurrenceTimezone: timezone,
        recurrenceEndsAt: recurrenceRule
          ? localDate("2026-12-31", eventInput.recurrence!.startTime)
          : null,
        publishedAt: subDays(new Date(), 10),
        autoArchiveAt: defaultArchiveDate(eventInput.endsAt),
        searchDocument: searchDocument([
          eventInput.title,
          eventInput.summary,
          eventInput.description,
          eventInput.city,
          organization.name,
        ]),
      },
    });

    const occurrences = recurrenceRule
      ? materializeOccurrences({
          rule: recurrenceRule,
          durationMinutes: Math.round(
            (eventInput.endsAt.getTime() - eventInput.startsAt.getTime()) / 60000,
          ),
          rangeStart: window.from,
          rangeEnd: window.to,
        })
      : [
          {
            startsAt: eventInput.startsAt,
            endsAt: eventInput.endsAt,
            status: "SCHEDULED" as const,
          },
        ];

    await prisma.eventOccurrence.createMany({
      data: occurrences.map((occurrence) => ({
        eventSeriesId: event.id,
        startsAt: occurrence.startsAt,
        endsAt: occurrence.endsAt,
        status:
          occurrence.status === "RESCHEDULED"
            ? OccurrenceStatus.RESCHEDULED
            : OccurrenceStatus.SCHEDULED,
      })),
    });
  }

  const routeGuides = await Promise.all([
    prisma.routeGuide.create({
      data: {
        slug: slug("Dry Creek Orchard Loop"),
        title: "Dry Creek Orchard Loop",
        summary: "A classic-feeling valley loop with gentle rollers, farm views, and cafe options.",
        description:
          "A fictional route guide for visitors who want smooth pavement, forgiving rollers, and easy route-finding.",
        city: "Healdsburg",
        listingStatus: ListingStatus.PUBLISHED,
        distanceMiles: 28,
        elevationFeet: 1400,
        surface: SurfaceType.PAVED,
        difficulty: DifficultyLevel.MODERATE,
        bestSeason: "Spring through early fall",
        startLocationName: "Healdsburg Plaza",
        startAddress: "1 Plaza St, Healdsburg",
        latitude: 38.6107,
        longitude: -122.869,
        cautions: "Weekend traffic rises late morning. Start early for a calmer experience.",
        routeUrl: "https://ridewithgps.com/routes/dry-creek-orchard-demo",
        rideWithGpsUrl: "https://ridewithgps.com/routes/dry-creek-orchard-demo",
        touristFriendly: true,
        beginnerFriendly: true,
        publishedAt: subDays(new Date(), 12),
        searchDocument: searchDocument([
          "Dry Creek Orchard Loop Healdsburg paved scenic visitor beginner",
        ]),
      },
    }),
    prisma.routeGuide.create({
      data: {
        slug: slug("Laguna Meadow Meander"),
        title: "Laguna Meadow Meander",
        summary: "A mellow Sebastopol route with quiet roads, coffee options, and easy mileage control.",
        description:
          "A short-to-medium route ideal for visitors or riders easing into Sonoma County road miles.",
        city: "Sebastopol",
        listingStatus: ListingStatus.PUBLISHED,
        distanceMiles: 19,
        elevationFeet: 780,
        surface: SurfaceType.PAVED,
        difficulty: DifficultyLevel.EASY,
        bestSeason: "Year-round on clear mornings",
        startLocationName: "Willow Yard Market",
        startAddress: "201 Willow St, Sebastopol",
        latitude: 38.4011,
        longitude: -122.8242,
        cautions: "Watch for damp leaves after foggy mornings.",
        routeUrl: "https://ridewithgps.com/routes/laguna-meadow-demo",
        rideWithGpsUrl: "https://ridewithgps.com/routes/laguna-meadow-demo",
        touristFriendly: true,
        beginnerFriendly: true,
        publishedAt: subDays(new Date(), 11),
        searchDocument: searchDocument([
          "Laguna Meadow Meander Sebastopol visitor beginner quiet roads",
        ]),
      },
    }),
    prisma.routeGuide.create({
      data: {
        slug: slug("Coastal Bluff Out-and-Back"),
        title: "Coastal Bluff Out-and-Back",
        summary: "A dramatic coastal route with wind exposure, ocean views, and a rewarding turnaround.",
        description:
          "A more ambitious visitor route for riders chasing ocean views and a memorable day in the saddle.",
        city: "Bodega Bay",
        listingStatus: ListingStatus.PUBLISHED,
        distanceMiles: 36,
        elevationFeet: 2200,
        surface: SurfaceType.PAVED,
        difficulty: DifficultyLevel.CHALLENGING,
        bestSeason: "Clear spring or fall days",
        startLocationName: "Harbor Overlook Lot",
        startAddress: "5 Bluff Rd, Bodega Bay",
        latitude: 38.3337,
        longitude: -123.0481,
        cautions: "Wind and fog can change fast. Bring layers and lights.",
        routeUrl: "https://ridewithgps.com/routes/coastal-bluff-demo",
        rideWithGpsUrl: "https://ridewithgps.com/routes/coastal-bluff-demo",
        touristFriendly: true,
        beginnerFriendly: false,
        publishedAt: subDays(new Date(), 9),
        searchDocument: searchDocument([
          "Coastal Bluff Out-and-Back Bodega Bay ocean route challenging scenic",
        ]),
      },
    }),
    prisma.routeGuide.create({
      data: {
        slug: slug("Valley Espresso Ramble"),
        title: "Valley Espresso Ramble",
        summary: "A relaxed city-to-vineyard spin with multiple early bail-out options.",
        description:
          "An approachable Petaluma-area route designed for social groups and casual visitors.",
        city: "Petaluma",
        listingStatus: ListingStatus.PUBLISHED,
        distanceMiles: 24,
        elevationFeet: 980,
        surface: SurfaceType.MIXED,
        difficulty: DifficultyLevel.EASY,
        bestSeason: "All seasons with dry roads",
        startLocationName: "Riverfront Steps",
        startAddress: "20 Water St, Petaluma",
        latitude: 38.235,
        longitude: -122.6391,
        cautions: "Short gravel connector after mile 10 can be skipped on narrow tires.",
        routeUrl: "https://ridewithgps.com/routes/valley-espresso-demo",
        rideWithGpsUrl: "https://ridewithgps.com/routes/valley-espresso-demo",
        touristFriendly: true,
        beginnerFriendly: true,
        publishedAt: subDays(new Date(), 8),
        searchDocument: searchDocument([
          "Valley Espresso Ramble Petaluma mixed surface social route beginner",
        ]),
      },
    }),
    prisma.routeGuide.create({
      data: {
        slug: slug("Redwood Ridge Challenge"),
        title: "Redwood Ridge Challenge",
        summary: "A longer climbing route for confident riders wanting a true Sonoma County test piece.",
        description:
          "A fictional big-day route with sustained elevation, fast descents, and limited services mid-route.",
        city: "Santa Rosa",
        listingStatus: ListingStatus.PUBLISHED,
        distanceMiles: 58,
        elevationFeet: 5200,
        surface: SurfaceType.PAVED,
        difficulty: DifficultyLevel.ADVANCED,
        bestSeason: "Late spring and early fall",
        startLocationName: "Rail Yard Commons",
        startAddress: "3 Copper Loop, Santa Rosa",
        latitude: 38.4399,
        longitude: -122.7182,
        cautions: "Carry extra bottles and watch shaded descents for damp patches.",
        routeUrl: "https://ridewithgps.com/routes/redwood-ridge-demo",
        rideWithGpsUrl: "https://ridewithgps.com/routes/redwood-ridge-demo",
        touristFriendly: false,
        beginnerFriendly: false,
        publishedAt: subDays(new Date(), 7),
        searchDocument: searchDocument([
          "Redwood Ridge Challenge Santa Rosa advanced climbing route",
        ]),
      },
    }),
  ]);

  await prisma.sponsorPlacement.createMany({
    data: [
      {
        slot: SponsorSlot.HOME_HERO,
        organizationId: organizationMap.get("Harborline Cycle Works")!.id,
        title: "Featured Shop: Harborline Cycle Works",
        blurb: "Rental-ready road and gravel bikes for weekend visitors.",
        href: "/shops/harborline-cycle-works",
        priority: 100,
        isActive: true,
      },
      {
        slot: SponsorSlot.FEATURED_CARD,
        organizationId: organizationMap.get("Misty Ridge Cycling Club")!.id,
        title: "Featured Club: Misty Ridge Cycling Club",
        blurb: "Welcoming regroup rides and coffee-mile weekends.",
        href: "/clubs/misty-ridge-cycling-club",
        priority: 80,
        isActive: true,
      },
      {
        slot: SponsorSlot.NEWSLETTER,
        routeGuideId: routeGuides[1].id,
        title: "Route Spotlight: Laguna Meadow Meander",
        blurb: "A quiet, beginner-friendly loop for an easy Sonoma County morning.",
        href: "/routes/laguna-meadow-meander",
        priority: 70,
        isActive: true,
      },
      {
        slot: SponsorSlot.LISTING_BOOST,
        organizationId: organizationMap.get("North Quarry Velo Service")!.id,
        title: "North Quarry Velo Service",
        blurb: "Trail and gravel support with demo bikes and suspension tune-ups.",
        href: "/shops/north-quarry-velo-service",
        priority: 60,
        isActive: true,
      },
    ],
  });

  await prisma.newsletterSubscriber.createMany({
    data: [
      {
        email: "mia.visitor@example.com",
        status: NewsletterStatus.ACTIVE,
        source: "homepage",
      },
      {
        email: "sam.local@example.com",
        status: NewsletterStatus.ACTIVE,
        source: "footer",
      },
      {
        email: "rideleader@example.com",
        status: NewsletterStatus.PENDING,
        source: "newsletter-page",
      },
    ],
  });

  const saturdayCruise = await prisma.rideSeries.findFirstOrThrow({
    where: { title: "Saturday Coast Coffee Cruise" },
  });

  await prisma.favorite.createMany({
    data: [
      {
        userId: memberUser.id,
        targetType: FavoriteTargetType.ROUTE,
        targetId: routeGuides[0].id,
      },
      {
        userId: memberUser.id,
        targetType: FavoriteTargetType.RIDE,
        targetId: saturdayCruise.id,
      },
    ],
  });

  await prisma.follow.createMany({
    data: [
      {
        userId: memberUser.id,
        organizationId: organizationMap.get("Harborline Cycle Works")!.id,
      },
      {
        userId: memberUser.id,
        organizationId: organizationMap.get("Misty Ridge Cycling Club")!.id,
      },
    ],
  });

  await prisma.verificationRequest.createMany({
    data: [
      {
        userId: organizerUser.id,
        organizationName: "Foxglove Event Collective",
        organizationType: OrganizationType.EVENT_PROMOTER,
        websiteOrSocialUrl: "https://foxglove-events.demo",
        note: "Approved seed request for organizer dashboard flows.",
        status: VerificationStatus.APPROVED,
        adminNote: "Approved after organizer identity review.",
        reviewedById: adminUser.id,
        reviewedAt: subDays(new Date(), 21),
      },
      {
        userId: memberUser.id,
        organizationName: "Moonrise Velodames",
        organizationType: OrganizationType.INFORMAL_GROUP,
        websiteOrSocialUrl: "https://instagram.com/moonrise-velodames-demo",
        note: "Would like to publish a women and nonbinary social ride series.",
        status: VerificationStatus.PENDING,
      },
      {
        userId: memberUser.id,
        organizationName: "Cedar Canyon Cyclery",
        organizationType: OrganizationType.SHOP,
        websiteOrSocialUrl: "https://cedar-canyon-cyclery.demo",
        note: "Original request missing staff verification details.",
        status: VerificationStatus.REJECTED,
        adminNote: "Please resubmit with a public staff contact email or social profile.",
        reviewedById: adminUser.id,
        reviewedAt: subDays(new Date(), 5),
      },
    ],
  });

  await prisma.report.createMany({
    data: [
      {
        reporterUserId: memberUser.id,
        targetType: FavoriteTargetType.RIDE,
        targetId: saturdayCruise.id,
        reason: ReportReason.CANCELED_RIDE,
        description: "The ride leader posted a weather cancellation on social media.",
        status: ReportStatus.OPEN,
      },
      {
        reporterEmail: "visitor@example.com",
        targetType: FavoriteTargetType.CLUB,
        targetId: organizationMap.get("Petaluma Pedal Commons")!.id,
        reason: ReportReason.INCORRECT_INFO,
        description: "The listed meeting room moved last month.",
        status: ReportStatus.UNDER_REVIEW,
      },
    ],
  });

  await prisma.siteSetting.createMany({
    data: [
      {
        key: "newsletter",
        value: {
          sendDay: "thursday",
          digestHour: 8,
          digestTimezone: timezone,
          dryRun: true,
        },
      },
      {
        key: "site",
        value: {
          supportEmail: "hello@cyclesonoma.demo",
          heroKicker: "Trusted local cycling intel for Sonoma County",
          visitorSeasonNote: "Spring afternoons can turn windy on exposed coastal routes.",
        },
      },
    ],
  });

  await prisma.auditLog.createMany({
    data: [
      {
        actorUserId: adminUser.id,
        action: "verification.approved",
        entityType: "VerificationRequest",
        entityId: "seed-foxglove",
        metadata: {
          email: organizerUser.email,
          organizationName: "Foxglove Event Collective",
        },
      },
      {
        actorUserId: adminUser.id,
        action: "sponsor.activated",
        entityType: "SponsorPlacement",
        entityId: "seed-home-hero",
        metadata: {
          slot: SponsorSlot.HOME_HERO,
        },
      },
    ],
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
