export default function TermsPage() {
  return (
    <div className="mx-auto max-w-2xl py-12">
      <h1 className="mb-2 text-3xl font-bold tracking-tight">Terms of Service</h1>
      <p className="mb-8 text-sm text-gray-400">Last updated: April 3, 2026</p>
      <div className="flex flex-col gap-6 text-sm leading-relaxed text-gray-600">

        <section>
          <h2 className="mb-2 text-lg font-semibold text-gray-900">1. Acceptance of Terms</h2>
          <p>
            By accessing or using PulseTix, you agree to be bound by these Terms of Service.
            If you do not agree to these terms, you may not use our services.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-gray-900">2. Description of Service</h2>
          <p>
            PulseTix is an event ticketing platform that allows organizers to create events and sell
            tickets, and attendees to discover events and purchase tickets. We facilitate transactions
            between organizers and attendees but are not responsible for the events themselves.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-gray-900">3. Account Registration</h2>
          <p>
            You must provide accurate and complete information when creating an account.
            You are responsible for maintaining the security of your account and password.
            You are responsible for all activities that occur under your account.
            You must be at least 18 years old to create an organizer account.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-gray-900">4. Event Organizers</h2>
          <p>
            Event organizers are solely responsible for the accuracy of their event listings,
            fulfilling ticket purchases, compliance with all applicable laws and regulations,
            and handling refunds and cancellations. Organizers must have a valid Stripe Connect
            account to receive payouts. We are not responsible for the quality, safety, or
            legality of events listed on PulseTix.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-gray-900">5. Ticket Purchases</h2>
          <p>
            All ticket sales are final unless the event is cancelled by the organizer or a refund
            is issued at the organizer's discretion. Refund policies are set by individual event
            organizers. We process payments through Stripe and do not store your payment information.
            Ticket prices are set by event organizers.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-gray-900">6. Fees</h2>
          <p>
            PulseTix charges a platform fee on each ticket sale. This fee is deducted automatically
            from the ticket price before the remaining amount is transferred to the organizer's
            connected Stripe account. Fee percentages are disclosed to organizers during account setup.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-gray-900">7. Prohibited Conduct</h2>
          <p>
            You may not use PulseTix to sell counterfeit tickets, engage in fraud,
            violate any laws, or infringe on the rights of others. You may not resell tickets
            purchased through PulseTix at a markup unless explicitly permitted by the event organizer.
            See our <a href="/acceptable-use" className="text-brand hover:underline">Acceptable Use Policy</a> for
            full details. We reserve the right to suspend or terminate accounts that violate these terms.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-gray-900">8. Intellectual Property</h2>
          <p>
            The PulseTix name, logo, and all related branding are the property of PulseTix. Event
            organizers retain ownership of their event content. By posting content on PulseTix, you
            grant us a non-exclusive license to display it on the Platform.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-gray-900">9. Limitation of Liability</h2>
          <p>
            PulseTix is provided "as is" without warranties of any kind. We are not liable
            for any indirect, incidental, or consequential damages arising from your use of the
            platform, including but not limited to event cancellations, payment disputes, or
            unauthorized access to your account. Our total liability shall not exceed the amount
            of fees you have paid to PulseTix in the 12 months prior to the claim.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-gray-900">10. Termination</h2>
          <p>
            We reserve the right to suspend or terminate your account at any time for violation
            of these terms. You may delete your account at any time by contacting support.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-gray-900">11. Changes to Terms</h2>
          <p>
            We may update these terms from time to time. Continued use of the platform after
            changes constitutes acceptance of the new terms. We will notify users of material
            changes via email or a notice on the Platform.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-gray-900">12. Contact</h2>
          <p>
            If you have questions about these Terms, contact us at{" "}
            <a href="mailto:hello@pulsetix.net" className="text-brand hover:underline">hello@pulsetix.net</a>.
          </p>
        </section>
      </div>
    </div>
  );
}
