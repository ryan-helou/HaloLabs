import { Suspense } from "react";
import type { Metadata } from "next";
import CaptureFlow from "@/components/CaptureFlow";

export const metadata: Metadata = {
  title: "Add photos · LookLab",
};

export default function StartPhotosPage() {
  return (
    <div className="py-10 sm:py-14">
      {/* useSearchParams in CaptureFlow requires a Suspense boundary. */}
      <Suspense
        fallback={
          <div className="flex justify-center py-24">
            <span className="h-10 w-10 animate-spin rounded-full border-2 border-line border-t-pine" />
          </div>
        }
      >
        <CaptureFlow />
      </Suspense>
    </div>
  );
}
