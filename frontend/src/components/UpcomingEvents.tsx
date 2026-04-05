"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch, imageUrl } from "@/lib/api";
import type { EventListItem } from "@/types";

export function UpcomingEvents() {
  const [events, setEvents] = useState<EventListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<EventListItem[]>("/api/events/?limit=6")
      .then(setEvents)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-end justify-between sm:mb-8">
          <div>
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Upcoming Events</h2>
            <p className="mt-1 text-gray-500">Don&apos;t miss out</p>
          </div>
        </div>
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 sm:gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse overflow-hidden rounded-2xl border border-gray-100 bg-white">
              <div className="h-48 bg-gray-100" />
              <div className="p-5">
                <div className="h-5 w-3/4 rounded bg-gray-100" />
                <div className="mt-3 h-4 w-1/2 rounded bg-gray-100" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (events.length === 0) return null;

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 flex items-end justify-between sm:mb-8">
        <div>
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Upcoming Events</h2>
          <p className="mt-1 text-gray-500">Don&apos;t miss out</p>
        </div>
        <Link
          href="/events"
          className="hidden rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 sm:block"
        >
          View all
        </Link>
      </div>
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 sm:gap-6">
        {events.map((event) => {
          const date = new Date(event.start_time);
          const month = date.toLocaleDateString("en-US", { month: "short" }).toUpperCase();
          const day = date.getDate();

          return (
            <Link
              key={event.id}
              href={`/events/${event.id}`}
              className="group overflow-hidden rounded-2xl border border-gray-100 bg-white transition-all duration-300 hover:border-gray-200 hover:shadow-xl hover:shadow-gray-200/50 hover:-translate-y-1"
            >
              <div className="relative h-48 overflow-hidden bg-gradient-to-br from-brand-50 to-purple-100">
                {event.cover_image ? (
                  <>
                    <img
                      src={imageUrl(event.cover_image)}
                      alt={event.title}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                  </>
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <span className="text-5xl opacity-30 transition-transform duration-500 group-hover:scale-110">🎪</span>
                  </div>
                )}
                {/* Date badge */}
                <div className="absolute left-3 top-3 flex flex-col items-center rounded-xl bg-white/90 px-3 py-1.5 shadow-sm backdrop-blur-sm">
                  <span className="text-[10px] font-bold text-brand">{month}</span>
                  <span className="text-lg font-bold leading-tight">{day}</span>
                </div>
                {/* Location pill on image */}
                {event.location && event.cover_image && (
                  <div className="absolute bottom-3 left-3 rounded-full bg-black/50 px-3 py-1 backdrop-blur-sm">
                    <p className="text-xs font-medium text-white">
                      📍 {event.location}
                    </p>
                  </div>
                )}
              </div>
              <div className="p-5">
                <h3 className="text-lg font-semibold transition-colors group-hover:text-brand">
                  {event.title}
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  {date.toLocaleDateString("en-US", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </p>
                {event.location && !event.cover_image && (
                  <p className="mt-1 flex items-center gap-1 text-sm text-gray-400">
                    <span>📍</span> {event.location}
                  </p>
                )}
              </div>
            </Link>
          );
        })}
      </div>
      <div className="mt-6 text-center sm:hidden">
        <Link
          href="/events"
          className="rounded-lg border border-gray-200 px-6 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50"
        >
          View all events
        </Link>
      </div>
    </div>
  );
}
