"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch, API_BASE, imageUrl } from "@/lib/api";
import type { Order, PromoterSignup } from "@/types";

interface FollowedOrganizer {
  id: number;
  name: string;
  avatar: string | null;
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [following, setFollowing] = useState<FollowedOrganizer[]>([]);
  const [loading, setLoading] = useState(true);
  const [shareEarn, setShareEarn] = useState<{ url: string; percent: number } | null>(null);
  const [shareCopied, setShareCopied] = useState(false);
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");
  const [refunding, setRefunding] = useState<number | null>(null);
  const [refundError, setRefundError] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const success = params.get("success");
    const orderId = params.get("order_id");

    Promise.all([
      apiFetch<Order[]>("/api/orders/").then((data) =>
        setOrders(data.filter((o) => o.status === "completed"))
      ),
      apiFetch<FollowedOrganizer[]>("/api/users/me/following")
        .then(setFollowing)
        .catch(() => {}),
    ]).then(async () => {
      if (success === "true" && orderId) {
        try {
          const order = await apiFetch<{ event_id: number }>(`/api/orders/${orderId}`);
          const event = await apiFetch<{ affiliate_mode: string; affiliate_commission_percent: number | null }>(
            `/api/events/${order.event_id}`
          );
          if (event.affiliate_mode === "public" && event.affiliate_commission_percent) {
            const promo = await apiFetch<PromoterSignup>(
              `/api/promoters/events/${order.event_id}/signup`,
              { method: "POST" }
            );
            setShareEarn({ url: promo.referral_url, percent: event.affiliate_commission_percent });
          }
        } catch {}
        window.history.replaceState({}, "", "/checkout");
      }
    }).finally(() => setLoading(false));
  }, []);

  const now = new Date();
  const upcomingOrders = orders.filter(
    (o) => o.event_start_time && new Date(o.event_start_time) >= now
  );
  const pastOrders = orders.filter(
    (o) => !o.event_start_time || new Date(o.event_start_time) < now
  );
  const displayOrders = tab === "upcoming" ? upcomingOrders : pastOrders;

  async function handleRefund(orderId: number) {
    if (!confirm("Are you sure you want to request a refund? Your tickets will be cancelled.")) return;
    setRefunding(orderId);
    setRefundError("");
    try {
      await apiFetch(`/api/orders/${orderId}/refund`, { method: "POST" });
      setOrders((prev) => prev.filter((o) => o.id !== orderId));
    } catch (err) {
      setRefundError(err instanceof Error ? err.message : "Refund failed");
    } finally {
      setRefunding(null);
    }
  }

  async function handleUnfollow(userId: number) {
    try {
      await apiFetch(`/api/users/${userId}/follow`, { method: "DELETE" });
      setFollowing((prev) => prev.filter((f) => f.id !== userId));
    } catch {}
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-brand" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">My Tickets</h1>
          <p className="mt-1 text-sm text-gray-500">
            {orders.length} order{orders.length !== 1 ? "s" : ""} &middot;{" "}
            {orders.reduce((sum, o) => sum + o.tickets.length, 0)} ticket{orders.reduce((sum, o) => sum + o.tickets.length, 0) !== 1 ? "s" : ""}
          </p>
        </div>

        {/* Tabs */}
        {orders.length > 0 && (
          <div className="flex rounded-xl border border-gray-200 bg-gray-50 p-1">
            <button
              onClick={() => setTab("upcoming")}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                tab === "upcoming"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Upcoming ({upcomingOrders.length})
            </button>
            <button
              onClick={() => setTab("past")}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                tab === "past"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Past ({pastOrders.length})
            </button>
          </div>
        )}
      </div>

      {/* Share & Earn Banner */}
      {shareEarn && (
        <div className="mb-6 rounded-2xl border border-purple-100 bg-gradient-to-r from-purple-50 to-brand-50 p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="font-semibold text-purple-900">Share & Earn {shareEarn.percent}%</h3>
              <p className="mt-1 text-sm text-purple-600">
                Share your link with friends and earn commission on every ticket they buy!
              </p>
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(shareEarn.url);
                setShareCopied(true);
                setTimeout(() => setShareCopied(false), 2000);
              }}
              className="shrink-0 rounded-xl bg-purple-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-purple-500/25 transition-all hover:bg-purple-700"
            >
              {shareCopied ? "Copied!" : "Copy Referral Link"}
            </button>
          </div>
          <div className="mt-3 rounded-lg bg-white px-3 py-2">
            <p className="truncate font-mono text-xs text-purple-700">{shareEarn.url}</p>
          </div>
        </div>
      )}

      {orders.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-gray-200 py-20">
          <span className="text-4xl">🎫</span>
          <p className="text-gray-500">No tickets yet</p>
          <a
            href="/events"
            className="rounded-lg bg-brand px-5 py-2 text-sm font-medium text-white hover:bg-brand-dark"
          >
            Browse events
          </a>
        </div>
      ) : displayOrders.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-gray-200 py-16">
          <span className="text-3xl">{tab === "upcoming" ? "📅" : "📋"}</span>
          <p className="text-gray-500">
            No {tab === "upcoming" ? "upcoming" : "past"} tickets
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {displayOrders.map((order) => (
            <div
              key={order.id}
              className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-all hover:shadow-md"
            >
              {/* Event header with cover image */}
              <div className="relative">
                {order.event_cover_image ? (
                  <div className="relative h-28 sm:h-36">
                    <img
                      src={imageUrl(order.event_cover_image)}
                      alt={order.event_title || "Event"}
                      className="h-full w-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-4">
                      <Link
                        href={`/events/${order.event_id}`}
                        className="text-lg font-bold text-white hover:underline sm:text-xl"
                      >
                        {order.event_title || `Event #${order.event_id}`}
                      </Link>
                      <div className="mt-1 flex flex-wrap items-center gap-3">
                        {order.event_start_time && (
                          <span className="flex items-center gap-1 text-xs text-white/80">
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            {new Date(order.event_start_time).toLocaleDateString("en-US", {
                              weekday: "short",
                              month: "short",
                              day: "numeric",
                            })}
                            {" at "}
                            {new Date(order.event_start_time).toLocaleTimeString("en-US", {
                              hour: "numeric",
                              minute: "2-digit",
                            })}
                          </span>
                        )}
                        {order.event_location && (
                          <span className="flex items-center gap-1 text-xs text-white/80">
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            {order.event_location}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="border-b border-gray-50 bg-gradient-to-r from-brand-50 to-purple-50 px-5 py-4">
                    <Link
                      href={`/events/${order.event_id}`}
                      className="text-lg font-bold text-gray-900 hover:text-brand"
                    >
                      {order.event_title || `Event #${order.event_id}`}
                    </Link>
                    <div className="mt-1 flex flex-wrap items-center gap-3">
                      {order.event_start_time && (
                        <span className="text-xs text-gray-500">
                          {new Date(order.event_start_time).toLocaleDateString("en-US", {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                          })}
                          {" at "}
                          {new Date(order.event_start_time).toLocaleTimeString("en-US", {
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                        </span>
                      )}
                      {order.event_location && (
                        <span className="text-xs text-gray-500">{order.event_location}</span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Order meta */}
              <div className="flex items-center justify-between border-b border-gray-50 bg-gray-50/50 px-5 py-2.5">
                <div className="flex items-center gap-3">
                  <span className="rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-600">
                    {order.status}
                  </span>
                  <span className="text-xs text-gray-400">
                    {order.tickets.length} ticket{order.tickets.length !== 1 ? "s" : ""}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  {!order.tickets.some((t) => t.checked_in_at) && (
                    <button
                      onClick={() => handleRefund(order.id)}
                      disabled={refunding === order.id}
                      className="rounded-lg border border-red-100 px-3 py-1 text-xs font-medium text-red-500 transition-colors hover:bg-red-50 disabled:opacity-50"
                    >
                      {refunding === order.id ? "Processing..." : "Refund"}
                    </button>
                  )}
                  <div className="text-right">
                    <span className="text-sm font-semibold">${order.total.toFixed(2)}</span>
                    <span className="ml-2 text-xs text-gray-400">
                      {new Date(order.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                </div>
              </div>
              {refundError && refunding === null && (
                <div className="bg-red-50 px-5 py-2 text-xs text-red-600">{refundError}</div>
              )}

              {/* Tickets */}
              <div className="divide-y divide-gray-50 px-5">
                {order.tickets.map((ticket) => (
                  <div
                    key={ticket.id}
                    className="flex items-center gap-4 py-4"
                  >
                    {/* QR Code */}
                    {ticket.qr_code_token && (
                      <img
                        src={`${API_BASE}/api/tickets/${ticket.qr_code_token}/qr.png`}
                        alt="QR Code"
                        className="h-16 w-16 rounded-lg border border-gray-100 sm:h-20 sm:w-20"
                      />
                    )}

                    {/* Ticket info */}
                    <div className="flex flex-1 flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="font-semibold text-gray-900">
                          {ticket.ticket_type_name}
                        </p>
                        {ticket.qr_code_token && (
                          <p className="font-mono text-[11px] text-gray-300">
                            {ticket.qr_code_token.slice(0, 16)}...
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {ticket.checked_in_at ? (
                          <span className="flex items-center gap-1 rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-600">
                            <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                            Checked in
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand">
                            <span className="h-1.5 w-1.5 rounded-full bg-brand" />
                            Valid
                          </span>
                        )}
                        {ticket.qr_code_token && (
                          <Link
                            href={`/ticket/${ticket.qr_code_token}`}
                            className="rounded-lg border border-gray-200 px-3 py-1 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50"
                          >
                            View
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Following Section */}
      {following.length > 0 && (
        <div className="mt-10">
          <h2 className="mb-4 text-lg font-bold tracking-tight">Following</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {following.map((org) => (
              <div
                key={org.id}
                className="flex items-center justify-between rounded-2xl border border-gray-100 bg-white p-4"
              >
                <Link
                  href={`/profile/${org.id}`}
                  className="flex items-center gap-3 hover:opacity-80"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-50 text-sm font-semibold text-brand">
                    {org.avatar ? (
                      <img src={org.avatar} alt="" className="h-full w-full rounded-full object-cover" />
                    ) : (
                      org.name.charAt(0).toUpperCase()
                    )}
                  </div>
                  <p className="text-sm font-semibold">{org.name}</p>
                </Link>
                <button
                  onClick={() => handleUnfollow(org.id)}
                  className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
                >
                  Unfollow
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
