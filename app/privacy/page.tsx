import type { Metadata } from "next";

export const metadata: Metadata = { title: "Privacy · HaloLabs" };

const UPDATED = "July 3, 2026";

export default function PrivacyPage() {
  return (
    <article className="mx-auto max-w-2xl px-2 py-16">
      <p className="font-mono text-[10px] uppercase tracking-label text-ink-soft">
        HaloLabs /
      </p>
      <h1 className="mt-3 font-display text-4xl font-medium tracking-tight text-ink">
        Privacy &amp; biometric data
      </h1>
      <p className="mt-3 text-sm text-ink-soft">Last updated {UPDATED}</p>

      <div className="mt-8 space-y-6 text-[15px] leading-relaxed text-ink">
        <section>
          <h2 className="font-display text-xl text-ink">What we collect</h2>
          <p className="mt-2 text-ink-soft">
            To produce your plan we collect: the photos you upload, the
            onboarding answers you provide (goals, routine time, budget,
            preferences), your email address, and basic account data. We do not
            buy data about you or track you across other sites.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl text-ink">
            Facial images &amp; biometric consent
          </h2>
          <p className="mt-2 text-ink-soft">
            Your photos contain facial imagery. By uploading, you consent to
            HaloLabs processing those images solely to generate your grooming
            analysis and plan. We do{" "}
            <span className="text-ink">not</span> use them to identify you, sell
            or share them, build a face-recognition database, or train models.
            Where laws such as the Illinois Biometric Information Privacy Act
            (BIPA) apply, this is your informed written consent, and you may
            withdraw it at any time by deleting your photos or account.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl text-ink">Where photos are stored</h2>
          <p className="mt-2 text-ink-soft">
            Uploaded photos are stored in encrypted cloud object storage
            (Cloudflare R2) and served only to you through your authenticated
            session. Your analysis results are stored in our database, tied to
            your account.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl text-ink">Retention &amp; deletion</h2>
          <p className="mt-2 text-ink-soft">
            You can delete individual photos or your entire account at any time.
            Deleting your account removes your photos from storage and your
            personal data from our database. We retain what we are legally
            required to (e.g. billing records) for as long as the law requires.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl text-ink">Payments</h2>
          <p className="mt-2 text-ink-soft">
            Subscriptions are processed by Stripe. We never see or store your
            full card details; Stripe holds your payment information under its
            own privacy terms.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl text-ink">Your choices</h2>
          <p className="mt-2 text-ink-soft">
            You may request access to, correction of, or deletion of your data,
            and you may withdraw biometric consent, by contacting us at{" "}
            <span className="text-ink">privacy@halolabs.app</span>. HaloLabs is
            for adults 18 and older.
          </p>
        </section>

        <p className="border-t border-line pt-6 text-xs text-ink-soft">
          This page describes our practices in plain language and is not legal
          advice. If a formal, jurisdiction-specific policy is required for your
          launch, have counsel review it.
        </p>
      </div>
    </article>
  );
}
