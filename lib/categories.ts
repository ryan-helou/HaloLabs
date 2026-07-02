import type { AdviceCategory } from "./types";

/**
 * Per-category identity — a muted, cool-leaning palette used consistently
 * across the matrix dots, the legend, and section headers.
 */
export const CATEGORY_META: Record<
  AdviceCategory,
  { label: string; color: string }
> = {
  hair: { label: "Hair", color: "#3F5B6B" }, // slate
  skin: { label: "Skin", color: "#6E8B94" }, // muted teal-grey
  style: { label: "Style", color: "#9C6A4E" }, // muted terracotta
  fitness: { label: "Fitness", color: "#7E8557" }, // muted olive
};
