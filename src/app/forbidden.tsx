import Link from "next/link";

export default function Forbidden() {
  return (
    <div className="mx-auto max-w-md px-4 py-24 text-center" data-testid="forbidden">
      <h1 className="text-2xl font-semibold">No access to this hotel</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        This persona belongs to a different hotel. Each hotel&apos;s data is isolated from every other hotel.
      </p>
      <Link href="/demo" className="mt-4 inline-block text-sm underline">
        Back to the demo launcher
      </Link>
    </div>
  );
}
