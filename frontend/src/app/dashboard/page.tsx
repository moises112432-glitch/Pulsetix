"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { apiFetch, API_BASE, imageUrl } from "@/lib/api";
import { useAuth } from "@/lib/useAuth";
import type { EventListItem } from "@/types";

interface EventStats {
  tickets_sold: number;
  total_capacity: number;
  revenue: number;
  checkins: number;
  total_orders: number;
}

export default function DashboardPage() {
  const { user, loading: authLoading, isOrganizer, stripeConnected } = useAuth();
  const [events, setEvents] = useState<EventListItem[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [tiers, setTiers] = useState([
    { name: "Early Bird", price: "15", qty: "50" },
    { name: "General Admission", price: "25", qty: "100" },
  ]);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [createPromos, setCreatePromos] = useState<{ code: string; discount: string; maxUses: string }[]>([]);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [expandedStats, setExpandedStats] = useState<number | null>(null);
  const [stats, setStats] = useState<Record<number, EventStats>>({});
  const [connectingStripe, setConnectingStripe] = useState(false);
  const [stripeStatus, setStripeStatus] = useState<{ connected: boolean; details_submitted: boolean; charges_enabled: boolean } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    apiFetch<EventListItem[]>("/api/events/me/organized").then(setEvents);

    // Check Stripe Connect status
    apiFetch<{ connected: boolean; details_submitted: boolean; charges_enabled: boolean }>(
      "/api/users/me/connect-status"
    )
      .then(setStripeStatus)
      .catch(() => {});

    // Handle return from Stripe onboarding
    const params = new URLSearchParams(window.location.search);
    if (params.get("stripe") === "complete" || params.get("stripe") === "refresh") {
      window.history.replaceState({}, "", "/dashboard");
    }
  }, []);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setCoverFile(file);
      setCoverPreview(URL.createObjectURL(file));
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setCreating(true);

    try {
      const created = await apiFetch<any>("/api/events/", {
        method: "POST",
        body: JSON.stringify({
          title,
          description: description || null,
          location: location || null,
          start_time: new Date(startTime).toISOString(),
          end_time: new Date(endTime).toISOString(),
          ticket_types: tiers.map((tier, i) => ({
            name: tier.name,
            price: parseFloat(tier.price),
            quantity_total: parseInt(tier.qty),
            tier_order: i,
          })),
        }),
      });

      // Upload cover image if selected
      if (coverFile) {
        const formData = new FormData();
        formData.append("file", coverFile);

        const token = localStorage.getItem("token");
        await fetch(`${API_BASE}/api/events/${created.id}/cover`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });
      }

      // Create promo codes if any
      for (const p of createPromos) {
        if (p.code.trim()) {
          await apiFetch(`/api/promos/events/${created.id}`, {
            method: "POST",
            body: JSON.stringify({
              code: p.code,
              discount_percent: parseFloat(p.discount),
              max_uses: p.maxUses ? parseInt(p.maxUses) : null,
            }),
          });
        }
      }

      const updated = await apiFetch<EventListItem[]>("/api/events/me/organized");
      setEvents(updated);
      setShowForm(false);
      setTitle("");
      setDescription("");
      setLocation("");
      setStartTime("");
      setEndTime("");
      setCoverFile(null);
      setCoverPreview(null);
      setCreatePromos([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create event");
    } finally {
      setCreating(false);
    }
  }

  async function handleConnectStripe() {
    setConnectingStripe(true);
    try {
      const data = await apiFetch<{ url: string }>("/api/users/me/connect-stripe", {
        method: "POST",
      });
      window.location.href = data.url;
    } catch {
      setConnectingStripe(false);
    }
  }

  async function handleStripeDashboard() {
    try {
      const data = await apiFetch<{ url: string }>("/api/users/me/connect-dashboard", {
        method: "POST",
      });
      window.open(data.url, "_blank");
    } catch {}
  }

  async function handlePublish(eventId: number) {
    await apiFetch(`/api/events/${eventId}/publish`, { method: "POST" });
    const updated = await apiFetch<EventListItem[]>("/api/events/me/organized");
    setEvents(updated);
  }

  async function toggleStats(eventId: number) {
    if (expandedStats === eventId) {
      setExpandedStats(null);
      return;
    }
    setExpandedStats(eventId);
    if (!stats[eventId]) {
      const data = await apiFetch<EventStats>(`/api/events/${eventId}/stats`);
      setStats((prev) => ({ ...prev, [eventId]: data }));
    }
  }

  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-brand" />
      </div>
    );
  }

  if (!user) {
    window.location.href = "/host";
    return null;
  }

  if (!isOrganizer) {
    return (
      <div className="flex flex-col items-center gap-4 py-20 text-center">
        <span className="text-5xl">🎪</span>
        <h2 className="text-2xl font-bold">Want to host events?</h2>
        <p className="text-gray-500">
          You need an organizer account to create events and manage tickets.
        </p>
        <a
          href="/host"
          className="rounded-xl bg-brand px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-brand/25 hover:bg-brand-dark"
        >
          Become an Organizer
        </a>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">Manage your events</p>
        </div>
        <div className="flex gap-2 sm:gap-3">
          <Link
            href="/scanner"
            className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 transition-all hover:bg-gray-50 sm:px-5"
          >
            📷 Scanner
          </Link>
          <button
            onClick={() => setShowForm(!showForm)}
            className="rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand/25 transition-all hover:bg-brand-dark sm:px-5"
          >
            {showForm ? "Cancel" : "+ New Event"}
          </button>
        </div>
      </div>

      {/* Stripe Connect Banner */}
      {stripeStatus && !stripeStatus.details_submitted && (
        <div className="mb-6 rounded-2xl border border-purple-100 bg-gradient-to-r from-purple-50 to-brand-50 p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="font-semibold text-gray-900">Connect your Stripe account</h3>
              <p className="mt-1 text-sm text-gray-500">
                Set up payouts so you receive ticket sales directly to your bank account. We take a {5}% platform fee.
              </p>
            </div>
            <button
              onClick={handleConnectStripe}
              disabled={connectingStripe}
              className="shrink-0 rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand/25 transition-all hover:bg-brand-dark disabled:opacity-50"
            >
              {connectingStripe ? "Redirecting..." : "Connect Stripe"}
            </button>
          </div>
        </div>
      )}

      {/* Stripe Connected */}
      {stripeStatus && stripeStatus.details_submitted && (
        <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-green-100 bg-green-50/50 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 text-green-600">✓</span>
            <div>
              <p className="font-semibold text-gray-900">Stripe connected</p>
              <p className="text-sm text-gray-500">
                {stripeStatus.charges_enabled
                  ? "Payments are being routed to your account"
                  : "Your account is being verified by Stripe"}
              </p>
            </div>
          </div>
          <button
            onClick={handleStripeDashboard}
            className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-white"
          >
            Stripe Dashboard
          </button>
        </div>
      )}

      {/* Create Form */}
      {showForm && (
        <div className="mb-8 rounded-2xl border border-gray-100 bg-white p-8 shadow-sm">
          <h2 className="mb-6 text-lg font-semibold">Create New Event</h2>
          <form onSubmit={handleCreate} className="flex flex-col gap-5">
            {/* Cover Image */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Cover Image
              </label>
              <div
                onClick={() => fileInputRef.current?.click()}
                className="flex cursor-pointer flex-col items-center gap-3 rounded-xl border-2 border-dashed border-gray-200 p-8 transition-colors hover:border-brand hover:bg-brand-50/30"
              >
                {coverPreview ? (
                  <img
                    src={coverPreview}
                    alt="Cover preview"
                    className="h-40 w-full rounded-lg object-cover"
                  />
                ) : (
                  <>
                    <span className="text-3xl">🖼️</span>
                    <p className="text-sm text-gray-500">
                      Click to upload a cover image
                    </p>
                    <p className="text-xs text-gray-400">
                      JPEG, PNG, or WebP
                    </p>
                  </>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Event Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                placeholder="My Awesome Event"
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                placeholder="Tell people what your event is about..."
                rows={3}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Location
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                placeholder="123 Main St, City"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Start Date & Time
                </label>
                <input
                  type="datetime-local"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  End Date & Time
                </label>
                <input
                  type="datetime-local"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                  required
                />
              </div>
            </div>

            <div>
              <div className="mb-3 flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">
                  Ticket Tiers
                </label>
                <button
                  type="button"
                  onClick={() =>
                    setTiers([...tiers, { name: "", price: "0", qty: "50" }])
                  }
                  className="rounded-lg bg-brand-50 px-3 py-1 text-xs font-medium text-brand hover:bg-brand/10"
                >
                  + Add Tier
                </button>
              </div>
              <p className="mb-4 text-xs text-gray-400">
                Tiers sell in order — when the first tier sells out, the next one becomes available automatically.
              </p>
              <div className="flex flex-col gap-3">
                {tiers.map((tier, i) => (
                  <div
                    key={i}
                    className="rounded-xl border border-gray-100 bg-gray-50/50 p-4"
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-xs font-semibold text-gray-400">
                        TIER {i + 1}
                        {i === 0 && " — sells first"}
                      </span>
                      {tiers.length > 1 && (
                        <button
                          type="button"
                          onClick={() =>
                            setTiers(tiers.filter((_, idx) => idx !== i))
                          }
                          className="text-xs text-red-400 hover:text-red-600"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <div>
                        <label className="mb-1 block text-xs text-gray-400">
                          Name
                        </label>
                        <input
                          type="text"
                          value={tier.name}
                          onChange={(e) => {
                            const updated = [...tiers];
                            updated[i].name = e.target.value;
                            setTiers(updated);
                          }}
                          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                          placeholder="e.g. Early Bird"
                          required
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs text-gray-400">
                          Price ($)
                        </label>
                        <input
                          type="number"
                          value={tier.price}
                          onChange={(e) => {
                            const updated = [...tiers];
                            updated[i].price = e.target.value;
                            setTiers(updated);
                          }}
                          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                          step="0.01"
                          required
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs text-gray-400">
                          Quantity
                        </label>
                        <input
                          type="number"
                          value={tier.qty}
                          onChange={(e) => {
                            const updated = [...tiers];
                            updated[i].qty = e.target.value;
                            setTiers(updated);
                          }}
                          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                          required
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Promo Codes */}
            <div>
              <div className="mb-3 flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">
                  Promo Codes (optional)
                </label>
                <button
                  type="button"
                  onClick={() =>
                    setCreatePromos([...createPromos, { code: "", discount: "10", maxUses: "" }])
                  }
                  className="rounded-lg bg-brand-50 px-3 py-1 text-xs font-medium text-brand hover:bg-brand/10"
                >
                  + Add Promo Code
                </button>
              </div>
              {createPromos.length === 0 && (
                <p className="text-xs text-gray-400">
                  Add promo codes to offer discounts to your attendees.
                </p>
              )}
              <div className="flex flex-col gap-3">
                {createPromos.map((p, i) => (
                  <div
                    key={i}
                    className="rounded-xl border border-gray-100 bg-gray-50/50 p-4"
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-xs font-semibold text-gray-400">
                        PROMO {i + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setCreatePromos(createPromos.filter((_, idx) => idx !== i))
                        }
                        className="text-xs text-red-400 hover:text-red-600"
                      >
                        Remove
                      </button>
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <div>
                        <label className="mb-1 block text-xs text-gray-400">
                          Code
                        </label>
                        <input
                          type="text"
                          value={p.code}
                          onChange={(e) => {
                            const updated = [...createPromos];
                            updated[i].code = e.target.value.toUpperCase();
                            setCreatePromos(updated);
                          }}
                          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm uppercase focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                          placeholder="e.g. VIP20"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs text-gray-400">
                          Discount (%)
                        </label>
                        <input
                          type="number"
                          value={p.discount}
                          onChange={(e) => {
                            const updated = [...createPromos];
                            updated[i].discount = e.target.value;
                            setCreatePromos(updated);
                          }}
                          min="1"
                          max="100"
                          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs text-gray-400">
                          Max Uses (empty = unlimited)
                        </label>
                        <input
                          type="number"
                          value={p.maxUses}
                          onChange={(e) => {
                            const updated = [...createPromos];
                            updated[i].maxUses = e.target.value;
                            setCreatePromos(updated);
                          }}
                          placeholder="Unlimited"
                          min="1"
                          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={creating}
              className="rounded-xl bg-brand py-3 text-sm font-semibold text-white shadow-lg shadow-brand/25 transition-all hover:bg-brand-dark disabled:opacity-50"
            >
              {creating ? "Creating..." : "Create Event"}
            </button>
          </form>
        </div>
      )}

      {/* Event List */}
      {events.length === 0 && !showForm ? (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-gray-200 py-20">
          <span className="text-4xl">📋</span>
          <p className="text-gray-500">You haven't created any events yet</p>
          <button
            onClick={() => setShowForm(true)}
            className="rounded-lg bg-brand px-5 py-2 text-sm font-medium text-white hover:bg-brand-dark"
          >
            Create your first event
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {events.map((event) => {
            const eventStats = stats[event.id];
            const isExpanded = expandedStats === event.id;

            return (
              <div
                key={event.id}
                className="overflow-hidden rounded-2xl border border-gray-100 bg-white transition-colors hover:border-gray-200"
              >
                <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className="hidden h-14 w-14 flex-shrink-0 overflow-hidden rounded-xl bg-brand-50 sm:flex">
                      {event.cover_image ? (
                        <img
                          src={imageUrl(event.cover_image)}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-xl">
                          🎪
                        </div>
                      )}
                    </div>
                    <div>
                      <Link
                        href={`/events/${event.id}`}
                        className="font-semibold hover:text-brand"
                      >
                        {event.title}
                      </Link>
                      <p className="text-sm text-gray-400">
                        {new Date(event.start_time).toLocaleDateString(
                          "en-US",
                          { month: "short", day: "numeric", year: "numeric" }
                        )}
                        {event.location && ` · ${event.location}`}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium ${
                        event.status === "published"
                          ? "bg-green-50 text-green-600"
                          : event.status === "cancelled"
                          ? "bg-red-50 text-red-600"
                          : "bg-yellow-50 text-yellow-600"
                      }`}
                    >
                      {event.status}
                    </span>
                    <Link
                      href={`/dashboard/edit/${event.id}`}
                      className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
                    >
                      Edit
                    </Link>
                    {event.status === "draft" && (
                      <button
                        onClick={() => handlePublish(event.id)}
                        className="rounded-lg bg-brand px-4 py-1.5 text-xs font-medium text-white hover:bg-brand-dark"
                      >
                        Publish
                      </button>
                    )}
                    <button
                      onClick={() => toggleStats(event.id)}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                        isExpanded
                          ? "border-brand bg-brand-50 text-brand"
                          : "border-gray-200 text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      {isExpanded ? "Hide Stats" : "Stats"}
                    </button>
                  </div>
                </div>

                {/* Stats Panel */}
                {isExpanded && eventStats && (
                  <div className="border-t border-gray-50 bg-gray-50/50 px-4 py-4 sm:px-5">
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
                      <div className="rounded-xl bg-white p-4 text-center">
                        <p className="text-2xl font-bold text-brand">
                          {eventStats.tickets_sold}
                        </p>
                        <p className="text-xs text-gray-500">
                          of {eventStats.total_capacity} sold
                        </p>
                      </div>
                      <div className="rounded-xl bg-white p-4 text-center">
                        <p className="text-2xl font-bold text-green-600">
                          ${eventStats.revenue.toFixed(0)}
                        </p>
                        <p className="text-xs text-gray-500">Revenue</p>
                      </div>
                      <div className="rounded-xl bg-white p-4 text-center">
                        <p className="text-2xl font-bold text-blue-600">
                          {eventStats.checkins}
                        </p>
                        <p className="text-xs text-gray-500">Checked In</p>
                      </div>
                      <div className="rounded-xl bg-white p-4 text-center">
                        <p className="text-2xl font-bold text-gray-700">
                          {eventStats.total_orders}
                        </p>
                        <p className="text-xs text-gray-500">Orders</p>
                      </div>
                    </div>
                    {/* Progress bar */}
                    <div className="mt-4">
                      <div className="mb-1 flex justify-between text-xs text-gray-500">
                        <span>Ticket Sales</span>
                        <span>
                          {eventStats.total_capacity > 0
                            ? Math.round(
                                (eventStats.tickets_sold /
                                  eventStats.total_capacity) *
                                  100
                              )
                            : 0}
                          %
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-gray-200">
                        <div
                          className="h-full rounded-full bg-brand transition-all"
                          style={{
                            width: `${
                              eventStats.total_capacity > 0
                                ? (eventStats.tickets_sold /
                                    eventStats.total_capacity) *
                                  100
                                : 0
                            }%`,
                          }}
                        />
                      </div>
                    </div>

                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
