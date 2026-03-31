import {
  DropPolicy,
  EventType,
  FavoriteTargetType,
  OrganizationType,
  ReportReason,
  RideType,
  SurfaceType,
} from "@/app/generated/prisma/enums";
import { z } from "zod";

const optionalUrl = z
  .string()
  .trim()
  .optional()
  .transform((value) => value || undefined)
  .refine((value) => !value || /^https?:\/\//.test(value), {
    message: "Enter a valid URL starting with http:// or https://",
  });

export const newsletterSchema = z.object({
  email: z.email().trim().toLowerCase(),
});

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters.")
  .regex(/[A-Z]/, "Password must include an uppercase letter.")
  .regex(/[a-z]/, "Password must include a lowercase letter.")
  .regex(/[0-9]/, "Password must include a number.")
  .regex(/[^A-Za-z0-9]/, "Password must include a symbol.");

export const signInSchema = z.object({
  email: z.email().trim().toLowerCase(),
  password: z.string().min(1, "Enter your password."),
  returnTo: z.string().trim().optional(),
});

export const signUpSchema = z
  .object({
    firstName: z.string().trim().min(2).max(80),
    lastName: z.string().trim().min(2).max(80),
    email: z.email().trim().toLowerCase(),
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Confirm your password."),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export const confirmSignUpSchema = z.object({
  email: z.email().trim().toLowerCase(),
  code: z.string().trim().min(4).max(12),
});

export const accountProfileSchema = z.object({
  firstName: z.string().trim().min(2).max(80),
  lastName: z.string().trim().min(2).max(80),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password."),
    newPassword: passwordSchema,
    confirmNewPassword: z.string().min(1, "Confirm your new password."),
  })
  .refine((value) => value.newPassword === value.confirmNewPassword, {
    message: "Passwords do not match.",
    path: ["confirmNewPassword"],
  });

export const verificationRequestSchema = z.object({
  organizationName: z.string().trim().min(3).max(120),
  organizationType: z.enum(OrganizationType),
  websiteOrSocialUrl: optionalUrl,
  note: z.string().trim().min(10).max(500),
});

export const organizationOnboardingSchema = z.object({
  organizationType: z.enum(OrganizationType),
  name: z.string().trim().min(3).max(120),
  shortDescription: z.string().trim().min(16).max(180),
  description: z.string().trim().max(1200).optional(),
  city: z.string().trim().min(2).max(80),
  websiteUrl: optionalUrl,
  socialUrl: optionalUrl,
  addressLine1: z.string().trim().max(160).optional(),
  latitude: z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional(),
});

export const rideSeriesSchema = z.object({
  organizationId: z.string().trim().min(1),
  title: z.string().trim().min(3).max(120),
  summary: z.string().trim().min(16).max(180),
  description: z.string().trim().max(1400).optional(),
  city: z.string().trim().min(2).max(80),
  rideType: z.enum(RideType),
  paceLabel: z.string().trim().min(2).max(60),
  dropPolicy: z.enum(DropPolicy),
  skillLevel: z.string().trim().max(120).optional(),
  meetingLocationName: z.string().trim().min(2).max(120),
  meetingAddress: z.string().trim().max(160).optional(),
  startDate: z.string().trim().min(10),
  startTimeLocal: z.string().trim().min(4),
  estimatedDurationMinutes: z.coerce.number().int().min(30).max(480),
  routeUrl: optionalUrl,
  beginnerFriendly: z.boolean().default(false),
  youthFriendly: z.boolean().default(false),
  recurrenceMode: z.enum(["WEEKLY", "MONTHLY"]),
  recurrenceInterval: z.coerce.number().int().min(1).max(12),
  weekdays: z.array(z.enum(["SU", "MO", "TU", "WE", "TH", "FR", "SA"])).default([]),
  monthlyWeek: z.coerce.number().int().min(1).max(4).optional(),
  monthlyWeekday: z
    .enum(["SU", "MO", "TU", "WE", "TH", "FR", "SA"])
    .optional(),
  recurrenceUntil: z.string().trim().optional(),
});

export const eventSeriesSchema = z.object({
  organizationId: z.string().trim().min(1),
  title: z.string().trim().min(3).max(120),
  summary: z.string().trim().min(16).max(180),
  description: z.string().trim().max(1400).optional(),
  city: z.string().trim().min(2).max(80),
  eventType: z.enum(EventType),
  startsAtDate: z.string().trim().min(10),
  startsAtTime: z.string().trim().min(4),
  endsAtDate: z.string().trim().min(10),
  endsAtTime: z.string().trim().min(4),
  locationName: z.string().trim().min(2).max(120),
  locationAddress: z.string().trim().max(160).optional(),
  registrationUrl: optionalUrl,
  priceText: z.string().trim().max(80).optional(),
  isRecurring: z.boolean().default(false),
  recurrenceMode: z.enum(["WEEKLY", "MONTHLY"]).optional(),
  recurrenceInterval: z.coerce.number().int().min(1).max(12).optional(),
  monthlyWeek: z.coerce.number().int().min(1).max(4).optional(),
  monthlyWeekday: z
    .enum(["SU", "MO", "TU", "WE", "TH", "FR", "SA"])
    .optional(),
});

export const routeGuideSchema = z.object({
  organizationId: z.string().trim().optional(),
  title: z.string().trim().min(3).max(120),
  summary: z.string().trim().min(16).max(180),
  description: z.string().trim().min(40).max(2000),
  city: z.string().trim().min(2).max(80),
  distanceMiles: z.coerce.number().int().min(1).max(300),
  elevationFeet: z.coerce.number().int().min(0).max(30000),
  surface: z.enum(SurfaceType),
  bestSeason: z.string().trim().min(2).max(80),
  startLocationName: z.string().trim().min(2).max(120),
  startAddress: z.string().trim().max(160).optional(),
  routeUrl: optionalUrl,
  touristFriendly: z.boolean().default(false),
  beginnerFriendly: z.boolean().default(false),
});

export const reportSchema = z.object({
  targetType: z.enum(FavoriteTargetType),
  targetId: z.string().trim().min(1),
  reason: z.enum(ReportReason),
  description: z.string().trim().min(12).max(600),
  reporterEmail: z.email().trim().toLowerCase().optional(),
});

export const sponsorPlacementSchema = z.object({
  title: z.string().trim().min(3).max(120),
  blurb: z.string().trim().max(180).optional(),
  href: z.string().trim().min(1),
  priority: z.coerce.number().int().min(0).max(999).default(0),
});
