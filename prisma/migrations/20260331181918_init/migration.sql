-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('MEMBER', 'ORGANIZER', 'ADMIN');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ListingStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "OrganizationType" AS ENUM ('SHOP', 'CLUB', 'TEAM', 'ADVOCACY', 'EVENT_PROMOTER', 'COACH', 'INFORMAL_GROUP');

-- CreateEnum
CREATE TYPE "OrganizationMembershipRole" AS ENUM ('OWNER', 'EDITOR', 'CONTRIBUTOR');

-- CreateEnum
CREATE TYPE "ClubKind" AS ENUM ('OFFICIAL', 'STRAVA', 'YOUTH', 'SCHOOL_MTB', 'SOCIAL');

-- CreateEnum
CREATE TYPE "RideType" AS ENUM ('ROAD', 'GRAVEL', 'MOUNTAIN', 'E_BIKE', 'COMMUTER', 'SOCIAL', 'TRAINING', 'WOMENS', 'JUNIOR', 'OTHER');

-- CreateEnum
CREATE TYPE "DropPolicy" AS ENUM ('NO_DROP', 'REGROUP', 'DROP');

-- CreateEnum
CREATE TYPE "DifficultyLevel" AS ENUM ('EASY', 'MODERATE', 'CHALLENGING', 'ADVANCED');

-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('RACE', 'FONDO', 'CLINIC', 'TRAIL_WORK_DAY', 'SWAP_MEET', 'ADVOCACY_MEETING', 'FESTIVAL', 'YOUTH_EVENT', 'OTHER');

-- CreateEnum
CREATE TYPE "SurfaceType" AS ENUM ('PAVED', 'MIXED', 'GRAVEL', 'TRAIL');

