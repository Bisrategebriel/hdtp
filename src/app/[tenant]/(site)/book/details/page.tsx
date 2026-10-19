import Link from "next/link";
import { notFound } from "next/navigation";
import { getTenant, requireFeature } from "@/features/platform/tenant";
import { getQuote, listRatePlans, listRoomTypes } from "@/features/website/queries";
import { parseSearch, selectionSchema } from "@/features/website/schema";
import { BookingSteps } from "@/features/website/components/booking-steps";
import { BookingForm } from "@/features/website/components/booking-form";
import { formatDay } from "@/lib/dates";
import { formatMoney } from "@/lib/format";

export const metadata = { title: "Your details" };

/** Booking steps 2 and 3: extras, guest details and the mock payment (B3). */
export default async function DetailsPage({ params, searchParams }: PageProps<"/[tenant]/book/details">) {
  const tenant = await getTenant((await params).tenant);
  await requireFeature(tenant, "website.booking");
  const sp = await searchParams;
  const search = parseSearch(sp);
  const selection = selectionSchema.safeParse(sp);
  if (!selection.success) notFound();

  const [types, plans] = await Promise.all([listRoomTypes(tenant), listRatePlans(tenant)]);
  const roomType = types.find((t) => t.id === selection.data.roomType);
  const plan = plans.find((p) => p.id === selection.data.plan);
  if (!roomType || !plan) notFound();

  const breakfast = selection.data.breakfast === "1" && !plan.includes_breakfast;
  const quote = await getQuote(tenant, { roomType: roomType.id, plan: plan.id, from: search.from, to: search.to, adults: search.adults, breakfast });
  const back = `/${tenant.slug}/book?${new URLSearchParams({ from: search.from, to: search.to, adults: String(search.adults) })}`;
  const toggleHref = (on: boolean) =>
    `/${tenant.slug}/book/details?${new URLSearchParams({ from: search.from, to: search.to, adults: String(search.adults), roomType: roomType.id, plan: plan.id, breakfast: on ? "1" : "0" })}`;

  const grouped = [
    { label: `Room, ${quote.nights} night${quote.nights > 1 ? "s" : ""}`, amount: quote.lines.filter((l) => l.category === "room").reduce((s, l) => s + l.amount, 0) },
    { label: "Breakfast", amount: quote.lines.filter((l) => l.category === "extra").reduce((s, l) => s + l.amount, 0) },
    { label: "Service charge (10%)", amount: quote.service },
    { label: "VAT (15%)", amount: quote.tax },
  ].filter((g) => g.amount > 0);

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8">
      <BookingSteps current={2} />
      <div className="mt-4 grid gap-8 lg:grid-cols-[1fr_340px]">
        <div>
          <h1 className="font-heading text-3xl font-semibold">Your details</h1>
          <Link href={back} className="mt-1 inline-block text-sm text-primary hover:underline">
            Change room or dates
          </Link>
          <div className="mt-6">
            <BookingForm
              slug={tenant.slug}
              roomType={roomType.id}
              plan={plan.id}
              from={search.from}
              to={search.to}
              adults={search.adults}
              breakfast={breakfast}
              breakfastIncluded={plan.includes_breakfast}
              breakfastOnHref={toggleHref(true)}
              breakfastOffHref={toggleHref(false)}
              total={quote.total}
              currency={tenant.currency}
            />
          </div>
        </div>

        <aside className="order-first h-fit rounded-xl border bg-background p-4 lg:order-none lg:sticky lg:top-20" data-testid="price-summary">
          <h2 className="font-medium">{roomType.name}</h2>
          <p className="text-sm text-muted-foreground">{plan.name}</p>
          <p className="mt-2 text-sm">
            {formatDay(search.from)} to {formatDay(search.to)} · {search.adults} adult{search.adults > 1 ? "s" : ""}
          </p>
          <dl className="mt-4 grid gap-1.5 text-sm">
            {grouped.map((g) => (
              <div key={g.label} className="flex justify-between">
                <dt className="text-muted-foreground">{g.label}</dt>
                <dd>{formatMoney(g.amount, tenant.currency)}</dd>
              </div>
            ))}
            <div className="mt-2 flex justify-between border-t pt-2 text-base font-semibold">
              <dt>Total</dt>
              <dd data-testid="quote-total">{formatMoney(quote.total, tenant.currency)}</dd>
            </div>
          </dl>
          <p className="mt-3 text-xs text-muted-foreground">
            {plan.refundable ? "Free cancellation until 24 hours before arrival." : "Non-refundable."} Taxes are illustrative.
          </p>
        </aside>
      </div>
    </div>
  );
}
