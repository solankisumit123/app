/**
 * Design tokens — mirrors `design_guidelines.json` at the project root.
 * Every screen imports from here so the app stays visually consistent.
 */

export const colors = {
  surface: "#F2F3F5",
  onSurface: "#1C1C1E",
  card: "#FFFFFF",
  onSurfaceSecondary: "#1C1C1E",
  surfaceTertiary: "#E5E5EA",
  onSurfaceTertiary: "#3A3A3C",
  surfaceInverse: "#1C1C1E",
  onSurfaceInverse: "#FFFFFF",

  brand: "#38A845",
  brandDark: "#2C8637",
  brandSoft: "#E8F5E9",
  brandTint: "#F0FDF4",
  onBrandPrimary: "#FFFFFF",

  success: "#38A845",
  warning: "#FF9800",
  error: "#F44336",
  info: "#2196F3",
  purple: "#8B5CF6",

  border: "#E5E5EA",
  borderStrong: "#D1D1D6",
  divider: "#E5E5EA",
  track: "#E5E5EA",

  muted: "#6B6B70",
  mutedLight: "#9A9AA0",
};

export const font = {
  sm: 12,
  base: 14,
  lg: 16,
  xl: 20,
  xxl: 24,
  huge: 32,
  giant: 40,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
};

export const radius = {
  sm: 6,
  md: 12,
  lg: 20,
  xl: 28,
  pill: 999,
};

export const shadow = {
  soft: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
  },
  card: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  lifted: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
};

/** Phones stay full-width; tablets/large screens don't stretch cards edge to edge. */
export const maxContentWidth = 640;

export function formatBytes(bytes: number, decimals = 1): string {
  if (!bytes || bytes <= 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(sizes.length - 1, Math.floor(Math.log(bytes) / Math.log(k)));
  const value = bytes / Math.pow(k, i);
  return `${value.toFixed(i === 0 ? 0 : decimals)} ${sizes[i]}`;
}
