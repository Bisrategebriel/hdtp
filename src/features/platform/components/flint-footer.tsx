import { flintBrand } from "@/config/flint-brand";

/** Fixed Flint mark on every tenant site, portal and console page (B2). */
export function FlintFooter() {
  return (
    <footer className="flint-scope mt-auto border-t border-black/10 px-4 py-3 text-center text-xs text-black/60">
      <span data-testid="flint-powered-by">{flintBrand.poweredBy}</span>
      <span className="mx-2" aria-hidden>
        ·
      </span>
      <span>Concept platform with fictional hotels and demo data</span>
    </footer>
  );
}
