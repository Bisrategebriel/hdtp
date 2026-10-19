import Link from "next/link";
import { getTenant } from "@/features/platform/tenant";
import { getFromPrices, listRoomTypes } from "@/features/website/queries";
import { RoomVisual } from "@/features/website/components/room-visual";
import { buttonVariants } from "@/components/ui/button";
import { formatMoney } from "@/lib/format";

export const metadata = { title: "Rooms" };

export default async function RoomsPage({ params }: PageProps<"/[tenant]/rooms">) {
  const tenant = await getTenant((await params).tenant);
  const [rooms, fromPrices] = await Promise.all([listRoomTypes(tenant), getFromPrices(tenant)]);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10">
      <h1 className="font-heading text-3xl font-semibold">Rooms and suites</h1>
      <div className="mt-6 grid gap-6">
        {rooms.map((r) => (
          <article key={r.id} className="grid gap-4 rounded-xl border bg-background p-4 sm:grid-cols-[240px_1fr_auto]" data-testid={`room-${r.code}`}>
            <RoomVisual name={r.name} className="h-40" />
            <div>
              <h2 className="text-xl font-medium">{r.name}</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {r.bed} bed · {r.size_sqm} m² · up to {r.max_adults} adults
              </p>
              <p className="mt-2 text-sm">{r.description}</p>
              <ul className="mt-3 flex flex-wrap gap-1.5">
                {r.amenities.map((a) => (
                  <li key={a} className="rounded-full bg-muted px-2 py-0.5 text-xs">
                    {a}
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex flex-col items-start gap-2 sm:items-end">
              {fromPrices.has(r.id) && (
                <p className="text-sm">
                  From <strong>{formatMoney(fromPrices.get(r.id)!, tenant.currency)}</strong> / night
                </p>
              )}
              <Link href={`/${tenant.slug}/book`} className={buttonVariants()}>
                Check dates
              </Link>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
