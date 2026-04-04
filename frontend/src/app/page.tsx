import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col items-center">
      {/* Hero */}
      <section className="flex flex-col items-center gap-4 px-2 pb-12 pt-12 text-center sm:gap-6 sm:pb-20 sm:pt-24">
        <div className="rounded-full bg-brand-50 px-4 py-1.5 text-sm font-medium text-brand">
          The modern event platform
        </div>
        <h1 className="max-w-3xl text-3xl font-bold leading-tight tracking-tight sm:text-5xl md:text-6xl">
          Create events that
          <span className="text-brand"> people love</span>
        </h1>
        <p className="max-w-xl text-base leading-relaxed text-gray-500 sm:text-lg">
          Sell tickets, manage check-ins with QR codes, and grow your audience.
          Everything you need to run unforgettable events.
        </p>
        <div className="mt-2 flex flex-col gap-3 sm:mt-4 sm:flex-row">
          <Link
            href="/events"
            className="rounded-xl bg-brand px-8 py-3.5 text-sm font-semibold text-white shadow-lg shadow-brand/25 transition-all hover:bg-brand-dark hover:shadow-xl hover:shadow-brand/30"
          >
            Browse Events
          </Link>
          <Link
            href="/host"
            className="rounded-xl border border-gray-200 bg-white px-8 py-3.5 text-sm font-semibold text-gray-700 transition-all hover:border-gray-300 hover:bg-gray-50"
          >
            Host an Event
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="grid w-full max-w-4xl gap-4 pb-12 sm:pb-20 sm:grid-cols-3">
        <div className="rounded-2xl border border-gray-100 bg-white p-6 sm:p-8">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-2xl">
            🎫
          </div>
          <h3 className="mb-2 text-lg font-semibold">Sell Tickets</h3>
          <p className="text-sm leading-relaxed text-gray-500">
            Multiple ticket tiers, real-time inventory tracking, and secure
            payments through Stripe.
          </p>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-6 sm:p-8">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-2xl">
            📱
          </div>
          <h3 className="mb-2 text-lg font-semibold">QR Check-in</h3>
          <p className="text-sm leading-relaxed text-gray-500">
            Every ticket gets a unique QR code. Scan at the door for instant,
            contactless check-in.
          </p>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-6 sm:p-8">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-2xl">
            📊
          </div>
          <h3 className="mb-2 text-lg font-semibold">Analytics</h3>
          <p className="text-sm leading-relaxed text-gray-500">
            Track sales, revenue, and attendance in real time. Know exactly how
            your event is performing.
          </p>
        </div>
      </section>
    </div>
  );
}
