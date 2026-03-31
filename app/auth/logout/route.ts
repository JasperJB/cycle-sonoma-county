import { NextResponse } from "next/server";
import { clearSession } from "@/lib/auth/session";
import { env } from "@/lib/env";

export async function GET(request: Request) {
  const url = new URL(request.url);
  await clearSession();

  if (env.COGNITO_DOMAIN && env.COGNITO_CLIENT_ID) {
    const logoutUrl = new URL(`${env.COGNITO_DOMAIN}/logout`);
    logoutUrl.searchParams.set("client_id", env.COGNITO_CLIENT_ID);
    logoutUrl.searchParams.set(
      "logout_uri",
      env.COGNITO_LOGOUT_URI || `${env.APP_URL}/`,
    );
    return NextResponse.redirect(logoutUrl);
  }

  return NextResponse.redirect(new URL("/", url));
}
