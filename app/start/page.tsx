import type { Metadata } from "next";
import FreeScanStart from "@/components/FreeScanStart";

export const metadata: Metadata = {
  title: "Start your free scan · HaloLabs",
};

// The free-scan entry: no signup, no questionnaire — establish a guest session
// and go straight to guided photos.
export default function StartPage() {
  return <FreeScanStart />;
}
