"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch, API_BASE } from "@/lib/api";
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
      // After a successful purchase, check if event is in public affiliate mode
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
        // Clean up URL
        window.history.replaceState({}, "", "/checkout");
      }
    }).finally(() => setLoading(false));
  }, []);

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
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">My Tickets</h1>
        <p className="mt-1 text-gray-500">Your purchased tickets and orders</p>
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
      ) : (
        <div className="flex flex-col gap-6">
          {orders.map((order: Order) => (
            <div
              key={order.id}
              className="overflow-hidden rounded-2xl border border-gray-100 bg-white"
            >
              {/* Order header */}
              <div className="flex flex-col gap-2 border-b border-gray-50 bg-gray-50/50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-4">
                <div className="flex items-center gap-3">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      order.status === "completed"
                        ? "bg-green-50 text-green-600"
                        : order.status === "pending"
                        ? "bg-yellow-50 text-yellow-600"
                        : "bg-red-50 text-red-600"
                    }`}
                  >
                    {order.status}
                  </span>
                </div>
                <div className="sm:text-right">
                  <p className="font-semibold">${order.total.toFixed(2)}</p>
                  <p className="text-xs text-gray-400">
                    {new Date(order.created_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                </div>
              </div>

              {/* Tickets */}
              <div className="divide-y divide-gray-50 px-4 sm:px-6">
                {order.tickets.map((ticket) => (
                  <div
                    key={ticket.id}
                    className="flex flex-col items-center gap-4 py-5 sm:flex-row sm:gap-5"
                  >
                    {/* QR Code */}
                    <div className="flex flex-col items-center gap-1">
                      <img
                        src={`${API_BASE}/api/tickets/${ticket.qr_code_token}/qr.png`}
                        alt="QR Code"
                        className="h-24 w-24 rounded-xl border border-gray-100"
                      />
                    </div>

                    {/* Ticket info */}
                    <div className="flex w-full flex-1 flex-col items-center gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div className="text-center sm:text-left">
                        <p className="font-semibold">
                          {ticket.ticket_type_name}
                        </p>
                        <p className="font-mono text-xs text-gray-300">
                          {ticket.qr_code_token.slice(0, 16)}...
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {ticket.checked_in_at ? (
                          <span className="flex items-center gap-1 rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-600">
                            ✓ Checked in
                          </span>
                        ) : (
                          <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand">
                            Valid
                          </span>
                        )}
                        <a
                          href={`/ticket/${ticket.qr_code_token}`}
                          className="rounded-lg border border-gray-200 px-3 py-1 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50"
                        >
                          View Ticket
                        </a>
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
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-50 text-sm font-semibold text-brand">
                    {org.avatar ? (
                      <img src={org.avatar} alt="" className="h-full w-full rounded-full object-cover" />
                    ) : (
                      org.name.charAt(0).toUpperCase()
                    )}
                  </div>
                  <p className="text-sm font-semibold">{org.name}</p>
                </div>
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
