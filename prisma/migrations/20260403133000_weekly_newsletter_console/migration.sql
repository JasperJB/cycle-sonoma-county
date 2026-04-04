-- CreateEnum
CREATE TYPE "NewsletterIssueStatus" AS ENUM ('OPEN', 'LOCKED', 'SENT');

-- AlterTable
ALTER TABLE "NewsletterSubscriber" ADD COLUMN "userId" TEXT;

-- Backfill
UPDATE "NewsletterSubscriber"
SET "userId" = "User"."id"
FROM "User"
WHERE LOWER("NewsletterSubscriber"."email") = LOWER("User"."email")
  AND "NewsletterSubscriber"."userId" IS NULL;

-- CreateTable
CREATE TABLE "NewsletterIssue" (
    "id" TEXT NOT NULL,
    "weekOf" TIMESTAMP(3) NOT NULL,
    "status" "NewsletterIssueStatus" NOT NULL DEFAULT 'OPEN',
    "globalSection" TEXT,
    "previewSubject" TEXT,
    "linkedPreviewHtml" TEXT,
    "unlinkedPreviewHtml" TEXT,
    "reminderSentAt" TIMESTAMP(3),
    "reminderSentCount" INTEGER NOT NULL DEFAULT 0,
    "reminderDryRun" BOOLEAN,
    "lockedAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "sendDryRun" BOOLEAN,
    "sentCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NewsletterIssue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NewsletterOrganizationDraft" (
    "id" TEXT NOT NULL,
    "issueId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "adminOverridden" BOOLEAN NOT NULL DEFAULT false,
    "lastEditedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NewsletterOrganizationDraft_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "NewsletterSubscriber_userId_key" ON "NewsletterSubscriber"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "NewsletterIssue_weekOf_key" ON "NewsletterIssue"("weekOf");

-- CreateIndex
CREATE INDEX "NewsletterIssue_status_weekOf_idx" ON "NewsletterIssue"("status", "weekOf");

-- CreateIndex
CREATE UNIQUE INDEX "NewsletterOrganizationDraft_issueId_organizationId_key" ON "NewsletterOrganizationDraft"("issueId", "organizationId");

-- CreateIndex
CREATE INDEX "NewsletterOrganizationDraft_issueId_updatedAt_idx" ON "NewsletterOrganizationDraft"("issueId", "updatedAt");

-- CreateIndex
CREATE INDEX "NewsletterOrganizationDraft_organizationId_updatedAt_idx" ON "NewsletterOrganizationDraft"("organizationId", "updatedAt");

-- AddForeignKey
ALTER TABLE "NewsletterSubscriber" ADD CONSTRAINT "NewsletterSubscriber_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NewsletterOrganizationDraft" ADD CONSTRAINT "NewsletterOrganizationDraft_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "NewsletterIssue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NewsletterOrganizationDraft" ADD CONSTRAINT "NewsletterOrganizationDraft_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NewsletterOrganizationDraft" ADD CONSTRAINT "NewsletterOrganizationDraft_lastEditedById_fkey" FOREIGN KEY ("lastEditedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
