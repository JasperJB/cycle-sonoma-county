import { describe, expect, it } from "vitest";
import { UserRole } from "@/app/generated/prisma/enums";
import { sessionFromUser } from "@/lib/auth/user";

describe("session payload", () => {
  it("keeps the browser session focused on app identity fields", () => {
    const user = {
      id: "user_123",
      email: "member@example.com",
      firstName: "Member",
      lastName: "Example",
      displayName: "Member Example",
      globalRole: UserRole.MEMBER,
      cognitoAccessToken: "very-large-access-token",
      cognitoIdToken: "very-large-id-token",
      cognitoRefreshToken: "very-large-refresh-token",
      cognitoAccessTokenExpiresAt: Date.now() + 60_000,
    };

    const session = sessionFromUser(user);

    expect(session).toEqual({
      userId: "user_123",
      email: "member@example.com",
      firstName: "Member",
      lastName: "Example",
      displayName: "Member Example",
      role: UserRole.MEMBER,
    });
  });
});
