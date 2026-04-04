"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { apiFetch, imageUrl } from "@/lib/api";
import type { EventListItem } from "@/types";

export default function EventsPage() {
  const [events, setEvents] = useState<EventListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [location, setLocation] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sort, setSort] = useState("date");
  const [showFilters, setShowFilters] = useState(false);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("q", search);
    if (location) params.set("location", location);
    if (dateFrom) params.set("date_from", new Date(dateFrom).toISOString());
    if (dateTo) params.set("date_to", new Date(dateTo).toISOString());
    if (sort) params.set("sort", sort);

    const query = params.toString() ? `?${params.toString()}` : "";
    const data = await apiFetch<EventListItem[]>(`/api/events/${query}`);
    setEvents(data);
    setLoading(false);
  }, [search, location, dateFrom, dateTo, sort]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Debounce search
  const [searchInput, setSearchInput] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const [locationInput, setLocationInput] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => setLocation(locationInput), 300);
    return () => clearTimeout(timer);
  }, [locationInput]);

  const hasFilters = location || dateFrom || dateTo || sort !== "date";

  function clearFilters() {
    setLocationInput("");
    setLocation("");
    setDateFrom("");
    setDateTo("");
    setSort("date");
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Explore Events</h1>
        <p className="mt-1 text-gray-500">Find your next experience</p>
      </div>

      {/* Search Bar */}
      <div className="mb-6 flex flex-col gap-3">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
              🔍
            </span>
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search events..."
              className="w-full rounded-xl border border-gray-200 py-3 pl-11 pr-4 text-sm transition-colors focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 rounded-xl border px-5 py-3 text-sm font-medium transition-colors ${
              showFilters || hasFilters
                ? "border-brand bg-brand-50 text-brand"
                : "border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
          >
            <span>⚙️</span> Filters
            {hasFilters && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand text-[10px] text-white">
                !
              </span>
            )}
          </button>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500">
                  Location
                </label>
                <input
                  type="text"
                  value={locationInput}
                  onChange={(e) => setLocationInput(e.target.value)}
                  placeholder="Any location"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500">
                  From Date
                </label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500">
                  To Date
                </label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500">
                  Sort By
                </label>
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                >
                  <option value="date">Date (soonest)</option>
                  <option value="newest">Recently Added</option>
                </select>
              </div>
            </div>
            {hasFilters && (
              <button
                onClick={clearFilters}
                className="mt-3 text-xs font-medium text-brand hover:text-brand-dark"
              >
                Clear all filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* Results */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-brand" />
        </div>
      ) : events.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-gray-200 py-20">
          <span className="text-4xl">🔍</span>
          {search || hasFilters ? (
            <>
              <p className="text-gray-500">
                No events match your search
              </p>
              <button
                onClick={() => {
                  setSearchInput("");
                  setSearch("");
                  clearFilters();
                }}
                className="rounded-lg bg-brand px-5 py-2 text-sm font-medium text-white hover:bg-brand-dark"
              >
                Clear search
              </button>
            </>
          ) : (
            <>
              <p className="text-gray-500">No events yet. Check back soon!</p>
              <Link
                href="/host"
                className="rounded-lg bg-brand px-5 py-2 text-sm font-medium text-white hover:bg-brand-dark"
              >
                Create the first one
              </Link>
            </>
          )}
        </div>
      ) : (
        <>
          {(search || hasFilters) && (
            <p className="mb-4 text-sm text-gray-400">
              {events.length} event{events.length !== 1 ? "s" : ""} found
            </p>
          )}
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 sm:gap-6">
            {events.map((event) => {
              const date = new Date(event.start_time);
              const month = date
                .toLocaleDateString("en-US", { month: "short" })
                .toUpperCase();
              const day = date.getDate();

              return (
                <Link
                  key={event.id}
                  href={`/events/${event.id}`}
                  className="group overflow-hidden rounded-2xl border border-gray-100 bg-white transition-all hover:border-gray-200 hover:shadow-lg hover:shadow-gray-100"
                >
                  <div className="relative h-48 bg-gradient-to-br from-brand-50 to-brand-light/20">
                    {event.cover_image ? (
                      <img
                        src={imageUrl(event.cover_image)}
                        alt={event.title}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-5xl opacity-50">
                        🎪
                      </div>
                    )}
                    <div className="absolute left-4 top-4 flex flex-col items-center rounded-xl bg-white/90 px-3 py-1.5 backdrop-blur-sm">
                      <span className="text-xs font-bold text-brand">
                        {month}
                      </span>
                      <span className="text-lg font-bold leading-tight">
                        {day}
                      </span>
                    </div>
                  </div>
                  <div className="p-5">
                    <h2 className="text-lg font-semibold transition-colors group-hover:text-brand">
                      {event.title}
                    </h2>
                    <p className="mt-1 text-sm text-gray-500">
                      {date.toLocaleDateString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </p>
                    {event.location && (
                      <p className="mt-1 flex items-center gap-1 text-sm text-gray-400">
                        <span>📍</span> {event.location}
                      </p>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
