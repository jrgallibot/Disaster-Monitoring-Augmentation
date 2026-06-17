export type BrandLogoSize = "sm" | "md" | "lg" | "xl";

/** Square frame — same footprint for Bagong Pilipinas, DSWD, and QRT mark */
export const BRAND_LOGO_FRAME: Record<BrandLogoSize, string> = {
  sm: "h-9 w-9",
  md: "h-10 w-10 sm:h-11 sm:w-11",
  lg: "h-12 w-12 sm:h-14 sm:w-14",
  xl: "h-14 w-14 sm:h-[4.5rem] sm:w-[4.5rem]",
};

export const BRAND_LOGO_GAP: Record<BrandLogoSize, string> = {
  sm: "gap-1.5",
  md: "gap-2 sm:gap-2.5",
  lg: "gap-2.5 sm:gap-3",
  xl: "gap-3 sm:gap-3.5",
};

/** QRT SVG size (px) — matches frame height at each token */
export const BRAND_MARK_PX: Record<BrandLogoSize, number> = {
  sm: 36,
  md: 44,
  lg: 56,
  xl: 72,
};
