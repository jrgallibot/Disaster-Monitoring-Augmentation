export type ToastType = "success" | "error" | "info";

export type ToastItem = {
  id: string;
  message: string;
  type: ToastType;
};

type ToastListener = (toasts: ToastItem[]) => void;

const DEFAULT_DURATION_MS = 4500;

let toasts: ToastItem[] = [];
const listeners = new Set<ToastListener>();
const dismissTimers = new Map<string, ReturnType<typeof setTimeout>>();

function emit() {
  listeners.forEach((listener) => listener([...toasts]));
}

function scheduleDismiss(id: string, duration = DEFAULT_DURATION_MS) {
  const existing = dismissTimers.get(id);
  if (existing) clearTimeout(existing);

  const timer = setTimeout(() => {
    dismissToast(id);
  }, duration);
  dismissTimers.set(id, timer);
}

function addToast(message: string, type: ToastType, duration?: number) {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const item: ToastItem = { id, message, type };
  toasts = [item, ...toasts].slice(0, 5);
  emit();
  scheduleDismiss(id, duration);
  return id;
}

export function dismissToast(id: string) {
  const timer = dismissTimers.get(id);
  if (timer) {
    clearTimeout(timer);
    dismissTimers.delete(id);
  }
  toasts = toasts.filter((toast) => toast.id !== id);
  emit();
}

export function subscribeToasts(listener: ToastListener) {
  listeners.add(listener);
  listener([...toasts]);
  return () => {
    listeners.delete(listener);
  };
}

export const toast = {
  success: (message: string, duration?: number) => addToast(message, "success", duration),
  error: (message: string, duration?: number) => addToast(message, "error", duration ?? 6000),
  info: (message: string, duration?: number) => addToast(message, "info", duration),
};
