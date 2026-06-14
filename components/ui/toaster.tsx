"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Info, X, XCircle } from "lucide-react";
import { dismissToast, subscribeToasts, type ToastItem } from "@/lib/toast";
import { cn } from "@/lib/utils";

const typeStyles: Record<
  ToastItem["type"],
  { container: string; icon: typeof CheckCircle2 }
> = {
  success: {
    container: "border-green-200 bg-green-50 text-green-900 shadow-green-100",
    icon: CheckCircle2,
  },
  error: {
    container: "border-red-200 bg-red-50 text-red-900 shadow-red-100",
    icon: XCircle,
  },
  info: {
    container: "border-blue-200 bg-blue-50 text-blue-900 shadow-blue-100",
    icon: Info,
  },
};

function ToastCard({ item }: { item: ToastItem }) {
  const styles = typeStyles[item.type];
  const Icon = styles.icon;

  return (
    <div
      role="alert"
      className={cn(
        "pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-lg border px-4 py-3 shadow-lg animate-in slide-in-from-right-full fade-in duration-300",
        styles.container
      )}
    >
      <Icon className="h-5 w-5 shrink-0 mt-0.5" aria-hidden />
      <p className="flex-1 text-sm font-medium leading-snug">{item.message}</p>
      <button
        type="button"
        onClick={() => dismissToast(item.id)}
        className="shrink-0 rounded p-0.5 opacity-70 hover:opacity-100 transition-opacity"
        aria-label="Dismiss notification"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export function Toaster() {
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => subscribeToasts(setItems), []);

  if (items.length === 0) return null;

  return (
    <div
      aria-live="polite"
      aria-atomic="false"
      className="pointer-events-none fixed top-4 right-4 z-[100] flex w-full max-w-sm flex-col gap-2 sm:top-6 sm:right-6"
    >
      {items.map((item) => (
        <ToastCard key={item.id} item={item} />
      ))}
    </div>
  );
}
