"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

/**
 * A small, self-contained toast system for transient feedback (a save that
 * failed, photos that landed). Themed to the HaloLabs palette, top-right so it
 * clears the centered header and the bottom paywall bar, and announced to
 * screen readers via aria-live. useToast() is a no-op outside a provider, so
 * components that call it never crash if one isn't mounted.
 */

type ToastKind = "success" | "error" | "info";
interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
}

type ToastInput = string | { kind?: ToastKind; message: string };

const ToastCtx = createContext<((t: ToastInput) => void) | null>(null);

const DISMISS_MS = 4200;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);
  const timers = useRef<Record<number, ReturnType<typeof setTimeout>>>({});

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timers.current[id];
    if (timer) {
      clearTimeout(timer);
      delete timers.current[id];
    }
  }, []);

  const push = useCallback(
    (input: ToastInput) => {
      const t: Toast =
        typeof input === "string"
          ? { id: nextId.current++, kind: "info", message: input }
          : { id: nextId.current++, kind: input.kind ?? "info", message: input.message };
      setToasts((prev) => [...prev.slice(-3), t]); // cap the stack
      timers.current[t.id] = setTimeout(() => dismiss(t.id), DISMISS_MS);
    },
    [dismiss]
  );

  useEffect(() => {
    const store = timers.current;
    return () => {
      Object.values(store).forEach(clearTimeout);
    };
  }, []);

  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed inset-x-0 top-20 z-50 flex flex-col items-center gap-2 px-4 sm:inset-x-auto sm:right-4 sm:items-end"
      >
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

const ACCENT: Record<ToastKind, string> = {
  success: "bg-pine",
  error: "bg-clay",
  info: "bg-ink-soft",
};

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  return (
    <div
      role={toast.kind === "error" ? "alert" : "status"}
      className="rise pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border border-line bg-surface/95 px-4 py-3 shadow-float backdrop-blur-md"
    >
      <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${ACCENT[toast.kind]}`} />
      <p className="min-w-0 flex-1 text-sm leading-snug text-ink">{toast.message}</p>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss"
        className="-mr-1 -mt-0.5 shrink-0 rounded p-1 text-ink-soft transition-colors hover:text-ink"
      >
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round">
          <path d="M18 6 6 18M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

/** Fire a toast. No-op (returns quietly) if no ToastProvider is mounted. */
export function useToast(): (t: ToastInput) => void {
  const ctx = useContext(ToastCtx);
  return ctx ?? (() => {});
}
