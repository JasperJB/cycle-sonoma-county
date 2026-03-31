import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().default(
    "postgresql://postgres:password@127.0.0.1:5432/cycle_sonoma_county?schema=public",
  ),
  SHADOW_DATABASE_URL: z.string().default(
    "postgresql://postgres:password@127.0.0.1:5432/cycle_sonoma_county_shadow?schema=public",
  ),
  AUTH_SECRET: z.string().default("cycle-sonoma-county-dev-secret"),
  APP_URL: z.string().url().default("http://localhost:3000"),
  APP_NAME: z.string().default("Cycle Sonoma County"),
  DEV_AUTH_ENABLED: z
    .string()
    .default("true")
    .transform((value) => value === "true"),
  COGNITO_ISSUER: z.string().optional(),
  COGNITO_CLIENT_ID: z.string().optional(),
  COGNITO_CLIENT_SECRET: z.string().optional(),
  COGNITO_DOMAIN: z.string().optional(),
  COGNITO_REDIRECT_URI: z.string().url().optional(),
  COGNITO_LOGOUT_URI: z.string().url().optional(),
  COGNITO_SCOPES: z.string().default("openid email profile aws.cognito.signin.user.admin"),
  COGNITO_REGION: z.string().default("us-west-2"),
  COGNITO_USER_POOL_ID: z.string().optional(),
  NEXT_PUBLIC_SITE_URL: z.string().url().default("http://localhost:3000"),
  NEXT_PUBLIC_MAP_TILE_URL: z
    .string()
    .default("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"),
  NEXT_PUBLIC_MAP_ATTRIBUTION: z
    .string()
    .default("&copy; OpenStreetMap contributors"),
  BLOB_READ_WRITE_TOKEN: z.string().optional(),
  UPLOAD_MAX_MB: z.coerce.number().default(6),
  NEWSLETTER_FROM_EMAIL: z.string().optional(),
  NEWSLETTER_SEND_DAY: z.string().default("thursday"),
  RESEND_API_KEY: z.string().optional(),
  CRON_SECRET: z.string().optional(),
  GEOCODING_API_KEY: z.string().optional(),
  GEOCODING_API_URL: z.string().optional(),
});

export const env = envSchema.parse(process.env);

export const authMode =
  env.COGNITO_ISSUER && env.COGNITO_CLIENT_ID && env.COGNITO_DOMAIN
    ? "cognito"
    : env.DEV_AUTH_ENABLED && env.NODE_ENV !== "production"
      ? "development"
      : "disabled";
