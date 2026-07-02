import { promises as fs } from "node:fs";
import path from "node:path";
import { resolvePersonDir } from "./paths";
import type { OnboardingProfile } from "./types";

/** Read data/people/<id>/profile.json, or null if absent/invalid. */
export async function loadProfile(
  personId: string
): Promise<OnboardingProfile | null> {
  const dir = resolvePersonDir(personId);
  if (!dir) return null;
  try {
    const raw = await fs.readFile(path.join(dir, "profile.json"), "utf8");
    const parsed = JSON.parse(raw) as OnboardingProfile;
    return parsed && parsed.ageConfirmed18Plus === true ? parsed : null;
  } catch {
    return null;
  }
}
