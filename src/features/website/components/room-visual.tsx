import { BedDouble } from "lucide-react";

/**
 * Placeholder room image in the tenant's colours. Swap for credited free-license stock
 * (docs/CREDITS.md) when photos are sourced.
 */
export function RoomVisual({ name, className = "" }: { name: string; className?: string }) {
  return (
    <div
      className={`flex items-end justify-between rounded-lg p-3 text-[var(--tenant-primary-foreground)] ${className}`}
      style={{
        background:
          "linear-gradient(140deg, var(--tenant-primary), color-mix(in oklch, var(--tenant-primary) 60%, var(--tenant-accent)))",
      }}
      role="img"
      aria-label={`${name} (illustration)`}
    >
      <span className="text-xs opacity-80">{name}</span>
      <BedDouble className="size-6 opacity-70" />
    </div>
  );
}
