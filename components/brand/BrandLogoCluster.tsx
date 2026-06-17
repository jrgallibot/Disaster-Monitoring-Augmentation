import type { ReactNode } from "react";
import { BAGONG_PILIPINAS_LOGO_SRC, DSWD_LOGO_SRC } from "@/lib/branding";
import { cn } from "@/lib/utils";
import {
  BRAND_LOGO_FRAME,
  BRAND_LOGO_GAP,
  BRAND_MARK_PX,
  type BrandLogoSize,
} from "@/components/brand/brand-logo-sizes";
import { SystemLogoMark } from "@/components/brand/SystemLogoMark";

interface BrandLogoClusterProps {
  size?: BrandLogoSize;
  showPartnerLogos?: boolean;
  showQrtMark?: boolean;
  className?: string;
}

function LogoFrame({
  frameClass,
  children,
  label,
}: {
  frameClass: string;
  children: ReactNode;
  label: string;
}) {
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden",
        frameClass
      )}
      title={label}
    >
      {children}
    </div>
  );
}

/** Bagong Pilipinas + DSWD + QRT mark in matching square frames */
export function BrandLogoCluster({
  size = "md",
  showPartnerLogos = true,
  showQrtMark = true,
  className,
}: BrandLogoClusterProps) {
  const frameClass = BRAND_LOGO_FRAME[size];
  const markPx = BRAND_MARK_PX[size];

  return (
    <div className={cn("flex items-center", BRAND_LOGO_GAP[size], className)}>
      {showPartnerLogos && (
        <>
          <LogoFrame frameClass={frameClass} label="Bagong Pilipinas">
            <img
              src={BAGONG_PILIPINAS_LOGO_SRC}
              alt="Bagong Pilipinas"
              className="max-h-full max-w-full object-contain"
              draggable={false}
            />
          </LogoFrame>
          <LogoFrame frameClass={frameClass} label="DSWD">
            <img
              src={DSWD_LOGO_SRC}
              alt="Department of Social Welfare and Development"
              className="max-h-full max-w-full object-contain"
              draggable={false}
            />
          </LogoFrame>
        </>
      )}
      {showQrtMark && (
        <LogoFrame frameClass={frameClass} label="QRT Monitoring System">
          <SystemLogoMark size={markPx} className="max-h-full max-w-full" />
        </LogoFrame>
      )}
    </div>
  );
}
