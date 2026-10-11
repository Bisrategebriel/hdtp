import { flintBrand } from "@/config/flint-brand";

/** Fixed Flint layer: login, landing and demo launcher. Never takes tenant theming. */
export default function FlintLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flint-scope flex min-h-full flex-1 flex-col" style={{ background: "#f8fafc", color: flintBrand.colors.ink }}>
      <header className="px-6 py-4" style={{ background: flintBrand.colors.surface, color: flintBrand.colors.onSurface }}>
        <span className="font-semibold">{flintBrand.company}</span>
        <span className="ml-2 text-sm opacity-70">{flintBrand.product}</span>
      </header>
      <main className="flex flex-1 flex-col">{children}</main>
      <footer className="px-6 py-3 text-center text-xs opacity-60">
        {flintBrand.company} · Concept platform with fictional hotels and demo data
      </footer>
    </div>
  );
}
