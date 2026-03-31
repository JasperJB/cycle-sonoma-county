import "dotenv/config";
import { defineConfig } from "prisma/config";

const databaseUrl =
  process.env.DATABASE_URL ||
  "postgresql://postgres:password@127.0.0.1:5432/cycle_sonoma_county?schema=public";
const shadowDatabaseUrl =
  process.env.SHADOW_DATABASE_URL ||
  "postgresql://postgres:password@127.0.0.1:5432/cycle_sonoma_county_shadow?schema=public";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: databaseUrl,
    shadowDatabaseUrl,
  },
});
