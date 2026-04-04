export default function AcceptableUsePage() {
  return (
    <div className="mx-auto max-w-2xl py-12">
      <h1 className="mb-8 text-3xl font-bold tracking-tight">Acceptable Use Policy</h1>
      <div className="flex flex-col gap-6 text-sm leading-relaxed text-gray-600">
        <p className="text-gray-400">Last updated: April 3, 2026</p>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-gray-900">1. Permitted Use</h2>
          <p>
            PulseTix is designed for creating, promoting, and selling tickets to legitimate
            events. You may use it for concerts, parties, conferences, workshops, meetups,
            and other lawful gatherings.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-gray-900">2. Prohibited Activities</h2>
          <p>You may not use our platform to:</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Create fraudulent or misleading events</li>
            <li>Sell counterfeit or unauthorized tickets</li>
            <li>Scalp or resell tickets above face value without authorization</li>
            <li>Harass, threaten, or abuse other users</li>
            <li>Upload harmful, illegal, or offensive content</li>
            <li>Attempt to gain unauthorized access to other accounts</li>
            <li>Use bots or automated tools to purchase tickets in bulk</li>
            <li>Promote events involving illegal activities</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-gray-900">3. Content Standards</h2>
          <p>
            Event listings, descriptions, and images must be accurate and not contain
            misleading information. Content must not be discriminatory, obscene,
            or violate intellectual property rights.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-gray-900">4. Enforcement</h2>
          <p>
            We reserve the right to remove events, suspend accounts, and withhold payments
            for violations of this policy. Repeated or severe violations may result in
            permanent account termination.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-gray-900">5. Reporting</h2>
          <p>
            If you encounter content or behavior that violates this policy, please report it
            to <a href="mailto:hello@pulsetix.net" className="text-brand hover:underline">hello@pulsetix.net</a>.
          </p>
        </section>
      </div>
    </div>
  );
}
