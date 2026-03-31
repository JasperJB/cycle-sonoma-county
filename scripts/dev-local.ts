import { spawn } from "node:child_process";
import {
  ensureEmbeddedCluster,
  runCommand,
  withLocalDatabaseEnv,
} from "./lib/local-postgres";

async function main() {
  const port = process.env.PORT || "3000";
  const pg = await ensureEmbeddedCluster();
  const env = withLocalDatabaseEnv({
    PORT: port,
  });

  try {
    await runCommand("npx", ["prisma", "migrate", "deploy"], env);
    await runCommand("npx", ["prisma", "db", "seed"], env);

    const child = spawn("npx", ["next", "dev", "--port", port], {
      stdio: "inherit",
      shell: process.platform === "win32",
      env,
    });

    const shutdown = async () => {
      child.kill("SIGTERM");
      await pg.stop();
      process.exit(0);
    };

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);

    child.on("exit", async (code) => {
      await pg.stop();
      process.exit(code ?? 0);
    });
  } catch (error) {
    await pg.stop();
    throw error;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
