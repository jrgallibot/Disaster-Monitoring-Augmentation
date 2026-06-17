import { SYSTEM_NAME, SYSTEM_TAGLINE } from "@/lib/branding";
import { cn } from "@/lib/utils";
import { BrandLogoCluster } from "@/components/brand/BrandLogoCluster";
import { type BrandLogoSize } from "@/components/brand/brand-logo-sizes";

type SystemLogoVariant = "horizontal" | "stacked" | "mark";

interface SystemLogoProps {
  variant?: SystemLogoVariant;
  size?: BrandLogoSize;
  showTagline?: boolean;
  showPartnerLogos?: boolean;
  inverted?: boolean;
  className?: string;
}

const TITLE_SIZES: Record<BrandLogoSize, string> = {
  sm: "text-sm",
  md: "text-base sm:text-lg",
  lg: "text-lg sm:text-xl",
  xl: "text-xl sm:text-2xl",
};

function LogoDivider({ inverted, size }: { inverted?: boolean; size: BrandLogoSize }) {
  const heightClass =
    size === "sm" ? "min-h-9" : size === "md" ? "min-h-10 sm:min-h-11" : size === "lg" ? "min-h-12 sm:min-h-14" : "min-h-14 sm:min-h-[4.5rem]";

  return (
    <div
      className={cn(
        "hidden sm:block w-px shrink-0 self-stretch",
        heightClass,
        inverted ? "bg-white/25" : "bg-dswd-border"
      )}
      aria-hidden
    />
  );
}

export function SystemLogo({
  variant = "horizontal",
  size = "md",
  showTagline = false,
  showPartnerLogos = true,
  inverted = false,
  className,
}: SystemLogoProps) {
  if (variant === "mark") {
    return (
      <BrandLogoCluster
        size={size}
        showPartnerLogos={showPartnerLogos}
        showQrtMark
        className={className}
      />
    );
  }

  const titleClass = cn(
    "font-bold leading-tight tracking-tight",
    TITLE_SIZES[size],
    inverted ? "text-white" : "text-dswd-navy"
  );
  const taglineClass = cn(
    "text-xs sm:text-sm leading-snug",
    inverted ? "text-white/80" : "text-muted-foreground"
  );

  if (variant === "stacked") {
    return (
      <div className={cn("flex flex-col items-center text-center gap-3 sm:gap-4", className)}>
        <BrandLogoCluster size={size} showPartnerLogos={showPartnerLogos} showQrtMark />
        <div className="px-2">
          <p className={titleClass}>{SYSTEM_NAME}</p>
          {(showTagline || variant === "stacked") && (
            <p className={cn(taglineClass, "mt-1 max-w-sm mx-auto")}>{SYSTEM_TAGLINE}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-2 sm:gap-3 min-w-0 max-w-full", className)}>
      <BrandLogoCluster
        size={size}
        showPartnerLogos={showPartnerLogos}
        showQrtMark
        className="shrink-0"
      />
      <LogoDivider inverted={inverted} size={size} />
      <div className="min-w-0">
        <p className={cn(titleClass, "line-clamp-2 sm:line-clamp-1")}>{SYSTEM_NAME}</p>
        {showTagline && (
          <p className={cn(taglineClass, "line-clamp-2 sm:line-clamp-1 mt-0.5")}>{SYSTEM_TAGLINE}</p>
        )}
      </div>
    </div>
  );
}
