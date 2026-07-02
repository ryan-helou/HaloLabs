import { Suspense } from "react";
import type { Metadata } from "next";
import OnboardingWizard from "@/components/OnboardingWizard";

export const metadata: Metadata = {
  title: "Your questionnaire · HaloLabs",
};

export default function QuizPage() {
  return (
    <div className="py-10 sm:py-14">
      {/* useSearchParams in the wizard requires a Suspense boundary. */}
      <Suspense
        fallback={
          <div className="flex justify-center py-24">
            <span className="h-10 w-10 animate-spin rounded-full border-2 border-line border-t-pine" />
          </div>
        }
      >
        <OnboardingWizard />
      </Suspense>
    </div>
  );
}
