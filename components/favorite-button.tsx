"use client";

import { useState, useTransition } from "react";
import { Heart } from "lucide-react";
import { toast } from "sonner";
import { toggleFavoriteAction } from "@/app/actions/engagement";
import { Button } from "@/components/ui/button";

export function FavoriteButton({
  targetId,
  targetType,
  initial = false,
}: {
  targetId: string;
  targetType: "SHOP" | "CLUB" | "RIDE" | "EVENT" | "ROUTE";
  initial?: boolean;
}) {
  const [isFavorite, setIsFavorite] = useState(initial);
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="outline"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          const result = await toggleFavoriteAction({ targetId, targetType });

          if (!result.ok) {
            toast.error(result.message || "Unable to update favorite.");
            return;
          }

          setIsFavorite(Boolean(result.favorite));
          toast.success(result.favorite ? "Saved to favorites." : "Removed from favorites.");
        })
      }
    >
      <Heart className={isFavorite ? "fill-current" : ""} />
      {isFavorite ? "Saved" : "Save"}
    </Button>
  );
}