-- CreateEnum
CREATE TYPE "OccurrenceStatus" AS ENUM ('SCHEDULED', 'CANCELED', 'RESCHEDULED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "OccurrenceOverrideType" AS ENUM ('CANCELED', 'RESCHEDULED', 'UPDATED');

-- CreateEnum
CREATE TYPE "FavoriteTargetType" AS ENUM ('SHOP', 'CLUB', 'RIDE', 'EVENT', 'ROUTE');

-- CreateEnum
CREATE TYPE "SponsorSlot" AS ENUM ('HOME_HERO', 'FEATURED_CARD', 'NEWSLETTER', 'LISTING_BOOST');

-- CreateEnum
CREATE TYPE "NewsletterStatus" AS ENUM ('PENDING', 'ACTIVE', 'UNSUBSCRIBED');

-- CreateEnum
CREATE TYPE "ReportReason" AS ENUM ('INCORRECT_INFO', 'CANCELED_RIDE', 'INACTIVE_CLUB', 'DUPLICATE_LISTING', 'OTHER');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('OPEN', 'UNDER_REVIEW', 'RESOLVED', 'DISMISSED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "displayName" TEXT,
    "city" TEXT,
    "avatarUrl" TEXT,
    "bio" TEXT,
    "cognitoSub" TEXT,
    "globalRole" "UserRole" NOT NULL DEFAULT 'MEMBER',
    "isOrganizerApproved" BOOLEAN NOT NULL DEFAULT false,
    "onboardingCompletedAt" TIMESTAMP(3),
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT,
    "organizationName" TEXT NOT NULL,
    "organizationType" "OrganizationType" NOT NULL,
    "websiteOrSocialUrl" TEXT NOT NULL,
    "note" TEXT,
    "status" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "adminNote" TEXT,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VerificationRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "shortDescription" TEXT NOT NULL,
    "description" TEXT,
    "type" "OrganizationType" NOT NULL,
    "listingStatus" "ListingStatus" NOT NULL DEFAULT 'DRAFT',
    "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'CA',
    "addressLine1" TEXT,
    "addressLine2" TEXT,
    "postalCode" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "websiteUrl" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "instagramUrl" TEXT,
    "stravaUrl" TEXT,
    "logoUrl" TEXT,
    "bannerUrl" TEXT,
    "verifiedBadgeLabel" TEXT,
    "searchDocument" TEXT NOT NULL DEFAULT '',
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationMembership" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "role" "OrganizationMembershipRole" NOT NULL DEFAULT 'OWNER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShopProfile" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "serviceCategories" TEXT[],
    "brands" TEXT[],
    "hours" JSONB,
    "offersRentals" BOOLEAN NOT NULL DEFAULT false,
    "offersBikeFit" BOOLEAN NOT NULL DEFAULT false,
    "offersRepair" BOOLEAN NOT NULL DEFAULT true,
    "supportsEBikes" BOOLEAN NOT NULL DEFAULT false,
    "rentalDetails" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShopProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClubProfile" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "clubKind" "ClubKind" NOT NULL,
    "disciplines" TEXT[],
    "audienceTags" TEXT[],
    "membershipInfo" TEXT,
    "whoItsFor" TEXT,
    "regularScheduleText" TEXT,
    "socialLinks" JSONB,
    "youthFocused" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClubProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RideSeries" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "description" TEXT,
    "city" TEXT NOT NULL,
    "listingStatus" "ListingStatus" NOT NULL DEFAULT 'DRAFT',
    "rideType" "RideType" NOT NULL,
    "paceLabel" TEXT NOT NULL,
    "dropPolicy" "DropPolicy" NOT NULL,
    "difficulty" "DifficultyLevel" NOT NULL,
    "skillLevel" TEXT,
    "distanceMinMiles" INTEGER,
    "distanceMaxMiles" INTEGER,
    "elevationMinFeet" INTEGER,
    "elevationMaxFeet" INTEGER,
    "meetingLocationName" TEXT NOT NULL,
    "meetingAddress" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "startDate" TIMESTAMP(3) NOT NULL,
    "startTimeLocal" TEXT NOT NULL,
    "estimatedDurationMinutes" INTEGER NOT NULL,
    "routeUrl" TEXT,
    "gpxUrl" TEXT,
    "rideWithGpsUrl" TEXT,
    "stravaUrl" TEXT,
    "rainPolicy" TEXT,
    "helmetRequired" BOOLEAN NOT NULL DEFAULT true,
    "beginnerFriendly" BOOLEAN NOT NULL DEFAULT false,
    "youthFriendly" BOOLEAN NOT NULL DEFAULT false,
    "recurrenceRule" TEXT NOT NULL,
    "recurrenceSummary" TEXT NOT NULL,
    "recurrenceTimezone" TEXT NOT NULL DEFAULT 'America/Los_Angeles',
    "recurrenceEndsAt" TIMESTAMP(3),
    "lastConfirmedAt" TIMESTAMP(3),
    "staleAt" TIMESTAMP(3),
    "needsReconfirmation" BOOLEAN NOT NULL DEFAULT false,
    "searchDocument" TEXT NOT NULL DEFAULT '',
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RideSeries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RideOccurrence" (
    "id" TEXT NOT NULL,
    "rideSeriesId" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "status" "OccurrenceStatus" NOT NULL DEFAULT 'SCHEDULED',
    "titleOverride" TEXT,
    "summaryOverride" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RideOccurrence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RideException" (
    "id" TEXT NOT NULL,
    "rideSeriesId" TEXT NOT NULL,
    "occurrenceAt" TIMESTAMP(3) NOT NULL,
    "overrideType" "OccurrenceOverrideType" NOT NULL,
    "newStartsAt" TIMESTAMP(3),
    "newEndsAt" TIMESTAMP(3),
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RideException_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventSeries" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "description" TEXT,
    "city" TEXT NOT NULL,
    "listingStatus" "ListingStatus" NOT NULL DEFAULT 'DRAFT',
    "eventType" "EventType" NOT NULL,
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "locationName" TEXT NOT NULL,
    "locationAddress" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "registrationUrl" TEXT,
    "priceText" TEXT,
    "coverImageUrl" TEXT,
    "recurrenceRule" TEXT,
    "recurrenceSummary" TEXT,
    "recurrenceTimezone" TEXT NOT NULL DEFAULT 'America/Los_Angeles',
    "recurrenceEndsAt" TIMESTAMP(3),
    "searchDocument" TEXT NOT NULL DEFAULT '',
    "publishedAt" TIMESTAMP(3),
    "autoArchiveAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventSeries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventOccurrence" (
    "id" TEXT NOT NULL,
    "eventSeriesId" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "status" "OccurrenceStatus" NOT NULL DEFAULT 'SCHEDULED',
    "titleOverride" TEXT,
    "summaryOverride" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventOccurrence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RouteGuide" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "listingStatus" "ListingStatus" NOT NULL DEFAULT 'DRAFT',
    "distanceMiles" INTEGER NOT NULL,
    "elevationFeet" INTEGER NOT NULL,
    "surface" "SurfaceType" NOT NULL,
    "difficulty" "DifficultyLevel" NOT NULL,
    "bestSeason" TEXT NOT NULL,
    "startLocationName" TEXT NOT NULL,
    "startAddress" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "cautions" TEXT,
    "routeUrl" TEXT,
    "gpxUrl" TEXT,
    "rideWithGpsUrl" TEXT,
    "stravaUrl" TEXT,
    "touristFriendly" BOOLEAN NOT NULL DEFAULT false,
    "beginnerFriendly" BOOLEAN NOT NULL DEFAULT false,
    "coverImageUrl" TEXT,
    "searchDocument" TEXT NOT NULL DEFAULT '',
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RouteGuide_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Favorite" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "targetType" "FavoriteTargetType" NOT NULL,
    "targetId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Favorite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Follow" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Follow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SponsorPlacement" (
    "id" TEXT NOT NULL,
    "slot" "SponsorSlot" NOT NULL,
    "organizationId" TEXT,
    "routeGuideId" TEXT,
    "title" TEXT NOT NULL,
    "blurb" TEXT,
    "imageUrl" TEXT,
    "href" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "activeFrom" TIMESTAMP(3),
    "activeTo" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "impressionCount" INTEGER NOT NULL DEFAULT 0,
    "clickCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SponsorPlacement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NewsletterSubscriber" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "status" "NewsletterStatus" NOT NULL DEFAULT 'PENDING',
    "confirmToken" TEXT,
    "source" TEXT,
    "subscribedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unsubscribedAt" TIMESTAMP(3),
    "lastDigestSentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NewsletterSubscriber_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NewsletterDigest" (
    "id" TEXT NOT NULL,
    "digestDate" TIMESTAMP(3) NOT NULL,
    "dryRun" BOOLEAN NOT NULL DEFAULT true,
    "status" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "previewHtml" TEXT,
    "sentCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NewsletterDigest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL,
    "reporterUserId" TEXT,
    "reporterEmail" TEXT,
    "targetType" "FavoriteTargetType" NOT NULL,
    "targetId" TEXT NOT NULL,
    "reason" "ReportReason" NOT NULL,
    "description" TEXT NOT NULL,
    "status" "ReportStatus" NOT NULL DEFAULT 'OPEN',
    "resolutionNote" TEXT,
    "resolvedById" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorUserId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiteSetting" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteSetting_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_cognitoSub_key" ON "User"("cognitoSub");

-- CreateIndex
CREATE INDEX "VerificationRequest_status_createdAt_idx" ON "VerificationRequest"("status", "createdAt");

-- CreateIndex
CREATE INDEX "VerificationRequest_userId_status_idx" ON "VerificationRequest"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");

-- CreateIndex
CREATE INDEX "Organization_type_listingStatus_idx" ON "Organization"("type", "listingStatus");

-- CreateIndex
CREATE INDEX "Organization_city_listingStatus_idx" ON "Organization"("city", "listingStatus");

-- CreateIndex
CREATE INDEX "Organization_verificationStatus_listingStatus_idx" ON "Organization"("verificationStatus", "listingStatus");

-- CreateIndex
CREATE INDEX "OrganizationMembership_organizationId_role_idx" ON "OrganizationMembership"("organizationId", "role");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationMembership_userId_organizationId_key" ON "OrganizationMembership"("userId", "organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "ShopProfile_organizationId_key" ON "ShopProfile"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "ClubProfile_organizationId_key" ON "ClubProfile"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "RideSeries_slug_key" ON "RideSeries"("slug");

-- CreateIndex
CREATE INDEX "RideSeries_organizationId_listingStatus_idx" ON "RideSeries"("organizationId", "listingStatus");

-- CreateIndex
CREATE INDEX "RideSeries_city_listingStatus_idx" ON "RideSeries"("city", "listingStatus");

-- CreateIndex
CREATE INDEX "RideSeries_lastConfirmedAt_needsReconfirmation_idx" ON "RideSeries"("lastConfirmedAt", "needsReconfirmation");

-- CreateIndex
CREATE INDEX "RideOccurrence_startsAt_status_idx" ON "RideOccurrence"("startsAt", "status");

-- CreateIndex
CREATE UNIQUE INDEX "RideOccurrence_rideSeriesId_startsAt_key" ON "RideOccurrence"("rideSeriesId", "startsAt");

-- CreateIndex
CREATE INDEX "RideException_overrideType_occurrenceAt_idx" ON "RideException"("overrideType", "occurrenceAt");

-- CreateIndex
CREATE UNIQUE INDEX "RideException_rideSeriesId_occurrenceAt_key" ON "RideException"("rideSeriesId", "occurrenceAt");

-- CreateIndex
CREATE UNIQUE INDEX "EventSeries_slug_key" ON "EventSeries"("slug");

-- CreateIndex
CREATE INDEX "EventSeries_organizationId_listingStatus_idx" ON "EventSeries"("organizationId", "listingStatus");

-- CreateIndex
CREATE INDEX "EventSeries_startsAt_listingStatus_idx" ON "EventSeries"("startsAt", "listingStatus");

-- CreateIndex
CREATE INDEX "EventSeries_city_listingStatus_idx" ON "EventSeries"("city", "listingStatus");

-- CreateIndex
CREATE INDEX "EventOccurrence_startsAt_status_idx" ON "EventOccurrence"("startsAt", "status");

-- CreateIndex
CREATE UNIQUE INDEX "EventOccurrence_eventSeriesId_startsAt_key" ON "EventOccurrence"("eventSeriesId", "startsAt");

-- CreateIndex
CREATE UNIQUE INDEX "RouteGuide_slug_key" ON "RouteGuide"("slug");

-- CreateIndex
CREATE INDEX "RouteGuide_city_listingStatus_idx" ON "RouteGuide"("city", "listingStatus");

-- CreateIndex
CREATE INDEX "RouteGuide_difficulty_listingStatus_idx" ON "RouteGuide"("difficulty", "listingStatus");

-- CreateIndex
CREATE INDEX "Favorite_targetType_targetId_idx" ON "Favorite"("targetType", "targetId");

-- CreateIndex
CREATE UNIQUE INDEX "Favorite_userId_targetType_targetId_key" ON "Favorite"("userId", "targetType", "targetId");

-- CreateIndex
CREATE INDEX "Follow_organizationId_idx" ON "Follow"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "Follow_userId_organizationId_key" ON "Follow"("userId", "organizationId");

-- CreateIndex
CREATE INDEX "SponsorPlacement_slot_isActive_priority_idx" ON "SponsorPlacement"("slot", "isActive", "priority");

-- CreateIndex
CREATE UNIQUE INDEX "NewsletterSubscriber_email_key" ON "NewsletterSubscriber"("email");

-- CreateIndex
CREATE UNIQUE INDEX "NewsletterDigest_digestDate_key" ON "NewsletterDigest"("digestDate");

-- CreateIndex
CREATE INDEX "Report_status_createdAt_idx" ON "Report"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Report_targetType_targetId_idx" ON "Report"("targetType", "targetId");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_createdAt_idx" ON "AuditLog"("entityType", "entityId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_action_createdAt_idx" ON "AuditLog"("action", "createdAt");

-- AddForeignKey
ALTER TABLE "VerificationRequest" ADD CONSTRAINT "VerificationRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerificationRequest" ADD CONSTRAINT "VerificationRequest_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerificationRequest" ADD CONSTRAINT "VerificationRequest_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationMembership" ADD CONSTRAINT "OrganizationMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationMembership" ADD CONSTRAINT "OrganizationMembership_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopProfile" ADD CONSTRAINT "ShopProfile_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClubProfile" ADD CONSTRAINT "ClubProfile_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RideSeries" ADD CONSTRAINT "RideSeries_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RideOccurrence" ADD CONSTRAINT "RideOccurrence_rideSeriesId_fkey" FOREIGN KEY ("rideSeriesId") REFERENCES "RideSeries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RideException" ADD CONSTRAINT "RideException_rideSeriesId_fkey" FOREIGN KEY ("rideSeriesId") REFERENCES "RideSeries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventSeries" ADD CONSTRAINT "EventSeries_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventOccurrence" ADD CONSTRAINT "EventOccurrence_eventSeriesId_fkey" FOREIGN KEY ("eventSeriesId") REFERENCES "EventSeries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RouteGuide" ADD CONSTRAINT "RouteGuide_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Follow" ADD CONSTRAINT "Follow_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Follow" ADD CONSTRAINT "Follow_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SponsorPlacement" ADD CONSTRAINT "SponsorPlacement_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SponsorPlacement" ADD CONSTRAINT "SponsorPlacement_routeGuideId_fkey" FOREIGN KEY ("routeGuideId") REFERENCES "RouteGuide"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_reporterUserId_fkey" FOREIGN KEY ("reporterUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
