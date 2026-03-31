"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  changeCognitoPassword,
  confirmSignUp,
  resendConfirmationCode,
  signInWithPassword,
  signUpWithPassword,
  updateCognitoProfile,
} from "@/lib/auth/cognito";
import {
  clearSession,
  getSessionWithCognitoRefresh,
  setSession,
} from "@/lib/auth/session";
import { sessionFromUser, syncUserFromIdentity } from "@/lib/auth/user";
import {
  accountProfileSchema,
  changePasswordSchema,
  confirmSignUpSchema,
  signInSchema,
  signUpSchema,
} from "@/lib/validators";

function getErrorMessage(error: unknown) {
  if (error && typeof error === "object" && "name" in error) {
    const name = String(error.name);

    if (name === "UserNotConfirmedException") {
      return "Please confirm your email address before signing in.";
    }

    if (name === "NotAuthorizedException") {
      return "Email or password was incorrect.";
    }

    if (name === "UsernameExistsException") {
      return "An account already exists for that email.";
    }

    if (name === "CodeMismatchException") {
      return "That confirmation code was invalid.";
    }

    if (name === "ExpiredCodeException") {
      return "That confirmation code has expired. Request a new one.";
    }

    if (name === "InvalidPasswordException") {
      return "Your password does not meet the current requirements.";
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Something went wrong. Please try again.";
}

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

export async function signInAction(input: {
  email: string;
  password: string;
  returnTo?: string;
}) {
  const parsed = signInSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message || "Enter your email and password.",
    };
  }

  try {
    const signedIn = await signInWithPassword(parsed.data.email, parsed.data.password);
    const user = await syncUserFromIdentity({
      email: signedIn.claims.email,
      firstName: signedIn.claims.given_name,
      lastName: signedIn.claims.family_name,
      displayName: signedIn.claims.name,
      cognitoSub: signedIn.claims.sub,
      groups: signedIn.claims["cognito:groups"],
    });

    await setSession(
      sessionFromUser({
        ...user,
        cognitoAccessToken: signedIn.tokens.accessToken,
        cognitoIdToken: signedIn.tokens.idToken,
        cognitoRefreshToken: signedIn.tokens.refreshToken,
        cognitoAccessTokenExpiresAt: signedIn.tokens.expiresAt,
      }),
    );

    return {
      ok: true,
      redirectTo: parsed.data.returnTo || "/account",
    };
  } catch (error) {
    return {
      ok: false,
      message: getErrorMessage(error),
      needsConfirmation:
        error && typeof error === "object" && "name" in error
          ? String(error.name) === "UserNotConfirmedException"
          : false,
    };
  }
}

export async function signUpAction(input: {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
}) {
  const parsed = signUpSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message || "Review the highlighted fields.",
    };
  }

  try {
    await signUpWithPassword(parsed.data);
    return {
      ok: true,
      email: parsed.data.email,
    };
  } catch (error) {
    return {
      ok: false,
      message: getErrorMessage(error),
    };
  }
}

export async function confirmSignUpAction(input: {
  email: string;
  code: string;
}) {
  const parsed = confirmSignUpSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message || "Enter the confirmation code.",
    };
  }

  try {
    await confirmSignUp(parsed.data.email, parsed.data.code);
    return {
      ok: true,
      email: parsed.data.email,
    };
  } catch (error) {
    return {
      ok: false,
      message: getErrorMessage(error),
    };
  }
}

export async function resendConfirmationCodeAction(email: string) {
  try {
    await resendConfirmationCode(email.trim().toLowerCase());
    return {
      ok: true,
      message: "A new confirmation code was sent.",
    };
  } catch (error) {
    return {
      ok: false,
      message: getErrorMessage(error),
    };
  }
}

export async function updateAccountProfileAction(input: {
  firstName: string;
  lastName: string;
}) {
  const session = await getSessionWithCognitoRefresh();

  if (!session?.userId || !session.cognitoAccessToken) {
    return {
      ok: false,
      message: "Please sign in again before updating your profile.",
    };
  }

  const parsed = accountProfileSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message || "Review the highlighted fields.",
    };
  }

  try {
    await updateCognitoProfile({
      accessToken: session.cognitoAccessToken,
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
    });

    const updatedUser = await prisma.user.update({
      where: { id: session.userId },
      data: {
        firstName: parsed.data.firstName,
        lastName: parsed.data.lastName,
        displayName: `${parsed.data.firstName} ${parsed.data.lastName}`.trim(),
      },
    });

    await setSession(
      sessionFromUser({
        ...updatedUser,
        cognitoAccessToken: session.cognitoAccessToken,
        cognitoIdToken: session.cognitoIdToken,
        cognitoRefreshToken: session.cognitoRefreshToken,
        cognitoAccessTokenExpiresAt: session.cognitoAccessTokenExpiresAt,
      }),
    );

    return {
      ok: true,
      message: "Your name was updated.",
    };
  } catch (error) {
    return {
      ok: false,
      message: getErrorMessage(error),
    };
  }
}

export async function changeAccountPasswordAction(input: {
  currentPassword: string;
  newPassword: string;
  confirmNewPassword: string;
}) {
  const session = await getSessionWithCognitoRefresh();

  if (!session?.cognitoAccessToken) {
    return {
      ok: false,
      message: "Please sign in again before changing your password.",
    };
  }

  const parsed = changePasswordSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message || "Review the highlighted fields.",
    };
  }

  try {
    await changeCognitoPassword({
      accessToken: session.cognitoAccessToken,
      currentPassword: parsed.data.currentPassword,
      newPassword: parsed.data.newPassword,
    });

    return {
      ok: true,
      message: "Your password was updated.",
    };
  } catch (error) {
    return {
      ok: false,
      message: getErrorMessage(error),
    };
  }
}

export async function logoutAction() {
  await clearSession();
  redirect("/");
}
