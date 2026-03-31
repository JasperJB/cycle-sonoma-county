import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import EmbeddedPostgres from "embedded-postgres";

const LOCAL_HOST = "127.0.0.1";
const LOCAL_PORT = 5432;
const LOCAL_USER = "postgres";
const LOCAL_PASSWORD = "password";
const LOCAL_DATABASE = "cycle_sonoma_county";
const LOCAL_SHADOW_DATABASE = "cycle_sonoma_county_shadow";

export const defaultDatabaseUrl = `postgresql://${LOCAL_USER}:${LOCAL_PASSWORD}@${LOCAL_HOST}:${LOCAL_PORT}/${LOCAL_DATABASE}?schema=public`;
export const defaultShadowDatabaseUrl = `postgresql://${LOCAL_USER}:${LOCAL_PASSWORD}@${LOCAL_HOST}:${LOCAL_PORT}/${LOCAL_SHADOW_DATABASE}?schema=public`;

export function databaseUrlFromEnv() {
  return process.env.DATABASE_URL || defaultDatabaseUrl;
}

export function shadowDatabaseUrlFromEnv() {
  return process.env.SHADOW_DATABASE_URL || defaultShadowDatabaseUrl;
}

export function createEmbeddedPostgres() {
  return new EmbeddedPostgres({
    databaseDir: path.join(process.cwd(), ".local", "postgres"),
    user: LOCAL_USER,
    password: LOCAL_PASSWORD,
    port: LOCAL_PORT,
    persistent: true,
    authMethod: "scram-sha-256",
  });
}

export async function ensureEmbeddedCluster() {
  const pg = createEmbeddedPostgres();
  const dataDir = path.join(process.cwd(), ".local", "postgres");

  if (!fs.existsSync(path.join(dataDir, "PG_VERSION"))) {
    await pg.initialise();
  }

  await pg.start();
  await pg.createDatabase(LOCAL_DATABASE).catch(() => undefined);
  await pg.createDatabase(LOCAL_SHADOW_DATABASE).catch(() => undefined);
  return pg;
}

export async function runCommand(
  command: string,
  args: string[],
  env?: NodeJS.ProcessEnv,
) {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: "inherit",
      shell: process.platform === "win32",
      env: {
        ...process.env,
        ...env,
      },
    });

    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${command} exited with code ${code}`));
    });

    child.on("error", reject);
  });
}

export function withLocalDatabaseEnv(
  extra?: Record<string, string | undefined>,
) {
  return {
    ...process.env,
    DATABASE_URL: databaseUrlFromEnv(),
    SHADOW_DATABASE_URL: shadowDatabaseUrlFromEnv(),
    ...extra,
  };
}
