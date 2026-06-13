import Image from "next/image";
import { User } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmployeeAvatarProps {
  photoUrl?: string | null;
  size?: number;
  className?: string;
}

export function EmployeeAvatar({ photoUrl, size = 40, className }: EmployeeAvatarProps) {
  return (
    <div
      className={cn(
        "rounded-full overflow-hidden bg-dswd-light border border-dswd-border flex items-center justify-center shrink-0",
        className
      )}
      style={{ width: size, height: size }}
    >
      {photoUrl ? (
        <Image
          src={photoUrl}
          alt="Employee profile"
          width={size}
          height={size}
          className="h-full w-full object-cover"
          unoptimized
        />
      ) : (
        <User className="text-dswd-navy" style={{ width: size * 0.45, height: size * 0.45 }} />
      )}
    </div>
  );
}
