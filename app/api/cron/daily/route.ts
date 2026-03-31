import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { runNewsletterDigest } from "@/lib/newsletter";

export async function GET(request: Request) {
  const secret = new URL(request.url).searchParams.get("secret");
  const vercelCron = request.headers.get("x-vercel-cron");

  if (!vercelCron && env.CRON_SECRET && secret !== env.CRON_SECRET) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  const result = await runNewsletterDigest();

  return NextResponse.json({ ok: true, result });
}
