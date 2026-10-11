import type { ConceptSample } from "./concept-data";

/** Renders a concept screen's sample data. Buttons are deliberately absent (no dead clicks). */
export function ConceptVisual({ sample }: { sample: ConceptSample }) {
  switch (sample.kind) {
    case "table":
      return (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                {sample.columns.map((c) => (
                  <th key={c} className="px-3 py-2 font-medium">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sample.rows.map((row, i) => (
                <tr key={i} className="border-b last:border-0">
                  {row.map((cell, j) => (
                    <td key={j} className="px-3 py-2">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case "bar":
    case "line": {
      const max = Math.max(...sample.points.map((p) => p.value));
      return (
        <div className="flex h-56 items-end gap-2 px-2" role="img" aria-label="Sample trend over 12 months">
          {sample.points.map((p) => (
            <div key={p.label} className="flex flex-1 flex-col items-center gap-1">
              <div
                className={sample.kind === "bar" ? "w-full rounded-t bg-primary/80" : "w-2 rounded-full bg-primary"}
                style={{ height: `${(p.value / max) * 180}px` }}
              />
              <span className="text-[10px] text-muted-foreground">{p.label}</span>
            </div>
          ))}
        </div>
      );
    }
    case "kanban":
      return (
        <div className="grid gap-3 sm:grid-cols-3">
          {sample.columns.map((col) => (
            <div key={col.title} className="rounded-lg bg-muted p-3">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{col.title}</div>
              <div className="flex flex-col gap-2">
                {col.cards.map((card, i) => (
                  <div key={i} className="rounded-md border bg-background p-2 text-sm">
                    {card}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      );
    case "timeline":
      return (
        <ol className="relative ml-3 border-l">
          {sample.items.map((item, i) => (
            <li key={i} className="mb-4 ml-4">
              <div className="absolute -left-1.5 mt-1.5 size-3 rounded-full bg-primary" />
              <div className="text-xs text-muted-foreground">{item.when}</div>
              <div className="text-sm">{item.text}</div>
            </li>
          ))}
        </ol>
      );
    case "form":
      return (
        <div className="grid max-w-md gap-3">
          {sample.fields.map((f) => (
            <div key={f} className="grid gap-1">
              <span className="text-xs text-muted-foreground">{f}</span>
              <div className="h-9 rounded-md border bg-muted/50" />
            </div>
          ))}
        </div>
      );
  }
}
