import Link from "next/link";
import { getTenant } from "@/features/platform/tenant";

/** Public home. The full site (rooms, offers, gallery, booking) lands on Day 4 (TASKS.md). */
export default async function SiteHome({ params }: PageProps<"/[tenant]">) {
  const tenant = await getTenant((await params).tenant);
  return (
    <main className="flex flex-1 flex-col">
      <header className="flex items-center justify-between px-6 py-4">
        <span className="font-heading text-2xl font-semibold" style={{ color: "var(--tenant-primary)" }}>
          {tenant.theme.logoText}
        </span>
        <nav className="flex gap-5 text-sm">
          <Link href={`/${tenant.slug}`}>Home</Link>
        </nav>
      </header>
      <section
        className="flex flex-1 flex-col items-start justify-center gap-4 px-6 py-24 text-[var(--tenant-primary-foreground)] sm:px-16"
        style={{
          background: "linear-gradient(135deg, var(--tenant-primary), color-mix(in oklch, var(--tenant-primary) 55%, var(--tenant-accent)))",
        }}
      >
        <h1 className="max-w-2xl text-4xl font-semibold leading-tight sm:text-5xl" data-testid="site-hero-title">
          {tenant.name}
        </h1>
        <p className="max-w-xl text-lg opacity-90">{tenant.theme.tagline}</p>
      </section>
    </main>
  );
}
