"use client";

import { useEffect } from "react";
import { track, type TrackEvent } from "@/lib/track";

/** Fire a funnel event once when this mounts — for server-rendered milestones
 * like the post-checkout "membership active" return. */
export default function TrackOnMount({ event }: { event: TrackEvent }) {
  useEffect(() => {
    track(event);
  }, [event]);
  return null;
}
