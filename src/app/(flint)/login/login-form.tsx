"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { presenterLogin } from "@/features/platform/console-actions";

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(presenterLogin, undefined);
  return (
    <form action={action} className="mt-6 grid gap-3">
      <input type="hidden" name="next" value={next} />
      <div className="grid gap-1.5">
        <Label htmlFor="password">Presenter password</Label>
        <Input id="password" name="password" type="password" autoComplete="current-password" required autoFocus />
      </div>
      {state?.error && (
        <p className="text-sm text-red-600" role="alert">
          {state.error}
        </p>
      )}
      <Button type="submit" disabled={pending} className="bg-slate-900 text-white hover:bg-slate-800">
        {pending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
