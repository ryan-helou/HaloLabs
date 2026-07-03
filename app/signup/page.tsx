import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import AuthForm from "@/components/AuthForm";
import { auth } from "@/lib/auth";

export const metadata: Metadata = { title: "Create account · HaloLabs" };
export const dynamic = "force-dynamic";

export default async function SignupPage() {
  const session = await auth();
  if (session?.user) redirect("/profiles");

  return (
    <div className="mx-auto max-w-md px-2 py-16">
      <p className="font-mono text-[10px] uppercase tracking-label text-ink-soft">
        HaloLabs /
      </p>
      <h1 className="mt-3 font-display text-4xl font-medium tracking-tight text-ink">
        Create your account
      </h1>
      <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">
        A free account holds your plan and lets you unlock the full report when
        you&apos;re ready. 18+ only.
      </p>
      <div className="mt-8">
        <Suspense fallback={null}>
          <AuthForm mode="signup" />
        </Suspense>
      </div>
    </div>
  );
}
