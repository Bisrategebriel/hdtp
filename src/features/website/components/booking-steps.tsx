const STEPS = ["Room", "Your details", "Payment", "Confirmed"];

export function BookingSteps({ current }: { current: 1 | 2 | 3 | 4 }) {
  return (
    <ol className="flex flex-wrap gap-x-4 gap-y-1 text-xs" aria-label="Booking steps">
      {STEPS.map((s, i) => (
        <li key={s} className={i + 1 === current ? "font-semibold text-primary" : i + 1 < current ? "text-foreground" : "text-muted-foreground"} aria-current={i + 1 === current ? "step" : undefined}>
          {i + 1}. {s}
        </li>
      ))}
    </ol>
  );
}
