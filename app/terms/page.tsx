import type { Metadata } from "next";

export const metadata: Metadata = { title: "Terms · HaloLabs" };

const UPDATED = "July 3, 2026";

export default function TermsPage() {
  return (
    <article className="mx-auto max-w-2xl px-2 py-16">
      <p className="font-mono text-[10px] uppercase tracking-label text-ink-soft">
        HaloLabs /
      </p>
      <h1 className="mt-3 font-display text-4xl font-medium tracking-tight text-ink">
        Terms of service
      </h1>
      <p className="mt-3 text-sm text-ink-soft">Last updated {UPDATED}</p>

      <div className="mt-8 space-y-6 text-[15px] leading-relaxed text-ink">
        <section>
          <h2 className="font-display text-xl text-ink">What HaloLabs is</h2>
          <p className="mt-2 text-ink-soft">
            HaloLabs analyzes photos you upload and produces a personalized
            grooming plan — neutral observations plus option-framed suggestions
            for hair, skin, style, and fitness. Products named in a plan are
            examples, not endorsements, and we take no affiliate commission.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl text-ink">Not medical advice</h2>
          <p className="mt-2 text-ink-soft">
            HaloLabs is not a medical, dermatological, or mental-health service.
            Nothing in a plan is a diagnosis, prescription, or treatment. We do
            not offer attractiveness scores, rankings, or surgery advice.
            Prescription-adjacent options are framed as “discuss with a
            professional.” Consult a licensed provider before acting on anything
            health-related.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl text-ink">18+ and your account</h2>
          <p className="mt-2 text-ink-soft">
            You must be 18 or older to use HaloLabs and you confirm this at
            signup. Keep your login secure; you are responsible for activity on
            your account. Only upload photos of yourself that you have the right
            to share.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl text-ink">Subscriptions &amp; billing</h2>
          <p className="mt-2 text-ink-soft">
            Unlocking the full plan is a recurring subscription billed through
            Stripe at the price shown at checkout. It renews until you cancel;
            you can cancel anytime and keep access until the end of the paid
            period, after which the plan re-locks. Fees already charged are
            non-refundable except where required by law.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl text-ink">Acceptable use</h2>
          <p className="mt-2 text-ink-soft">
            Don&apos;t upload other people&apos;s photos without consent, don&apos;t misuse the
            service to harass or demean anyone, and don&apos;t attempt to extract
            ratings or comparisons the product deliberately does not provide.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl text-ink">Disclaimers &amp; liability</h2>
          <p className="mt-2 text-ink-soft">
            The service is provided “as is,” without warranties. To the extent
            permitted by law, HaloLabs is not liable for indirect or
            consequential damages, and our total liability is limited to the
            amount you paid us in the prior 12 months.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl text-ink">Contact</h2>
          <p className="mt-2 text-ink-soft">
            Questions about these terms:{" "}
            <span className="text-ink">support@halolabs.app</span>.
          </p>
        </section>

        <p className="border-t border-line pt-6 text-xs text-ink-soft">
          These terms are a plain-language starting point, not legal advice.
          Have counsel review them before a public launch.
        </p>
      </div>
    </article>
  );
}
