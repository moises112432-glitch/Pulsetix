"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/useAuth";
import type { PromoterDashboard, Commission } from "@/types";

export default function PromoterDashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const [promotions, setPromotions] = useState<PromoterDashboard[]>([]);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      apiFetch<PromoterDashboard[]>("/api/promoters/me"),
      apiFetch<Commission[]>("/api/promoters/me/commissions"),
    ])
      .then(([promos, comms]) => {
        setPromotions(promos);
        setCommissions(comms);
      })
      .finally(() => setLoading(false));
  }, [user]);

  function copyLink(url: string) {
    navigator.clipboard.writeText(url);
    setCopied(url);
    setTimeout(() => setCopied(null), 2000);
  }

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-brand" />
      </div>
    );
  }

  if (!user) {
    window.location.href = "/auth";
    return null;
  }

  const totalEarned = promotions.reduce((sum, p) => sum + p.total_commission, 0);
  const totalPending = promotions.reduce((sum, p) => sum + p.pending_commission, 0);
  const totalSales = promotions.reduce((sum, p) => sum + p.total_sales, 0);

  return (
    <div>
      <div className="mb-6 sm:mb-8">
        <button
          onClick={() => (window.location.href = "/dashboard")}
          className="mb-2 text-sm text-gray-400 hover:text-gray-600"
        >
          &larr; Back to Dashboard
        </button>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">My Promotions</h1>
        <p className="mt-1 text-sm text-gray-500">Track your referral earnings</p>
      </div>

      {/* Summary Stats */}
      <div className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        <div className="rounded-2xl border border-gray-100 bg-white p-5 text-center">
          <p className="text-2xl font-bold text-green-600">${totalEarned.toFixed(2)}</p>
          <p className="text-xs text-gray-500">Total Earned</p>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-5 text-center">
          <p className="text-2xl font-bold text-yellow-600">${totalPending.toFixed(2)}</p>
          <p className="text-xs text-gray-500">Pending Payout</p>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-5 text-center">
          <p className="text-2xl font-bold text-brand">{totalSales}</p>
          <p className="text-xs text-gray-500">Total Sales</p>
        </div>
      </div>

      {promotions.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-gray-200 py-20">
          <span className="text-4xl">🔗</span>
          <p className="text-gray-500">You're not promoting any events yet</p>
          <p className="text-sm text-gray-400">
            Browse events and click "Get My Link" on events with affiliate programs
          </p>
          <Link
            href="/events"
            className="rounded-lg bg-brand px-5 py-2 text-sm font-medium text-white hover:bg-brand-dark"
          >
            Browse Events
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold">Events You're Promoting</h2>
          {promotions.map((p) => (
            <div
              key={p.event_id}
              className="rounded-2xl border border-gray-100 bg-white p-5"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <Link
                    href={`/events/${p.event_id}`}
                    className="font-semibold hover:text-brand"
                  >
                    {p.event_title}
                  </Link>
                  <p className="mt-1 text-xs text-purple-600">
                    {p.commission_percent}% commission per sale
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="rounded-lg bg-gray-50 px-3 py-1.5">
                    <p className="truncate font-mono text-xs text-gray-600" style={{ maxWidth: 200 }}>
                      {p.referral_url}
                    </p>
                  </div>
                  <button
                    onClick={() => copyLink(p.referral_url)}
                    className="shrink-0 rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-dark"
                  >
                    {copied === p.referral_url ? "Copied!" : "Copy"}
                  </button>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-3">
                <div className="rounded-xl bg-gray-50 p-3 text-center">
                  <p className="text-lg font-bold">{p.total_sales}</p>
                  <p className="text-[10px] text-gray-500">Sales</p>
                </div>
                <div className="rounded-xl bg-gray-50 p-3 text-center">
                  <p className="text-lg font-bold">${p.total_revenue.toFixed(2)}</p>
                  <p className="text-[10px] text-gray-500">Revenue Generated</p>
                </div>
                <div className="rounded-xl bg-gray-50 p-3 text-center">
                  <p className="text-lg font-bold text-green-600">
                    ${p.total_commission.toFixed(2)}
                  </p>
                  <p className="text-[10px] text-gray-500">Commission Earned</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Commission History */}
      {commissions.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-4 text-lg font-semibold">Commission History</h2>
          <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-100 bg-gray-50/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Order</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Date</th>
                </tr>
              </thead>
              <tbody>
                {commissions.map((c) => (
                  <tr key={c.id} className="border-b border-gray-50 last:border-0">
                    <td className="px-4 py-3 text-gray-600">#{c.order_id}</td>
                    <td className="px-4 py-3 font-medium">${c.amount.toFixed(2)}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          c.status === "paid"
                            ? "bg-green-50 text-green-600"
                            : c.status === "approved"
                            ? "bg-blue-50 text-blue-600"
                            : "bg-yellow-50 text-yellow-600"
                        }`}
                      >
                        {c.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400">
                      {new Date(c.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
