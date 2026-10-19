import Link from "next/link";
import { getTenant, requireFeature } from "@/features/platform/tenant";
import { searchStay } from "@/features/website/queries";
import { parseSearch } from "@/features/website/schema";
import { SearchForm } from "@/features/website/components/search-form";
import { RoomVisual } from "@/features/website/components/room-visual";
import { BookingSteps } from "@/features/website/components/booking-steps";
import { buttonVariants } from "@/components/ui/button";
import { formatDay } from "@/lib/dates";
import { formatMoney } from "@/lib/format";

export const metadata = { title: "Book" };

/** Booking step 1: dates and guests, live availability, rates per plan (B3). */
export default async function BookPage({ params, searchParams }: PageProps<"/[tenant]/book">) {
  const tenant = await getTenant((await params).tenant);
  await requireFeature(tenant, "website.booking");
  const search = parseSearch(await searchParams);
  const results = await searchStay(tenant, search);
  const base = new URLSearchParams({ from: search.from, to: search.to, adults: String(search.adults) });

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8">
      <BookingSteps current={1} />
      <h1 className="mt-4 font-heading text-3xl font-semibold">Choose your room</h1>
      <p className="mt-1 text-sm text-muted-foreground" data-testid="search-summary">
        {formatDay(search.from)} to {formatDay(search.to)} · {search.nights} night{search.nights > 1 ? "s" : ""} ·{" "}
        {search.adults} adult{search.adults > 1 ? "s" : ""}
      </p>
      <div className="mt-4">
        <SearchForm slug={tenant.slug} search={search} compact />
      </div>

      <div className="mt-6 grid gap-4">
        {results.map(({ roomType, available, plans }) => {
          const soldOut = available < 1 || plans.length === 0;
          return (
            <article key={roomType.id} className="rounded-xl border bg-background p-4" data-testid={`result-${roomType.code}`}>
              <div className="grid gap-4 sm:grid-cols-[200px_1fr]">
                <RoomVisual name={roomType.name} className="h-32" />
                <div>
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h2 className="text-xl font-medium">{roomType.name}</h2>
                    <span className={`text-sm ${soldOut ? "text-destructive" : available <= 3 ? "font-medium text-[var(--tenant-accent)]" : "text-muted-foreground"}`}>
                      {soldOut ? "Sold out" : available <= 3 ? `Only ${available} left` : `${available} available`}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {roomType.bed} bed · {roomType.size_sqm} m² · up to {roomType.max_adults} adults
                  </p>
                  {!soldOut && (
                    <ul className="mt-3 divide-y rounded-lg border">
                      {plans.map(({ plan, roomTotal }) => (
                        <li key={plan.id} className="flex flex-wrap items-center justify-between gap-3 p-3" data-testid={`plan-${roomType.code}-${plan.code}`}>
                          <div>
                            <div className="font-medium">{plan.name}</div>
                            <div className="text-xs text-muted-foreground">{plan.description}</div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <div className="font-semibold">{formatMoney(roomTotal, tenant.currency)}</div>
                              <div className="text-xs text-muted-foreground">
                                {search.nights} night{search.nights > 1 ? "s" : ""}, before service and VAT
                              </div>
                            </div>
                            <Link
                              href={`/${tenant.slug}/book/details?${new URLSearchParams({ ...Object.fromEntries(base), roomType: roomType.id, plan: plan.id })}`}
                              className={buttonVariants()}
                            >
                              Select
                            </Link>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
