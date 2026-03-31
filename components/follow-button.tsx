"use client";

import { useState, useTransition } from "react";
import { Bell } from "lucide-react";
import { toast } from "sonner";
import { toggleFollowOrganizationAction } from "@/app/actions/engagement";
import { Button } from "@/components/ui/button";

export function FollowButton({
  organizationId,
  initial = false,
}: {
  organizationId: string;
  initial?: boolean;
}) {
  const [isFollowing, setIsFollowing] = useState(initial);
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="outline"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          const result = await toggleFollowOrganizationAction(organizationId);

          if (!result.ok) {
            toast.error(result.message || "Unable to follow organization.");
            return;
          }

          setIsFollowing(Boolean(result.following));
          toast.success(result.following ? "Following organization." : "Unfollowed organization.");
        })
      }
    >
      <Bell className={isFollowing ? "fill-current" : ""} />
      {isFollowing ? "Following" : "Follow org"}
    </Button>
  );
}
