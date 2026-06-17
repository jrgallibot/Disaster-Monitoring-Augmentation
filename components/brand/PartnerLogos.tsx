import { BrandLogoCluster } from "@/components/brand/BrandLogoCluster";
import type { BrandLogoSize } from "@/components/brand/brand-logo-sizes";

interface PartnerLogosProps {
  size?: BrandLogoSize;
  className?: string;
}

/** @deprecated Use BrandLogoCluster — partner marks only, no QRT shield */
export function PartnerLogos({ size = "md", className }: PartnerLogosProps) {
  return (
    <BrandLogoCluster size={size} showPartnerLogos showQrtMark={false} className={className} />
  );
}
