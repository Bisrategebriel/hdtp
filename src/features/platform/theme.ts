import { z } from "zod";

/** Font pairs are self-hosted via next/font so the offline fallback still renders them. */
export const FONT_PRESETS = ["modern", "classic", "editorial"] as const;

export const themeSchema = z.object({
  fontPreset: z.enum(FONT_PRESETS),
  colors: z.object({
    primary: z.string(),
    primaryForeground: z.string(),
    accent: z.string(),
    background: z.string(),
    foreground: z.string(),
    muted: z.string(),
  }),
  logoText: z.string(),
  tagline: z.string(),
  heroImage: z.string(),
});

export type TenantTheme = z.infer<typeof themeSchema>;

/** CSS custom properties injected at the tenant root; every component reads these. */
export function themeToCssVars(theme: TenantTheme): Record<string, string> {
  const c = theme.colors;
  return {
    "--tenant-primary": c.primary,
    "--tenant-primary-foreground": c.primaryForeground,
    "--tenant-accent": c.accent,
    "--tenant-background": c.background,
    "--tenant-foreground": c.foreground,
    "--tenant-muted": c.muted,
  };
}
