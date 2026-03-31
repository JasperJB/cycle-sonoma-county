import {
  ensureEmbeddedCluster,
  runCommand,
  withLocalDatabaseEnv,
} from "./lib/local-postgres";

async function main() {
  const pg = await ensureEmbeddedCluster();
  const env = withLocalDatabaseEnv();

  try {
    await runCommand("npx", ["prisma", "migrate", "deploy"], env);
    await runCommand("npx", ["prisma", "db", "seed"], env);
  } finally {
    await pg.stop();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
