"use client";

import type { ComponentProps } from "react";
import { Button } from "@/components/ui/button";

export function ConfirmSubmitButton({
  confirmationMessage,
  children,
  onClick,
  ...props
}: ComponentProps<typeof Button> & {
  confirmationMessage: string;
}) {
  return (
    <Button
      {...props}
      onClick={(event) => {
        if (!window.confirm(confirmationMessage)) {
          event.preventDefault();
          return;
        }

        onClick?.(event);
      }}
    >
      {children}
    </Button>
  );
}
