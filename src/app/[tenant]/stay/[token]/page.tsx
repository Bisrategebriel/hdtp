import { notFound } from "next/navigation";
import { getTenant } from "@/features/platform/tenant";
import { getBookingByToken } from "@/features/website/booking-lookup";
import { formatDay } from "@/lib/dates";

export const metadata = { title: "Your stay" };

/**
 * Guest portal entry, reached by the token link from the booking confirmation. Block 5
 * adds online check-in, room service and the concierge here.
 */
export default async function StayPage({ params }: PageProps<"/[tenant]/stay/[token]">) {
  const { tenant: slug, token } = await params;
  const tenant = await getTenant(slug);
  const booking = await getBookingByToken(tenant, decodeURIComponent(token));
  if (!booking) notFound();

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 py-8" data-testid="guest-portal">
      <p className="font-heading text-xl font-semibold text-primary">{tenant.theme.logoText}</p>
      <h1 className="mt-4 text-2xl font-semibold">Welcome, {booking.guest.first_name}</h1>
      <div className="mt-4 rounded-xl border bg-background p-4 text-sm">
        <p className="font-medium">{booking.room_type}</p>
        <p className="mt-1 text-muted-foreground">
          {formatDay(booking.check_in)} to {formatDay(booking.check_out)} · {booking.code}
        </p>
      </div>
      <p className="mt-4 rounded-lg bg-muted p-3 text-sm text-muted-foreground">
        Online check-in, room service and the concierge open here before your arrival.
      </p>
    </main>
  );
}
