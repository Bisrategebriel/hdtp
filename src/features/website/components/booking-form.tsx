"use client";

import { useOptimistic, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TEST_CARDS, tokenForTestCard } from "@/adapters/payment/test-cards";
import type { PaymentToken } from "@/adapters/payment";
import { formatMoney } from "@/lib/format";
import { bookStay, type BookingState } from "../actions";

const PREFERENCES = ["high floor", "quiet room", "late check-in", "airport transfer"] as const;

type Props = {
  slug: string;
  roomType: string;
  plan: string;
  from: string;
  to: string;
  adults: number;
  breakfast: boolean;
  breakfastIncluded: boolean;
  breakfastOnHref: string;
  breakfastOffHref: string;
  total: number;
  currency: string;
};

/**
 * Guest details and the mock gateway. The card number field has no `name`, so it is never
 * part of the submitted data: the browser checks it against the test-card allowlist and
 * sends only the token (CLAUDE.md hard rules). No cc-* autocomplete anywhere.
 */
export function BookingForm(p: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [card, setCard] = useState("");
  const [state, setState] = useState<BookingState | null>(null);
  const [challenge, setChallenge] = useState<{ token: PaymentToken; guest: GuestFields } | null>(null);
  // Ticks at once; the server re-prices the stay and the summary follows.
  const [breakfast, setBreakfast] = useOptimistic(p.breakfast);
  const [repricing, startRepricing] = useTransition();
  const toggleBreakfast = (on: boolean) =>
    startRepricing(() => {
      setBreakfast(on);
      router.replace(on ? p.breakfastOnHref : p.breakfastOffHref, { scroll: false });
    });

  const submit = (token: PaymentToken, guest: GuestFields, challengeApproved = false) =>
    startTransition(async () => {
      const result = await bookStay({
        slug: p.slug, roomType: p.roomType, plan: p.plan, from: p.from, to: p.to, adults: p.adults,
        breakfast: p.breakfast, guest, payment: { token, challengeApproved },
      });
      // On success the action redirects to the confirmation page and returns nothing.
      if (result?.status === "challenge") setChallenge({ token, guest });
      else setState(result ?? null);
    });

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const token = tokenForTestCard(card);
    if (!token) {
      setState({ status: "fields", errors: { card: "Test mode: use one of the test card numbers below." } });
      return;
    }
    setState(null);
    submit(token, {
      firstName: String(form.get("firstName") ?? ""),
      lastName: String(form.get("lastName") ?? ""),
      email: String(form.get("email") ?? ""),
      phone: String(form.get("phone") ?? ""),
      preferences: form.getAll("preferences").map(String) as GuestFields["preferences"],
    });
  };

  const err = (k: string) => (state?.status === "fields" ? state.errors[k] : undefined);

  return (
    <form onSubmit={onSubmit} className="grid gap-6" noValidate>
      <fieldset className="grid gap-3">
        <legend className="mb-2 font-medium">Extras</legend>
        {p.breakfastIncluded ? (
          <p className="text-sm text-muted-foreground">Breakfast is included in this rate.</p>
        ) : (
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={breakfast}
              onChange={(e) => toggleBreakfast(e.target.checked)}
              className="size-4 accent-[var(--tenant-primary)]"
              data-testid="extra-breakfast"
            />
            Add breakfast for {p.adults} adult{p.adults > 1 ? "s" : ""}, every morning
          </label>
        )}
      </fieldset>

      <fieldset className="grid gap-3 sm:grid-cols-2">
        <legend className="mb-2 font-medium">Guest</legend>
        <Field id="firstName" label="First name" error={err("guest.firstName")} autoComplete="given-name" />
        <Field id="lastName" label="Last name" error={err("guest.lastName")} autoComplete="family-name" />
        <Field id="email" label="Email" type="email" error={err("guest.email")} autoComplete="email" />
        <Field id="phone" label="Phone (optional)" type="tel" autoComplete="tel" />
        <div className="sm:col-span-2">
          <span className="text-sm">Preferences</span>
          <div className="mt-1.5 flex flex-wrap gap-3">
            {PREFERENCES.map((pref) => (
              <label key={pref} className="flex items-center gap-1.5 text-sm">
                <input type="checkbox" name="preferences" value={pref} className="size-4 accent-[var(--tenant-primary)]" />
                {pref[0].toUpperCase() + pref.slice(1)}
              </label>
            ))}
          </div>
        </div>
      </fieldset>

      <fieldset className="grid gap-3 rounded-xl border p-4">
        <legend className="px-1 font-medium">Payment</legend>
        <div className="rounded-lg border-2 border-dashed border-amber-500 bg-amber-50 p-3 text-sm text-amber-950" data-testid="test-mode-banner" role="note">
          <strong>TEST MODE.</strong> No real payment is taken and card numbers never leave this page. Use a test card:
          <ul className="mt-2 grid gap-1">
            {TEST_CARDS.map((c) => (
              <li key={c.number} className="flex flex-wrap items-center justify-between gap-2">
                <span>
                  <code className="font-mono">{c.number.replace(/(\d{4})(?=\d)/g, "$1 ")}</code> · {c.label}
                </span>
                <button type="button" onClick={() => setCard(c.number)} className="text-xs font-medium underline">
                  Use
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="test-card">Test card number</Label>
          <Input
            id="test-card"
            value={card}
            onChange={(e) => setCard(e.target.value)}
            inputMode="numeric"
            autoComplete="off"
            placeholder="4242 4242 4242 4242"
            aria-invalid={Boolean(err("card"))}
            data-testid="test-card-input"
          />
          {err("card") && <p className="text-sm text-destructive">{err("card")}</p>}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="test-expiry">Expiry (any future date)</Label>
            <Input id="test-expiry" autoComplete="off" placeholder="12 / 30" />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="test-code">Security code (any 3 digits)</Label>
            <Input id="test-code" autoComplete="off" inputMode="numeric" placeholder="123" />
          </div>
        </div>
      </fieldset>

      {state?.status === "error" && (
        <p className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive" role="alert" data-testid="booking-error">
          {state.message}
        </p>
      )}

      <Button type="submit" size="lg" className="h-11 text-base" disabled={pending || repricing} data-testid="pay-button">
        {pending ? <Loader2 className="animate-spin" /> : <ShieldCheck />}
        Pay {formatMoney(p.total, p.currency)} and book
      </Button>

      <Dialog open={challenge !== null} onOpenChange={(open) => !open && setChallenge(null)}>
        <DialogContent data-testid="challenge-dialog">
          <DialogHeader>
            <DialogTitle>Confirm this payment</DialogTitle>
            <DialogDescription>
              Test bank verification (3-D Secure style). Approve the payment of {formatMoney(p.total, p.currency)} to{" "}
              finish your booking.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setChallenge(null)}>
              Cancel
            </Button>
            <Button
              data-testid="challenge-approve"
              disabled={pending}
              onClick={() => {
                if (!challenge) return;
                const { token, guest } = challenge;
                setChallenge(null);
                submit(token, guest, true);
              }}
            >
              Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </form>
  );
}

type GuestFields = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  preferences: (typeof PREFERENCES)[number][];
};

function Field({ id, label, error, type = "text", autoComplete }: { id: string; label: string; error?: string; type?: string; autoComplete?: string }) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} name={id} type={type} autoComplete={autoComplete} aria-invalid={Boolean(error)} />
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
