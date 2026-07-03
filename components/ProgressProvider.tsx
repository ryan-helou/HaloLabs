"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";
import type { ProgressEntry } from "@/lib/types";
import { useToast } from "./Toast";

/**
 * One source of truth for check-off state across the whole report, so a move
 * checked in the glance stays checked in the roadmap (and vice versa). Writes
 * are optimistic with rollback; the API call is fire-and-forget. Progress
 * tracks the suggestion — like every tag in the app, never the person.
 */
interface ProgressCtx {
  isDone: (suggestionId: string) => boolean;
  toggle: (suggestionId: string) => void;
  progress: Record<string, ProgressEntry>;
}

const Ctx = createContext<ProgressCtx | null>(null);

export function ProgressProvider({
  personId,
  initial,
  children,
}: {
  personId: string;
  initial: Record<string, ProgressEntry>;
  children: ReactNode;
}) {
  const [progress, setProgress] =
    useState<Record<string, ProgressEntry>>(initial);
  const toast = useToast();

  const toggle = useCallback(
    (suggestionId: string) => {
      setProgress((prev) => {
        const next = !(prev[suggestionId]?.done ?? false);
        const optimistic = {
          ...prev,
          [suggestionId]: { done: next, doneAt: new Date().toISOString() },
        };
        const revert = () => {
          setProgress(prev);
          toast({ kind: "error", message: "Couldn't save that — check your connection." });
        };
        fetch("/api/progress", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ personId, suggestionId, done: next }),
        })
          .then((res) => {
            if (!res.ok) revert();
          })
          .catch(revert);
        return optimistic;
      });
    },
    [personId, toast]
  );

  const isDone = useCallback(
    (suggestionId: string) => progress[suggestionId]?.done ?? false,
    [progress]
  );

  return (
    <Ctx.Provider value={{ isDone, toggle, progress }}>{children}</Ctx.Provider>
  );
}

export function useProgress(): ProgressCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useProgress must be used within a ProgressProvider");
  return ctx;
}
