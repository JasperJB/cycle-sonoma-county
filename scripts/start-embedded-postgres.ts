import { ensureEmbeddedCluster } from "./lib/local-postgres";

async function main() {
  const pg = await ensureEmbeddedCluster();

  console.log("Embedded Postgres is running on postgresql://postgres:password@127.0.0.1:5432");
  console.log("Primary database: cycle_sonoma_county");
  console.log("Shadow database: cycle_sonoma_county_shadow");

  const shutdown = async () => {
    await pg.stop();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  await new Promise(() => undefined);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
