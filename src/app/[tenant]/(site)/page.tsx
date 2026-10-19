import Link from "next/link";
import { Star } from "lucide-react";
import { getTenant } from "@/features/platform/tenant";
import { getFromPrices, getSiteContent, listRoomTypes } from "@/features/website/queries";
import { SearchForm } from "@/features/website/components/search-form";
import { RoomVisual } from "@/features/website/components/room-visual";
import { formatMoney } from "@/lib/format";

/** Public home: hero with search, highlights, rooms, offers and reviews (Block 2 cut: no gallery page). */
export default async function SiteHome({ params }: PageProps<"/[tenant]">) {
  const tenant = await getTenant((await params).tenant);
  const [content, rooms, fromPrices] = await Promise.all([getSiteContent(tenant), listRoomTypes(tenant), getFromPrices(tenant)]);
  const highlights = content.filter((c) => c.kind === "page" && c.data.section === "highlight");
  const offers = content.filter((c) => c.kind === "offer");
  const reviews = content.filter((c) => c.kind === "review");

  return (
    <>
      <section
        className="pt-16 pb-10 text-[var(--tenant-primary-foreground)] sm:pt-24"
        style={{
          background:
            "linear-gradient(135deg, var(--tenant-primary), color-mix(in oklch, var(--tenant-primary) 55%, var(--tenant-accent)))",
        }}
      >
        <div className="mx-auto max-w-6xl px-4">
          <h1 className="max-w-2xl text-4xl leading-tight font-semibold sm:text-5xl" data-testid="site-hero-title">
            {tenant.name}
          </h1>
          <p className="mt-3 max-w-xl text-lg opacity-90">{tenant.theme.tagline}</p>
          <div className="mt-8 max-w-4xl">
            <SearchForm slug={tenant.slug} />
          </div>
          <p className="mt-3 text-sm opacity-80">Best rate guaranteed when you book direct.</p>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-6xl gap-4 px-4 py-10 sm:grid-cols-3">
        {highlights.map((h) => (
          <div key={h.id}>
            <h2 className="font-heading text-lg font-semibold">{h.title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{h.body}</p>
          </div>
        ))}
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 pb-10">
        <div className="flex items-end justify-between">
          <h2 className="font-heading text-2xl font-semibold">Rooms and suites</h2>
          <Link href={`/${tenant.slug}/rooms`} className="text-sm text-primary hover:underline">
            All rooms
          </Link>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rooms.slice(0, 3).map((r) => (
            <article key={r.id} className="rounded-xl border bg-background p-3">
              <RoomVisual name={r.name} className="h-36" />
              <h3 className="mt-3 font-medium">{r.name}</h3>
              <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{r.description}</p>
              {fromPrices.has(r.id) && (
                <p className="mt-2 text-sm">
                  From <strong>{formatMoney(fromPrices.get(r.id)!, tenant.currency)}</strong> / night
                </p>
              )}
            </article>
          ))}
        </div>
      </section>

      <section id="offers" className="bg-muted/60 py-10">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="font-heading text-2xl font-semibold">Offers</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {offers.map((o) => (
              <article key={o.id} className="rounded-xl border bg-background p-4">
                <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-medium">{String(o.data.badge)}</span>
                <h3 className="mt-2 font-medium">{o.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{o.body}</p>
                <p className="mt-3 text-sm">
                  From <strong>{formatMoney(Number(o.data.price), tenant.currency)}</strong>
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-10">
        <h2 className="font-heading text-2xl font-semibold">What guests say</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {reviews.map((r) => (
            <figure key={r.id} className="rounded-xl border bg-background p-4">
              <div className="flex gap-0.5 text-[var(--tenant-accent)]" aria-label={`${r.data.rating} out of 5`}>
                {Array.from({ length: Number(r.data.rating) }, (_, i) => (
                  <Star key={i} className="size-4 fill-current" />
                ))}
              </div>
              <blockquote className="mt-2 text-sm">{r.title}</blockquote>
              <figcaption className="mt-2 text-xs text-muted-foreground">
                {String(r.data.author)}, {String(r.data.country)}
              </figcaption>
            </figure>
          ))}
        </div>
      </section>
    </>
  );
}
