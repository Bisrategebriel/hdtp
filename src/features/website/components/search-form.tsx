import Form from "next/form";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { addDays, hotelToday } from "@/lib/dates";
import type { Search } from "../schema";

const fieldClass =
  "h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

/** Dates and guests. A plain GET form to /book, so results are a shareable URL. */
export function SearchForm({ slug, search, compact = false }: { slug: string; search?: Search; compact?: boolean }) {
  const today = hotelToday();
  const from = search?.from ?? today;
  return (
    <Form
      action={`/${slug}/book`}
      className={`grid gap-3 rounded-xl border bg-background p-4 text-foreground shadow-sm ${compact ? "sm:grid-cols-4" : "sm:grid-cols-[1fr_1fr_auto_auto]"}`}
      data-testid="search-form"
    >
      <div className="grid gap-1.5">
        <Label htmlFor="from">Check-in</Label>
        <input id="from" name="from" type="date" min={today} defaultValue={from} className={fieldClass} required />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="to">Check-out</Label>
        <input id="to" name="to" type="date" min={addDays(today, 1)} defaultValue={search?.to ?? addDays(from, 1)} className={fieldClass} required />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="adults">Adults</Label>
        <select id="adults" name="adults" defaultValue={String(search?.adults ?? 2)} className={fieldClass}>
          {[1, 2, 3, 4].map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </div>
      <Button type="submit" size="lg" className="h-10 self-end px-5">
        Check availability
      </Button>
    </Form>
  );
}
