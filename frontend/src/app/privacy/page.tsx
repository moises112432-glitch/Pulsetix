export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-2xl py-12">
      <h1 className="mb-2 text-3xl font-bold tracking-tight">Privacy Policy</h1>
      <p className="mb-8 text-sm text-gray-400">Last updated: April 3, 2026</p>
      <div className="flex flex-col gap-6 text-sm leading-relaxed text-gray-600">

        <section>
          <h2 className="mb-2 text-lg font-semibold text-gray-900">1. Information We Collect</h2>
          <p>We collect the following types of information:</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li><strong>Account information:</strong> your name, email address, and password (hashed)</li>
            <li><strong>Google account data:</strong> if you sign in with Google, we receive your name, email, and profile picture</li>
            <li><strong>Payment information:</strong> processed securely by Stripe — we never see or store your card details</li>
            <li><strong>Event data:</strong> events you create, tickets you purchase, and check-in history</li>
            <li><strong>Usage data:</strong> pages visited, actions taken, and device information</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-gray-900">2. How We Use Your Information</h2>
          <p>
            We use your information to provide and improve PulseTix, process ticket purchases,
            send order confirmations and event updates, verify check-ins at events, and
            communicate important updates about events you've purchased tickets for.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-gray-900">3. Information Sharing</h2>
          <p>We share your information only in the following cases:</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li><strong>Event organizers:</strong> your name and email are shared with organizers for events you attend</li>
            <li><strong>Stripe:</strong> payment processing — governed by <a href="https://stripe.com/privacy" className="text-brand hover:underline" target="_blank" rel="noopener noreferrer">Stripe's Privacy Policy</a></li>
            <li><strong>Resend:</strong> email delivery service for order confirmations</li>
            <li><strong>Legal requirements:</strong> if required by law or to protect our rights</li>
          </ul>
          <p className="mt-2">We do not sell your personal information to third parties.</p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-gray-900">4. Data Security</h2>
          <p>
            We implement reasonable security measures to protect your information, including
            encrypted connections (HTTPS), hashed passwords (bcrypt), JWT-based authentication,
            and secure payment processing through Stripe.
            However, no method of transmission over the internet is 100% secure.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-gray-900">5. Cookies & Local Storage</h2>
          <p>
            We use browser local storage to keep you signed in. We do not use third-party
            tracking cookies. Google Sign-In may set its own cookies as governed by Google's
            privacy policy.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-gray-900">6. Data Retention</h2>
          <p>
            We retain your account data for as long as your account is active. Order and ticket
            data is retained for record-keeping and legal compliance. You may request deletion
            of your account and personal data at any time.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-gray-900">7. Your Rights</h2>
          <p>You have the right to:</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Access the personal data we hold about you</li>
            <li>Request correction of inaccurate data</li>
            <li>Request deletion of your account and data</li>
            <li>Opt out of non-essential communications</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-gray-900">8. Changes to This Policy</h2>
          <p>
            We may update this privacy policy from time to time. We will notify users of
            material changes via email or a notice on the Platform.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-gray-900">9. Contact</h2>
          <p>
            For privacy-related questions, contact us at{" "}
            <a href="mailto:hello@pulsetix.net" className="text-brand hover:underline">hello@pulsetix.net</a>.
          </p>
        </section>
      </div>
    </div>
  );
}
