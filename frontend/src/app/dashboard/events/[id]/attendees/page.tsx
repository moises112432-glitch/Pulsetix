"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/useAuth";
import type { Attendee } from "@/types";

export default function AttendeesPage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [eventTitle, setEventTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterCheckin, setFilterCheckin] = useState<"all" | "checked_in" | "not_checked_in">("all");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "name">("newest");

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push("/host");
      return;
    }

    Promise.all([
      apiFetch<Attendee[]>(`/api/events/${params.id}/attendees`),
      apiFetch<{ title: string }>(`/api/events/${params.id}`),
    ])
      .then(([data, event]) => {
        setAttendees(data);
        setEventTitle(event.title);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [params.id, authLoading, user, router]);

  // Get unique ticket types for filter
  const ticketTypes = useMemo(
    () => [...new Set(attendees.map((a) => a.ticket_type))],
    [attendees]
  );

  // Filter and sort
  const filtered = useMemo(() => {
    let list = attendees;

    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          a.email.toLowerCase().includes(q)
      );
    }

    if (filterType !== "all") {
      list = list.filter((a) => a.ticket_type === filterType);
    }

    if (filterCheckin === "checked_in") {
      list = list.filter((a) => a.checked_in);
    } else if (filterCheckin === "not_checked_in") {
      list = list.filter((a) => !a.checked_in);
    }

    if (sortBy === "name") {
      list = [...list].sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === "oldest") {
      list = [...list].sort(
        (a, b) => new Date(a.purchased_at).getTime() - new Date(b.purchased_at).getTime()
      );
    }
    // "newest" is already the default order from API

    return list;
  }, [attendees, search, filterType, filterCheckin, sortBy]);

  const checkedInCount = attendees.filter((a) => a.checked_in).length;

  function exportCSV() {
    const headers = ["Name", "Email", "Ticket Type", "Price", "Purchased", "Checked In", "Checked In At", "Transferred"];
    const rows = filtered.map((a) => [
      a.name,
      a.email,
      a.ticket_type,
      `$${a.ticket_price.toFixed(2)}`,
      new Date(a.purchased_at).toLocaleString(),
      a.checked_in ? "Yes" : "No",
      a.checked_in_at ? new Date(a.checked_in_at).toLocaleString() : "",
      a.transferred ? "Yes" : "No",
    ]);

    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `attendees-${params.id}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-brand" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => router.push(`/dashboard/edit/${params.id}`)}
          className="mb-2 text-sm text-gray-400 hover:text-gray-600"
        >
          &larr; Back to Event
        </button>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Attendees</h1>
            <p className="mt-1 text-sm text-gray-500">{eventTitle}</p>
          </div>
          <button
            onClick={exportCSV}
            disabled={filtered.length === 0}
            className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition-all hover:bg-gray-50 disabled:opacity-50"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export CSV
          </button>
        </div>
      </div>

      {/* Stats bar */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-gray-400">Total Attendees</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{attendees.length}</p>
        </div>
        <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-gray-400">Checked In</p>
          <p className="mt-1 text-2xl font-bold text-green-600">{checkedInCount}</p>
        </div>
        <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-gray-400">Not Checked In</p>
          <p className="mt-1 text-2xl font-bold text-yellow-600">{attendees.length - checkedInCount}</p>
        </div>
        <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-gray-400">Check-in Rate</p>
          <p className="mt-1 text-2xl font-bold text-brand">
            {attendees.length > 0 ? Math.round((checkedInCount / attendees.length) * 100) : 0}%
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-col gap-3 rounded-xl border border-gray-100 bg-white p-4 shadow-sm sm:flex-row sm:items-center">
        {/* Search */}
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-200 py-2 pl-10 pr-4 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
          />
        </div>

        {/* Ticket type filter */}
        {ticketTypes.length > 1 && (
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
          >
            <option value="all">All Tiers</option>
            {ticketTypes.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        )}

        {/* Check-in filter */}
        <select
          value={filterCheckin}
          onChange={(e) => setFilterCheckin(e.target.value as "all" | "checked_in" | "not_checked_in")}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
        >
          <option value="all">All Status</option>
          <option value="checked_in">Checked In</option>
          <option value="not_checked_in">Not Checked In</option>
        </select>

        {/* Sort */}
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as "newest" | "oldest" | "name")}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
        >
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
          <option value="name">Name A-Z</option>
        </select>
      </div>

      {/* Results count */}
      <p className="mb-3 text-xs text-gray-400">
        Showing {filtered.length} of {attendees.length} attendees
      </p>

      {/* Attendee list */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-gray-100 bg-white py-16 text-center shadow-sm">
          {attendees.length === 0 ? (
            <>
              <span className="text-4xl">👥</span>
              <p className="mt-3 text-lg font-semibold text-gray-900">No attendees yet</p>
              <p className="mt-1 text-sm text-gray-500">
                Attendees will appear here once tickets are purchased.
              </p>
            </>
          ) : (
            <>
              <span className="text-4xl">🔍</span>
              <p className="mt-3 text-lg font-semibold text-gray-900">No results</p>
              <p className="mt-1 text-sm text-gray-500">
                Try adjusting your search or filters.
              </p>
            </>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
          {/* Desktop table */}
          <div className="hidden sm:block">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                  <th className="px-5 py-3">Attendee</th>
                  <th className="px-5 py-3">Ticket</th>
                  <th className="px-5 py-3">Purchased</th>
                  <th className="px-5 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((a) => (
                  <tr key={a.ticket_id} className="transition-colors hover:bg-gray-50/50">
                    <td className="px-5 py-3.5">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{a.name}</p>
                        <p className="text-xs text-gray-400">{a.email}</p>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <span className="rounded-lg bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand">
                          {a.ticket_type}
                        </span>
                        <span className="text-xs text-gray-400">${a.ticket_price.toFixed(2)}</span>
                        {a.transferred && (
                          <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-600">
                            Transferred
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-gray-500">
                      {new Date(a.purchased_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-5 py-3.5">
                      {a.checked_in ? (
                        <div>
                          <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-600">
                            <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                            Checked In
                          </span>
                          {a.checked_in_at && (
                            <p className="mt-0.5 text-[10px] text-gray-400">
                              {new Date(a.checked_in_at).toLocaleString("en-US", {
                                month: "short",
                                day: "numeric",
                                hour: "numeric",
                                minute: "2-digit",
                              })}
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-yellow-50 px-2.5 py-1 text-xs font-semibold text-yellow-600">
                          <span className="h-1.5 w-1.5 rounded-full bg-yellow-400" />
                          Not Checked In
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="flex flex-col divide-y divide-gray-50 sm:hidden">
            {filtered.map((a) => (
              <div key={a.ticket_id} className="flex items-center gap-3 px-4 py-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-sm font-bold text-gray-500">
                  {a.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium text-gray-900">{a.name}</p>
                    {a.checked_in ? (
                      <span className="h-2 w-2 rounded-full bg-green-500" />
                    ) : (
                      <span className="h-2 w-2 rounded-full bg-yellow-400" />
                    )}
                  </div>
                  <p className="truncate text-xs text-gray-400">{a.email}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="rounded bg-brand-50 px-1.5 py-0.5 text-[10px] font-semibold text-brand">
                      {a.ticket_type}
                    </span>
                    <span className="text-[10px] text-gray-400">
                      {new Date(a.purchased_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </span>
                    {a.transferred && (
                      <span className="text-[10px] text-blue-500">Transferred</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
