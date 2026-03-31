import { NextResponse } from "next/server";
import { authMode } from "@/lib/env";
import { buildCognitoUrl } from "@/lib/auth/cognito";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const returnTo = url.searchParams.get("returnTo") || "/account";

  if (authMode === "cognito") {
    return NextResponse.redirect(await buildCognitoUrl({ screen: "signin", returnTo }));
  }

  if (authMode === "development") {
    return NextResponse.redirect(new URL("/auth/dev-login", url));
  }

  return NextResponse.redirect(new URL("/", url));
}
