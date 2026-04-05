"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/useAuth";
import type { Promoter, Commission } from "@/types";

export default function EventPromotersPage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [promoters, setPromoters] = useState<Promoter[]>([]);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [loading, setLoading] = useState(true);

  const eventId = params.id;

  useEffect(() => {
    if (!user) return;
    Promise.all([
      apiFetch<Promoter[]>(`/api/promoters/events/${eventId}`),
      apiFetch<Commission[]>(`/api/promoters/events/${eventId}/commissions`),
    ])
      .then(([p, c]) => {
        setPromoters(p);
        setCommissions(c);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user, eventId]);

  async function handleApprove(commissionId: number) {
    await apiFetch(`/api/promoters/events/${eventId}/commissions/${commissionId}/approve`, {
      method: "POST",
    });
    const updated = await apiFetch<Commission[]>(`/api/promoters/events/${eventId}/commissions`);
    setCommissions(updated);
  }

  async function handleMarkPaid(commissionIds: number[]) {
    await apiFetch(`/api/promoters/events/${eventId}/payouts`, {
      method: "POST",
      body: JSON.stringify({ commission_ids: commissionIds }),
    });
    const updated = await apiFetch<Commission[]>(`/api/promoters/events/${eventId}/commissions`);
    setCommissions(updated);
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

  const approvedCommissions = commissions.filter((c) => c.status === "approved");
  const totalCommissions = commissions.reduce((sum, c) => sum + c.amount, 0);
  const totalPaid = commissions.filter((c) => c.status === "paid").reduce((sum, c) => sum + c.amount, 0);

  return (
    <div>
      <div className="mb-6 sm:mb-8">
        <button
          onClick={() => router.push("/dashboard")}
          className="mb-2 text-sm text-gray-400 hover:text-gray-600"
        >
          &larr; Back to Dashboard
        </button>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Promoters</h1>
        <p className="mt-1 text-sm text-gray-500">
          Track promoter performance and manage payouts
        </p>
      </div>

      {/* Summary */}
      <div className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-4 sm:gap-4">
        <div className="rounded-2xl border border-gray-100 bg-white p-5 text-center">
          <p className="text-2xl font-bold text-brand">{promoters.length}</p>
          <p className="text-xs text-gray-500">Promoters</p>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-5 text-center">
          <p className="text-2xl font-bold">
            {promoters.reduce((sum, p) => sum + p.total_sales, 0)}
          </p>
          <p className="text-xs text-gray-500">Referred Sales</p>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-5 text-center">
          <p className="text-2xl font-bold text-green-600">
            ${promoters.reduce((sum, p) => sum + p.total_revenue, 0).toFixed(2)}
          </p>
          <p className="text-xs text-gray-500">Revenue from Referrals</p>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-5 text-center">
          <p className="text-2xl font-bold text-purple-600">${totalCommissions.toFixed(2)}</p>
          <p className="text-xs text-gray-500">Total Commissions</p>
        </div>
      </div>

      {/* Promoter List */}
      {promoters.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-gray-200 py-16">
          <span className="text-4xl">🔗</span>
          <p className="text-gray-500">No one has signed up as a promoter yet</p>
          <p className="text-sm text-gray-400">
            Promoters will appear here once they get their referral link
          </p>
        </div>
      ) : (
        <div className="mb-8">
          <h2 className="mb-4 text-lg font-semibold">Promoter Performance</h2>
          <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-100 bg-gray-50/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Promoter</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Code</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">Sales</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">Revenue</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">Commission</th>
                </tr>
              </thead>
              <tbody>
                {promoters.map((p) => (
                  <tr key={p.id} className="border-b border-gray-50 last:border-0">
                    <td className="px-4 py-3 font-medium">{p.user_name}</td>
                    <td className="px-4 py-3">
                      <span className="rounded bg-gray-100 px-2 py-0.5 font-mono text-xs">
                        {p.referral_code}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">{p.total_sales}</td>
                    <td className="px-4 py-3 text-right">${p.total_revenue.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right font-medium text-purple-600">
                      ${p.total_commission.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Commissions */}
      {commissions.length > 0 && (
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Commissions</h2>
            {approvedCommissions.length > 0 && (
              <button
                onClick={() => handleMarkPaid(approvedCommissions.map((c) => c.id))}
                className="rounded-lg bg-green-600 px-4 py-2 text-xs font-semibold text-white hover:bg-green-700"
              >
                Mark All Approved as Paid ({approvedCommissions.length})
              </button>
            )}
          </div>
          <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-100 bg-gray-50/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Order</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Date</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">Actions</th>
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
                    <td className="px-4 py-3 text-right">
                      {c.status === "pending" && (
                        <button
                          onClick={() => handleApprove(c.id)}
                          className="rounded-lg bg-blue-50 px-3 py-1 text-xs font-medium text-blue-600 hover:bg-blue-100"
                        >
                          Approve
                        </button>
                      )}
                      {c.status === "approved" && (
                        <button
                          onClick={() => handleMarkPaid([c.id])}
                          className="rounded-lg bg-green-50 px-3 py-1 text-xs font-medium text-green-600 hover:bg-green-100"
                        >
                          Mark Paid
                        </button>
                      )}
                      {c.status === "paid" && c.paid_at && (
                        <span className="text-xs text-gray-400">
                          Paid {new Date(c.paid_at).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-3 flex justify-between text-xs text-gray-400">
            <span>Total paid: ${totalPaid.toFixed(2)}</span>
            <span>Total owed: ${(totalCommissions - totalPaid).toFixed(2)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
