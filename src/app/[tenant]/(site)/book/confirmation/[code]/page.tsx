import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { getTenant } from "@/features/platform/tenant";
import { getBookingByToken } from "@/features/website/booking-lookup";
import { BookingSteps } from "@/features/website/components/booking-steps";
import { buttonVariants } from "@/components/ui/button";
import { formatDay } from "@/lib/dates";
import { formatMoney } from "@/lib/format";

export const metadata = { title: "Booking confirmed" };

/** Step 4. Shown only with the guest's portal token, so a guessed code reveals nothing. */
export default async function ConfirmationPage({ params, searchParams }: PageProps<"/[tenant]/book/confirmation/[code]">) {
  const { tenant: slug, code } = await params;
  const token = (await searchParams).t;
  const tenant = await getTenant(slug);
  const booking = typeof token === "string" ? await getBookingByToken(tenant, token) : null;
  if (!booking || booking.code !== code) notFound();

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8">
      <BookingSteps current={4} />
      <div className="mt-6 rounded-xl border bg-background p-6 text-center">
        <CheckCircle2 className="mx-auto size-10 text-primary" />
        <h1 className="mt-3 font-heading text-3xl font-semibold">You are booked, {booking.guest.first_name}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          A confirmation is on its way to {booking.guest.email}. (Demo: it lands in the outbox, nothing is sent.)
        </p>
        <p className="mt-5 text-sm text-muted-foreground">Confirmation code</p>
        <p className="font-mono text-3xl font-semibold tracking-wider" data-testid="confirmation-code">
          {booking.code}
        </p>
        <dl className="mx-auto mt-6 grid max-w-sm gap-1.5 text-left text-sm">
          <Row label="Room" value={booking.room_type} />
          <Row label="Check-in" value={formatDay(booking.check_in)} />
          <Row label="Check-out" value={formatDay(booking.check_out)} />
          <Row label="Guests" value={`${booking.adults} adult${booking.adults > 1 ? "s" : ""}`} />
          <Row label="Paid" value={formatMoney(booking.total, tenant.currency)} />
        </dl>
        <div className="mt-6 flex flex-col items-center gap-2">
          <Link href={`/${tenant.slug}/stay/${encodeURIComponent(String(token))}`} className={buttonVariants({ size: "lg" })} data-testid="portal-link">
            Check in online
          </Link>
          <p className="text-xs text-muted-foreground">Save this link: it opens your stay portal. No app or password needed.</p>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
