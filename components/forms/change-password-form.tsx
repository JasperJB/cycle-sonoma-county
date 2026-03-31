"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { changeAccountPasswordAction } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [isPending, startTransition] = useTransition();

  return (
    <form
      className="grid gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        startTransition(async () => {
          const result = await changeAccountPasswordAction({
            currentPassword,
            newPassword,
            confirmNewPassword,
          });

          if (!result.ok) {
            toast.error(result.message || "Unable to change your password.");
            return;
          }

          setCurrentPassword("");
          setNewPassword("");
          setConfirmNewPassword("");
          toast.success(result.message);
        });
      }}
    >
      <div className="grid gap-2">
        <Label htmlFor="current-password">Current password</Label>
        <Input
          id="current-password"
          type="password"
          autoComplete="current-password"
          value={currentPassword}
          onChange={(event) => setCurrentPassword(event.target.value)}
          className="h-12 rounded-2xl"
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="new-password">New password</Label>
          <Input
            id="new-password"
            type="password"
            autoComplete="new-password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            className="h-12 rounded-2xl"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="confirm-new-password">Confirm new password</Label>
          <Input
            id="confirm-new-password"
            type="password"
            autoComplete="new-password"
            value={confirmNewPassword}
            onChange={(event) => setConfirmNewPassword(event.target.value)}
            className="h-12 rounded-2xl"
          />
        </div>
      </div>
      <Button type="submit" disabled={isPending} className="h-12 rounded-2xl">
        {isPending ? "Updating..." : "Change password"}
      </Button>
    </form>
  );
}
