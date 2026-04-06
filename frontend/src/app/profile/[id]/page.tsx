"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch, imageUrl } from "@/lib/api";
import type { UserProfile } from "@/types";

export default function ProfilePage() {
  const params = useParams();
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [isOwnProfile, setIsOwnProfile] = useState(false);

  useEffect(() => {
    apiFetch<UserProfile>(`/api/users/${params.id}/profile`)
      .then((data) => {
        setProfile(data);
        // Check if this is the current user's profile
        const token = localStorage.getItem("token");
        if (token) {
          apiFetch<{ id: number }>("/api/auth/me")
            .then((me) => {
              setIsOwnProfile(me.id === data.id);
            })
            .catch(() => {});
          apiFetch<{ following: boolean }>(`/api/users/${params.id}/is-following`)
            .then((d) => setIsFollowing(d.following))
            .catch(() => {});
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [params.id]);

  async function handleFollow() {
    if (!profile) return;
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/auth");
      return;
    }
    setFollowLoading(true);
    try {
      if (isFollowing) {
        await apiFetch(`/api/users/${profile.id}/follow`, { method: "DELETE" });
        setIsFollowing(false);
        setProfile((p) => p ? { ...p, follower_count: Math.max(0, p.follower_count - 1) } : p);
      } else {
        await apiFetch(`/api/users/${profile.id}/follow`, { method: "POST" });
        setIsFollowing(true);
        setProfile((p) => p ? { ...p, follower_count: p.follower_count + 1 } : p);
      }
    } catch {}
    setFollowLoading(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-brand" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="py-20 text-center">
        <p className="text-lg text-gray-500">User not found.</p>
      </div>
    );
  }

  const memberSince = new Date(profile.member_since);
  const isOrganizer = profile.role === "organizer" || profile.role === "admin";
  const now = new Date();
  const upcomingEvents = profile.events.filter((e) => new Date(e.start_time) >= now);
  const pastEvents = profile.events.filter((e) => new Date(e.start_time) < now);

  return (
    <div className="mx-auto max-w-3xl">
      {/* Profile Header */}
      <div className="relative mb-8 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        {/* Banner */}
        <div className="h-32 bg-gradient-to-r from-brand via-purple-500 to-brand-dark sm:h-40" />

        {/* Avatar + Info */}
        <div className="relative px-6 pb-6">
          <div className="-mt-12 flex flex-col gap-4 sm:-mt-14 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex items-end gap-4">
              <div className="flex h-24 w-24 items-center justify-center rounded-2xl border-4 border-white bg-brand-50 text-3xl font-bold text-brand shadow-lg sm:h-28 sm:w-28">
                {profile.avatar ? (
                  <img src={profile.avatar} alt="" className="h-full w-full rounded-xl object-cover" />
                ) : (
                  profile.name.charAt(0).toUpperCase()
                )}
              </div>
              <div className="pb-1">
                <h1 className="text-2xl font-bold tracking-tight">{profile.name}</h1>
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    isOrganizer ? "bg-brand-50 text-brand" : "bg-gray-100 text-gray-500"
                  }`}>
                    {isOrganizer ? "Organizer" : "Attendee"}
                  </span>
                  <span className="text-xs text-gray-400">
                    Joined {memberSince.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                  </span>
                </div>
              </div>
            </div>

            {!isOwnProfile && (
              <button
                onClick={handleFollow}
                disabled={followLoading}
                className={`rounded-xl px-6 py-2.5 text-sm font-semibold transition-all disabled:opacity-50 ${
                  isFollowing
                    ? "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                    : "bg-brand text-white shadow-lg shadow-brand/25 hover:bg-brand-dark"
                }`}
              >
                {isFollowing ? "Following" : "Follow"}
              </button>
            )}
          </div>

          {/* Stats */}
          <div className="mt-6 flex gap-6">
            <div className="text-center">
              <p className="text-xl font-bold text-gray-900">{profile.follower_count}</p>
              <p className="text-xs text-gray-400">Followers</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold text-gray-900">{profile.following_count}</p>
              <p className="text-xs text-gray-400">Following</p>
            </div>
            {isOrganizer && (
              <>
                <div className="text-center">
                  <p className="text-xl font-bold text-gray-900">{profile.total_events}</p>
                  <p className="text-xs text-gray-400">Events</p>
                </div>
                <div className="text-center">
                  <p className="text-xl font-bold text-gray-900">{profile.total_tickets_sold}</p>
                  <p className="text-xs text-gray-400">Tickets Sold</p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Events */}
      {isOrganizer && profile.events.length > 0 && (
        <div>
          {/* Upcoming Events */}
          {upcomingEvents.length > 0 && (
            <div className="mb-8">
              <h2 className="mb-4 text-lg font-bold tracking-tight">Upcoming Events</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {upcomingEvents.map((event) => (
                  <Link
                    key={event.id}
                    href={`/events/${event.id}`}
                    className="group overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-all hover:-translate-y-1 hover:shadow-md"
                  >
                    <div className="relative h-36 overflow-hidden bg-gradient-to-br from-brand-50 to-purple-50">
                      {event.cover_image ? (
                        <img
                          src={imageUrl(event.cover_image)}
                          alt={event.title}
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-4xl opacity-30">
                          🎪
                        </div>
                      )}
                      <div className="absolute bottom-2 left-2 rounded-lg bg-white/90 px-2.5 py-1 text-xs font-semibold text-brand backdrop-blur-sm">
                        {new Date(event.start_time).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </div>
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold text-gray-900 group-hover:text-brand">{event.title}</h3>
                      {event.location && (
                        <p className="mt-1 text-xs text-gray-400">{event.location}</p>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Past Events */}
          {pastEvents.length > 0 && (
            <div>
              <h2 className="mb-4 text-lg font-bold tracking-tight text-gray-400">Past Events</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {pastEvents.map((event) => (
                  <Link
                    key={event.id}
                    href={`/events/${event.id}`}
                    className="group overflow-hidden rounded-2xl border border-gray-100 bg-white opacity-70 shadow-sm transition-all hover:opacity-100"
                  >
                    <div className="relative h-28 overflow-hidden bg-gray-100">
                      {event.cover_image ? (
                        <img
                          src={imageUrl(event.cover_image)}
                          alt={event.title}
                          className="h-full w-full object-cover grayscale transition-all group-hover:grayscale-0"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-3xl opacity-20">
                          🎪
                        </div>
                      )}
                    </div>
                    <div className="p-3">
                      <h3 className="text-sm font-semibold text-gray-700">{event.title}</h3>
                      <p className="mt-0.5 text-xs text-gray-400">
                        {new Date(event.start_time).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* No events */}
      {isOrganizer && profile.events.length === 0 && (
        <div className="rounded-2xl border border-dashed border-gray-200 py-16 text-center">
          <span className="text-4xl">🎤</span>
          <p className="mt-3 text-gray-500">No events yet</p>
        </div>
      )}
    </div>
  );
}
