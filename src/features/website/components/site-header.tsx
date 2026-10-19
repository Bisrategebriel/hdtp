import Link from "next/link";
import type { Tenant } from "@/features/platform/tenant";
import { buttonVariants } from "@/components/ui/button";

/** Tenant-branded header for every public page. */
export function SiteHeader({ tenant }: { tenant: Tenant }) {
  const base = `/${tenant.slug}`;
  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
        <Link href={base} className="font-heading text-2xl font-semibold text-primary">
          {tenant.theme.logoText}
        </Link>
        <nav className="flex items-center gap-4 text-sm" aria-label="Site">
          <Link href={`${base}/rooms`} className="hidden hover:text-primary sm:inline">
            Rooms
          </Link>
          <Link href={`${base}#offers`} className="hidden hover:text-primary sm:inline">
            Offers
          </Link>
          <span className="hidden rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground md:inline" data-testid="demo-data-chip">
            Demo data
          </span>
          <Link href={`${base}/book`} className={buttonVariants({ size: "lg" })} data-testid="book-now">
            Book now
          </Link>
        </nav>
      </div>
    </header>
  );
}
