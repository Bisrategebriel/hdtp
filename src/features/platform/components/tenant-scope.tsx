import type { CSSProperties, ReactNode } from "react";
import { FONT_PAIRS } from "@/app/fonts";
import { themeToCssVars, type TenantTheme } from "../theme";

/** Applies a tenant's theme as CSS variables; .tenant-scope maps them onto shadcn tokens. */
export function TenantScope({ theme, children }: { theme: TenantTheme; children: ReactNode }) {
  const fonts = FONT_PAIRS[theme.fontPreset];
  const style = {
    ...themeToCssVars(theme),
    "--font-heading-face": fonts.heading,
    "--font-body": fonts.body,
  } as CSSProperties;
  return (
    <div className="tenant-scope flex min-h-full flex-1 flex-col" style={style} data-theme-preset={theme.fontPreset}>
      {children}
    </div>
  );
}
