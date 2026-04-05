import Link from "next/link";
import { UpcomingEvents } from "@/components/UpcomingEvents";

export default function Home() {
  return (
    <div className="flex flex-col items-center -mx-4 sm:-mx-6">
      {/* Hero */}
      <section className="hero-gradient relative w-full overflow-hidden">
        {/* Floating orbs */}
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="orb orb-3" />

        <div className="relative flex flex-col items-center gap-4 px-4 pb-16 pt-16 text-center sm:gap-6 sm:pb-24 sm:pt-28">
          <div className="animate-fade-in-up rounded-full border border-brand/20 bg-white/60 px-4 py-1.5 text-sm font-medium text-brand backdrop-blur-sm">
            The modern event platform
          </div>
          <h1 className="animate-fade-in-up animate-delay-100 max-w-3xl text-4xl font-bold leading-tight tracking-tight sm:text-5xl md:text-6xl">
            Create events that
            <span className="bg-gradient-to-r from-brand to-purple-500 bg-clip-text text-transparent"> people love</span>
          </h1>
          <p className="animate-fade-in-up animate-delay-200 max-w-xl text-base leading-relaxed text-gray-600 sm:text-lg">
            Sell tickets, manage check-ins with QR codes, and grow your audience.
            Everything you need to run unforgettable events.
          </p>
          <div className="animate-fade-in-up animate-delay-300 mt-2 flex flex-col gap-3 sm:mt-4 sm:flex-row">
            <Link
              href="/events"
              className="rounded-xl bg-brand px-8 py-3.5 text-sm font-semibold text-white shadow-lg shadow-brand/25 transition-all hover:bg-brand-dark hover:shadow-xl hover:shadow-brand/30 hover:-translate-y-0.5"
            >
              Browse Events
            </Link>
            <Link
              href="/host"
              className="rounded-xl border border-gray-200 bg-white/80 px-8 py-3.5 text-sm font-semibold text-gray-700 backdrop-blur-sm transition-all hover:border-gray-300 hover:bg-white hover:-translate-y-0.5"
            >
              Host an Event
            </Link>
          </div>

          {/* Stats strip */}
          <div className="animate-fade-in-up animate-delay-400 mt-6 flex flex-wrap justify-center gap-8 sm:gap-12">
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900 sm:text-3xl">100%</p>
              <p className="text-xs font-medium text-gray-500">Free to start</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900 sm:text-3xl">5%</p>
              <p className="text-xs font-medium text-gray-500">Service fee only</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900 sm:text-3xl">Instant</p>
              <p className="text-xs font-medium text-gray-500">QR check-in</p>
            </div>
          </div>
        </div>
      </section>

      {/* Upcoming Events */}
      <section className="w-full px-4 pb-12 pt-12 sm:px-6 sm:pb-20 sm:pt-16">
        <UpcomingEvents />
      </section>

      {/* Features */}
      <section className="grid w-full max-w-4xl gap-4 px-4 pb-12 sm:gap-6 sm:px-6 sm:pb-20 sm:grid-cols-3">
        <div className="group rounded-2xl border border-gray-100 bg-white p-6 transition-all hover:border-brand/20 hover:shadow-lg hover:shadow-brand/5 hover:-translate-y-1 sm:p-8">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-brand-50 to-purple-100 text-2xl transition-transform group-hover:scale-110">
            🎫
          </div>
          <h3 className="mb-2 text-lg font-semibold">Sell Tickets</h3>
          <p className="text-sm leading-relaxed text-gray-500">
            Multiple ticket tiers, real-time inventory tracking, and secure
            payments through Stripe.
          </p>
        </div>
        <div className="group rounded-2xl border border-gray-100 bg-white p-6 transition-all hover:border-brand/20 hover:shadow-lg hover:shadow-brand/5 hover:-translate-y-1 sm:p-8">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-brand-50 to-purple-100 text-2xl transition-transform group-hover:scale-110">
            📱
          </div>
          <h3 className="mb-2 text-lg font-semibold">QR Check-in</h3>
          <p className="text-sm leading-relaxed text-gray-500">
            Every ticket gets a unique QR code. Scan at the door for instant,
            contactless check-in.
          </p>
        </div>
        <div className="group rounded-2xl border border-gray-100 bg-white p-6 transition-all hover:border-brand/20 hover:shadow-lg hover:shadow-brand/5 hover:-translate-y-1 sm:p-8">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-brand-50 to-purple-100 text-2xl transition-transform group-hover:scale-110">
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
