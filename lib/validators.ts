import {
  DropPolicy,
  EventType,
  FavoriteTargetType,
  OrganizationMembershipRole,
  OrganizationType,
  ReportReason,
  RideType,
  SurfaceType,
} from "@/app/generated/prisma/enums";
import { z } from "zod";

const monthlyWeekSchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal(-1),
]);

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
  addressLine1: z
    .string()
    .trim()
    .min(5, "Enter a street or regular meetup address so the listing can appear on the map.")
    .max(160),
  latitude: z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional(),
});
export type OrganizationOnboardingInput = z.infer<typeof organizationOnboardingSchema>;

export const organizationInviteSchema = z.object({
  email: z.email().trim().toLowerCase(),
  organizationIds: z.array(z.string().trim().min(1)).min(1, "Choose at least one organization."),
  role: z
    .enum([
      OrganizationMembershipRole.OWNER,
      OrganizationMembershipRole.EDITOR,
      OrganizationMembershipRole.CONTRIBUTOR,
    ])
    .default(OrganizationMembershipRole.EDITOR),
});
export type OrganizationInviteInput = z.infer<typeof organizationInviteSchema>;

export const rideSeriesSchema = z
  .object({
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
    meetingAddress: z
      .string()
      .trim()
      .min(5, "Enter the meeting address so riders can find the pin on the map.")
      .max(160),
    startDate: z.string().trim().min(10),
    startTimeLocal: z.string().trim().min(4),
    estimatedDurationMinutes: z.coerce.number().int().min(30).max(480),
    routeUrl: optionalUrl,
    beginnerFriendly: z.boolean().default(false),
    youthFriendly: z.boolean().default(false),
    recurrenceMode: z.enum(["CUSTOM", "WEEKLY", "MONTHLY"]),
    recurrenceInterval: z.coerce.number().int().min(1).max(12),
    weekdays: z.array(z.enum(["SU", "MO", "TU", "WE", "TH", "FR", "SA"])).default([]),
    monthlyWeeks: z.array(monthlyWeekSchema).default([]),
    monthlyWeekday: z
      .enum(["SU", "MO", "TU", "WE", "TH", "FR", "SA"])
      .optional(),
    recurrenceUntil: z.string().trim().optional(),
    customDates: z.array(z.string().trim()).default([]),
  })
  .superRefine((value, context) => {
    if (value.recurrenceMode === "CUSTOM") {
      const customDates = value.customDates.filter(Boolean);

      if (!customDates.length) {
        context.addIssue({
          code: "custom",
          path: ["customDates"],
          message: "Add at least one custom date.",
        });
      }

      customDates.forEach((date, index) => {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
          context.addIssue({
            code: "custom",
            path: ["customDates", index],
            message: "Enter a valid date.",
          });
        }
      });
    }

    if (value.recurrenceMode === "WEEKLY" && !value.weekdays.length) {
      context.addIssue({
        code: "custom",
        path: ["weekdays"],
        message: "Choose at least one weekday for a weekly ride.",
      });
    }

    if (value.recurrenceMode === "MONTHLY" && !value.monthlyWeeks.length) {
      context.addIssue({
        code: "custom",
        path: ["monthlyWeeks"],
        message: "Choose at least one monthly position.",
      });
    }

    if (value.recurrenceMode === "MONTHLY" && !value.monthlyWeekday) {
      context.addIssue({
        code: "custom",
        path: ["monthlyWeekday"],
        message: "Choose the weekday for the monthly pattern.",
      });
    }
  });
export type RideSeriesInput = z.infer<typeof rideSeriesSchema>;
export type RideSeriesFormInput = z.input<typeof rideSeriesSchema>;

export const eventSeriesSchema = z
  .object({
    organizationId: z.string().trim().min(1),
    title: z.string().trim().min(3).max(120),
    summary: z.string().trim().min(16).max(180),
    description: z.string().trim().max(1400).optional(),
    city: z.string().trim().min(2).max(80),
    eventType: z.enum(EventType),
    startsAtDate: z.string().trim().min(10),
    startsAtTime: z.string().trim().min(4),
    durationMinutes: z.coerce.number().int().min(30).max(4320),
    locationName: z.string().trim().min(2).max(120),
    locationAddress: z
      .string()
      .trim()
      .min(5, "Enter the event address so the listing can be placed on the map.")
      .max(160),
    registrationUrl: optionalUrl,
    priceText: z.string().trim().max(80).optional(),
    isRecurring: z.boolean().default(false),
    recurrenceMode: z.enum(["CUSTOM", "WEEKLY", "MONTHLY"]).optional(),
    recurrenceInterval: z.coerce.number().int().min(1).max(12).optional(),
    recurrenceUntil: z.string().trim().optional(),
    weekdays: z.array(z.enum(["SU", "MO", "TU", "WE", "TH", "FR", "SA"])).default([]),
    monthlyWeeks: z.array(monthlyWeekSchema).default([]),
    monthlyWeekday: z
      .enum(["SU", "MO", "TU", "WE", "TH", "FR", "SA"])
      .optional(),
    customDates: z.array(z.string().trim()).default([]),
  })
  .superRefine((value, context) => {
    if (!value.isRecurring) {
      return;
    }

    if (value.recurrenceMode === "CUSTOM") {
      const customDates = value.customDates.filter(Boolean);

      if (!customDates.length) {
        context.addIssue({
          code: "custom",
          path: ["customDates"],
          message: "Add at least one custom date.",
        });
      }

      customDates.forEach((date, index) => {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
          context.addIssue({
            code: "custom",
            path: ["customDates", index],
            message: "Enter a valid date.",
          });
        }
      });
    }

    if (value.recurrenceMode === "WEEKLY" && !value.weekdays.length) {
      context.addIssue({
        code: "custom",
        path: ["weekdays"],
        message: "Choose at least one weekday for a weekly event.",
      });
    }

    if (value.recurrenceMode === "MONTHLY" && !value.monthlyWeeks.length) {
      context.addIssue({
        code: "custom",
        path: ["monthlyWeeks"],
        message: "Choose at least one monthly position.",
      });
    }

    if (value.recurrenceMode === "MONTHLY" && !value.monthlyWeekday) {
      context.addIssue({
        code: "custom",
        path: ["monthlyWeekday"],
        message: "Choose the weekday for the monthly pattern.",
      });
    }
  });
export type EventSeriesInput = z.infer<typeof eventSeriesSchema>;
export type EventSeriesFormInput = z.input<typeof eventSeriesSchema>;

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
  startAddress: z
    .string()
    .trim()
    .min(5, "Enter the route start address so the guide can be pinned on the map.")
    .max(160),
  routeUrl: optionalUrl,
  touristFriendly: z.boolean().default(false),
  beginnerFriendly: z.boolean().default(false),
});
export type RouteGuideInput = z.infer<typeof routeGuideSchema>;

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
