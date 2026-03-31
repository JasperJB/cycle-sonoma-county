"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { clearSession, setSession } from "@/lib/auth/session";
import { sessionFromUser } from "@/lib/auth/user";

export async function devLoginAction(email: string) {
  const normalized = email.trim().toLowerCase();
  const user = await prisma.user.findUnique({
    where: { email: normalized },
  });

  if (!user) {
    return {
      ok: false,
      message: "No demo user found for that email.",
    };
  }

  await setSession(sessionFromUser(user));

  return {
    ok: true,
    message: "Signed in.",
  };
}

export async function logoutAction() {
  await clearSession();
  redirect("/");
}
