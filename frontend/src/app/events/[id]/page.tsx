"use client";

import { Suspense, useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { apiFetch, imageUrl } from "@/lib/api";
import type { Event, PromoterSignup } from "@/types";

export default function EventDetailPage() {
  return (
    <Suspense>
      <EventDetailContent />
    </Suspense>
  );
}

function EventDetailContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const ref = searchParams.get("ref");
  const [event, setEvent] = useState<Event | null>(null);
  const [quantities, setQuantities] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);
  const [checkingOut, setCheckingOut] = useState(false);
  const [promoInput, setPromoInput] = useState("");
  const [promoApplied, setPromoApplied] = useState<{ code: string; discount: number } | null>(null);
  const [promoError, setPromoError] = useState("");
  const [promoLoading, setPromoLoading] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [followLoading, setFollowLoading] = useState(false);
  const [promoterLink, setPromoterLink] = useState<string | null>(null);
  const [promoterLoading, setPromoterLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    apiFetch<Event>(`/api/events/${params.id}`)
      .then((e) => {
        setEvent(e);
        // Load follow status and follower count
        apiFetch<{ count: number }>(`/api/users/${e.organizer_id}/followers/count`)
          .then((d) => setFollowerCount(d.count))
          .catch(() => {});
        const token = localStorage.getItem("token");
        if (token) {
          apiFetch<{ following: boolean }>(`/api/users/${e.organizer_id}/is-following`)
            .then((d) => setIsFollowing(d.following))
            .catch(() => {});
        }
      })
      .finally(() => setLoading(false));
  }, [params.id]);

  async function handleFollow() {
    if (!event) return;
    const token = localStorage.getItem("token");
    if (!token) {
      window.location.href = "/auth";
      return;
    }
    setFollowLoading(true);
    try {
      if (isFollowing) {
        await apiFetch(`/api/users/${event.organizer_id}/follow`, { method: "DELETE" });
        setIsFollowing(false);
        setFollowerCount((c) => Math.max(0, c - 1));
      } else {
        await apiFetch(`/api/users/${event.organizer_id}/follow`, { method: "POST" });
        setIsFollowing(true);
        setFollowerCount((c) => c + 1);
      }
    } catch {}
    setFollowLoading(false);
  }

  async function handlePromote() {
    if (!event) return;
    const token = localStorage.getItem("token");
    if (!token) {
      window.location.href = "/auth";
      return;
    }
    setPromoterLoading(true);
    try {
      const data = await apiFetch<PromoterSignup>(
        `/api/promoters/events/${event.id}/signup`,
        { method: "POST" }
      );
      setPromoterLink(data.referral_url);
    } catch {}
    setPromoterLoading(false);
  }

  function copyLink() {
    if (promoterLink) {
      navigator.clipboard.writeText(promoterLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  const subtotal = event
    ? event.ticket_types.reduce(
        (sum, tt) => sum + tt.price * (quantities[tt.id] || 0),
        0
      )
    : 0;

  const discountAmount = promoApplied
    ? Math.round(subtotal * (promoApplied.discount / 100) * 100) / 100
    : 0;
  const afterDiscount = subtotal - discountAmount;
  const serviceFee = Math.round(afterDiscount * 5) / 100;
  const total = afterDiscount + serviceFee;

  const hasSelection = Object.values(quantities).some((q) => q > 0);

  async function handleApplyPromo() {
    if (!event || !promoInput.trim()) return;
    setPromoError("");
    setPromoLoading(true);

    try {
      const data = await apiFetch<{ valid: boolean; discount_percent: number; message: string }>(
        "/api/promos/validate",
        {
          method: "POST",
          body: JSON.stringify({ event_id: event.id, code: promoInput }),
        }
      );

      if (data.valid) {
        setPromoApplied({ code: promoInput.toUpperCase(), discount: data.discount_percent });
        setPromoError("");
      } else {
        setPromoError(data.message);
        setPromoApplied(null);
      }
    } catch {
      setPromoError("Failed to validate promo code");
    } finally {
      setPromoLoading(false);
    }
  }

  async function handleCheckout() {
    if (!event || !hasSelection) return;
    setCheckingOut(true);

    try {
      const items = Object.entries(quantities)
        .filter(([, qty]) => qty > 0)
        .map(([id, qty]) => ({ ticket_type_id: Number(id), quantity: qty }));

      const data = await apiFetch<{ checkout_url: string }>(
        "/api/orders/checkout",
        {
          method: "POST",
          body: JSON.stringify({
            event_id: event.id,
            items,
            promo_code: promoApplied?.code || null,
            ref: ref || null,
          }),
        }
      );

      window.location.href = data.checkout_url;
    } catch {
      setCheckingOut(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-brand" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="py-20 text-center">
        <p className="text-lg text-gray-500">Event not found.</p>
      </div>
    );
  }

  const startDate = new Date(event.start_time);
  const endDate = new Date(event.end_time);

  return (
    <div className="grid gap-6 sm:gap-8 lg:grid-cols-5">
      {/* Left: Event info */}
      <div className="lg:col-span-3">
        <div className="relative mb-6 h-48 overflow-hidden rounded-2xl bg-gradient-to-br from-brand-50 to-brand-light/20 sm:mb-8 sm:h-72">
          {event.cover_image ? (
            <img
              src={imageUrl(event.cover_image)}
              alt={event.title}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-6xl opacity-40">
              🎪
            </div>
          )}
        </div>

        <h1 className="text-2xl font-bold tracking-tight sm:text-4xl">{event.title}</h1>

        <div className="mt-6 flex flex-col gap-3">
          <div className="flex items-center gap-3 text-gray-600">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-lg">
              📅
            </span>
            <div>
              <p className="font-medium">
                {startDate.toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
              <p className="text-sm text-gray-400">
                {startDate.toLocaleTimeString("en-US", {
                  hour: "numeric",
                  minute: "2-digit",
                })}{" "}
                &mdash;{" "}
                {endDate.toLocaleTimeString("en-US", {
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </p>
            </div>
          </div>

          {event.location && (
            <div className="flex items-center gap-3 text-gray-600">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-lg">
                📍
              </span>
              <p className="font-medium">{event.location}</p>
            </div>
          )}
        </div>

        {/* Organizer */}
        {event.organizer_name && (
          <div className="mt-6 flex items-center justify-between rounded-2xl border border-gray-100 bg-white p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-50 text-sm font-semibold text-brand">
                {event.organizer_name.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-semibold">{event.organizer_name}</p>
                <p className="text-xs text-gray-400">
                  {followerCount} follower{followerCount !== 1 ? "s" : ""}
                </p>
              </div>
            </div>
            <button
              onClick={handleFollow}
              disabled={followLoading}
              className={`rounded-lg px-4 py-2 text-xs font-semibold transition-colors disabled:opacity-50 ${
                isFollowing
                  ? "border border-gray-200 text-gray-600 hover:bg-gray-50"
                  : "bg-brand text-white hover:bg-brand-dark"
              }`}
            >
              {isFollowing ? "Following" : "Follow"}
            </button>
          </div>
        )}

        {event.affiliate_enabled && event.affiliate_commission_percent && (
          <div className="mt-6 rounded-2xl border border-purple-100 bg-purple-50 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-purple-900">Earn {event.affiliate_commission_percent}% commission</p>
                <p className="text-xs text-purple-600">Share your link and earn on every sale</p>
              </div>
              {promoterLink ? (
                <button
                  onClick={copyLink}
                  className="rounded-lg bg-purple-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-purple-700"
                >
                  {copied ? "Copied!" : "Copy Link"}
                </button>
              ) : (
                <button
                  onClick={handlePromote}
                  disabled={promoterLoading}
                  className="rounded-lg bg-purple-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-purple-700 disabled:opacity-50"
                >
                  {promoterLoading ? "..." : "Get My Link"}
                </button>
              )}
            </div>
            {promoterLink && (
              <div className="mt-3 rounded-lg bg-white px-3 py-2">
                <p className="truncate font-mono text-xs text-purple-700">{promoterLink}</p>
              </div>
            )}
          </div>
        )}

        {event.description && (
          <div className="mt-8">
            <h2 className="mb-3 text-lg font-semibold">About this event</h2>
            <p className="whitespace-pre-wrap leading-relaxed text-gray-600">
              {event.description}
            </p>
          </div>
        )}
      </div>

      {/* Right: Ticket selection */}
      <div className="lg:col-span-2">
        <div className="sticky top-24 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="mb-1 text-lg font-semibold">Get Tickets</h2>
          <p className="mb-5 text-sm text-gray-400">Select your tickets below</p>

          <div className="flex flex-col gap-3">
            {(() => {
              // Sort tiers by tier_order
              const sorted = [...event.ticket_types].sort(
                (a, b) => a.tier_order - b.tier_order
              );
              // Find the active tier (first one with remaining tickets)
              const activeTier = sorted.find(
                (tt) => tt.quantity_total - tt.quantity_sold > 0
              );

              return sorted.map((tt) => {
                const available = tt.quantity_total - tt.quantity_sold;
                const isSoldOut = available <= 0;
                const isActive = tt.id === activeTier?.id;
                const isFuture = !isSoldOut && !isActive;
                const qty = quantities[tt.id] || 0;

                return (
                  <div
                    key={tt.id}
                    className={`rounded-xl border p-4 transition-colors ${
                      isSoldOut
                        ? "border-gray-100 bg-gray-50 opacity-60"
                        : isActive && qty > 0
                        ? "border-brand bg-brand-50"
                        : isActive
                        ? "border-brand/30 hover:border-brand"
                        : "border-gray-100 bg-gray-50/50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className={`font-semibold ${isSoldOut ? "text-gray-400 line-through" : ""}`}>
                            {tt.name}
                          </p>
                          {isActive && (
                            <span className="rounded-full bg-brand px-2 py-0.5 text-[10px] font-bold uppercase text-white">
                              Active
                            </span>
                          )}
                          {isSoldOut && (
                            <span className="rounded-full bg-gray-200 px-2 py-0.5 text-[10px] font-bold uppercase text-gray-500">
                              Sold Out
                            </span>
                          )}
                          {isFuture && (
                            <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold uppercase text-blue-500">
                              Next
                            </span>
                          )}
                        </div>
                        <p className={`text-sm ${isSoldOut ? "text-gray-400" : "text-gray-500"}`}>
                          ${tt.price.toFixed(2)}
                        </p>
                      </div>
                      {isActive && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() =>
                              setQuantities({
                                ...quantities,
                                [tt.id]: Math.max(0, qty - 1),
                              })
                            }
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition-colors hover:bg-gray-100"
                          >
                            -
                          </button>
                          <span className="w-8 text-center font-semibold">
                            {qty}
                          </span>
                          <button
                            onClick={() =>
                              setQuantities({
                                ...quantities,
                                [tt.id]: Math.min(available, qty + 1),
                              })
                            }
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition-colors hover:bg-gray-100"
                          >
                            +
                          </button>
                        </div>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-gray-400">
                      {isSoldOut
                        ? "No tickets remaining"
                        : `${available} remaining`}
                    </p>
                  </div>
                );
              });
            })()}
          </div>

          {/* Promo Code Input */}
          <div className="mt-5 border-t border-gray-100 pt-4">
            <label className="mb-2 block text-xs font-medium text-gray-500">
              Promo Code
            </label>
            {promoApplied ? (
              <div className="flex items-center justify-between rounded-lg bg-green-50 px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-bold text-green-700">
                    {promoApplied.code}
                  </span>
                  <span className="text-xs text-green-600">
                    {promoApplied.discount}% off
                  </span>
                </div>
                <button
                  onClick={() => {
                    setPromoApplied(null);
                    setPromoInput("");
                  }}
                  className="text-xs font-medium text-green-700 hover:text-green-900"
                >
                  Remove
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={promoInput}
                  onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                  placeholder="Enter code"
                  className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm uppercase focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                />
                <button
                  type="button"
                  onClick={handleApplyPromo}
                  disabled={promoLoading || !promoInput.trim()}
                  className="rounded-lg bg-gray-100 px-4 py-2 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-200 disabled:opacity-50"
                >
                  {promoLoading ? "..." : "Apply"}
                </button>
              </div>
            )}
            {promoError && (
              <p className="mt-1 text-xs text-red-500">{promoError}</p>
            )}
          </div>

          {hasSelection && (
            <div className="mt-4 flex flex-col gap-2 border-t border-gray-100 pt-4">
              <div className="flex items-center justify-between text-sm text-gray-500">
                <span>Subtotal</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              {promoApplied && (
                <div className="flex items-center justify-between text-sm text-green-600">
                  <span>Discount ({promoApplied.discount}%)</span>
                  <span>-${discountAmount.toFixed(2)}</span>
                </div>
              )}
              {serviceFee > 0 && (
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <span>Service Fee</span>
                  <span>${serviceFee.toFixed(2)}</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Total</span>
                <span className="text-xl font-bold">${total.toFixed(2)}</span>
              </div>
            </div>
          )}

          <button
            onClick={handleCheckout}
            disabled={!hasSelection || checkingOut}
            className="mt-5 w-full rounded-xl bg-brand py-3.5 text-sm font-semibold text-white shadow-lg shadow-brand/25 transition-all hover:bg-brand-dark hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
          >
            {checkingOut ? "Redirecting to checkout..." : "Get Tickets"}
          </button>
        </div>
      </div>
    </div>
  );
}
