import { spawn } from "node:child_process";

function run(command: string, args: string[]) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: "inherit",
      shell: process.platform === "win32",
      env: process.env,
    });

    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${command} ${args.join(" ")} exited with code ${code ?? 1}`));
    });
  });
}

function runWithOutput(command: string, args: string[]) {
  return new Promise<{ code: number; stdout: string; stderr: string }>((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: ["ignore", "pipe", "pipe"],
      shell: process.platform === "win32",
      env: process.env,
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
      process.stdout.write(chunk);
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
      process.stderr.write(chunk);
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      resolve({
        code: code ?? 1,
        stdout,
        stderr,
      });
    });
  });
}

async function main() {
  const isVercelBuild = Boolean(process.env.VERCEL) || Boolean(process.env.VERCEL_ENV);

  if (isVercelBuild) {
    const status = await runWithOutput("prisma", ["migrate", "status"]);
    const combined = `${status.stdout}\n${status.stderr}`;

    if (combined.includes("have not yet been applied")) {
      await run("prisma", ["migrate", "deploy"]);
    } else if (status.code !== 0 && !combined.includes("Database schema is up to date")) {
      throw new Error("prisma migrate status failed");
    }
  }

  await run("next", ["build"]);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
