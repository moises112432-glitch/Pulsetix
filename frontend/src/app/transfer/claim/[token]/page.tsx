"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { apiFetch, API_BASE } from "@/lib/api";

interface ClaimInfo {
  transfer_id: number;
  event_title: string;
  ticket_type: string;
  sender_name: string;
  status: string;
}

interface ClaimResult {
  ticket_id: number;
  qr_code_token: string;
  event_title: string;
  ticket_type: string;
}

export default function ClaimPage() {
  const params = useParams();
  const [info, setInfo] = useState<ClaimInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [claimed, setClaimed] = useState<ClaimResult | null>(null);
  const [error, setError] = useState("");

  const token = params.token as string;
  const isLoggedIn = typeof window !== "undefined" && !!localStorage.getItem("token");

  useEffect(() => {
    fetch(`${API_BASE}/api/transfers/claim/${token}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setInfo)
      .catch(() => setError("Transfer not found or expired"))
      .finally(() => setLoading(false));
  }, [token]);

  async function handleClaim() {
    setClaiming(true);
    setError("");
    try {
      const result = await apiFetch<ClaimResult>(`/api/transfers/claim/${token}`, {
        method: "POST",
      });
      setClaimed(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to claim ticket");
    } finally {
      setClaiming(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-brand" />
      </div>
    );
  }

  if (claimed) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-6 py-12 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-3xl">
          🎉
        </div>
        <h1 className="text-2xl font-bold">Ticket Claimed!</h1>
        <p className="text-gray-500">
          You now have a <strong>{claimed.ticket_type}</strong> ticket for{" "}
          <strong>{claimed.event_title}</strong>
        </p>
        <a
          href={`/ticket/${claimed.qr_code_token}`}
          className="rounded-xl bg-brand px-8 py-3 text-sm font-semibold text-white shadow-lg shadow-brand/25 transition-all hover:bg-brand-dark"
        >
          View My Ticket
        </a>
      </div>
    );
  }

  if (error && !info) {
    return (
      <div className="py-20 text-center">
        <p className="text-lg text-gray-500">{error}</p>
      </div>
    );
  }

  if (!info) return null;

  if (info.status !== "pending") {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-12 text-center">
        <span className="text-4xl">{info.status === "claimed" ? "✅" : "❌"}</span>
        <h1 className="text-2xl font-bold">
          {info.status === "claimed" ? "Already Claimed" : "Transfer Cancelled"}
        </h1>
        <p className="text-gray-500">
          {info.status === "claimed"
            ? "This ticket has already been claimed."
            : "This transfer was cancelled by the sender."}
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-6 py-12">
      <div className="w-full overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        {/* Header */}
        <div className="bg-gradient-to-br from-brand to-brand-dark px-6 py-8 text-center text-white">
          <p className="mb-1 text-xs font-medium uppercase tracking-widest opacity-80">
            Ticket Transfer
          </p>
          <h1 className="text-xl font-bold">{info.event_title}</h1>
        </div>

        {/* Body */}
        <div className="p-6 text-center">
          <p className="mb-2 text-gray-600">
            <strong>{info.sender_name}</strong> wants to send you a ticket
          </p>
          <div className="mb-6 inline-block rounded-lg bg-brand-50 px-4 py-2">
            <span className="text-sm font-semibold text-brand">{info.ticket_type}</span>
          </div>

          {error && (
            <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          {isLoggedIn ? (
            <button
              onClick={handleClaim}
              disabled={claiming}
              className="w-full rounded-xl bg-brand py-3.5 text-sm font-semibold text-white shadow-lg shadow-brand/25 transition-all hover:bg-brand-dark disabled:opacity-50"
            >
              {claiming ? "Claiming..." : "Claim Ticket"}
            </button>
          ) : (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-gray-400">Sign in or create an account to claim</p>
              <a
                href={`/auth?redirect=/transfer/claim/${token}`}
                className="w-full rounded-xl bg-brand py-3.5 text-center text-sm font-semibold text-white shadow-lg shadow-brand/25 transition-all hover:bg-brand-dark"
              >
                Sign In to Claim
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
