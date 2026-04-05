"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiFetch, API_BASE, imageUrl } from "@/lib/api";
import { useAuth } from "@/lib/useAuth";
import type { Event, PromoCode, Promoter } from "@/types";

function toLocalDatetime(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function EditEventPage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading: authLoading, isOrganizer } = useAuth();

  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [promos, setPromos] = useState<PromoCode[]>([]);
  const [newPromo, setNewPromo] = useState({ code: "", discount: "10", maxUses: "" });
  const [promoError, setPromoError] = useState("");
  const [hideRemaining, setHideRemaining] = useState(false);
  const [affiliateMode, setAffiliateMode] = useState<"off" | "public" | "private">("off");
  const [affiliatePercent, setAffiliatePercent] = useState("10");
  const [promoters, setPromoters] = useState<Promoter[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [invitePromoCode, setInvitePromoCode] = useState("");
  const [inviteDiscount, setInviteDiscount] = useState("");
  const [inviteError, setInviteError] = useState("");
  const [inviting, setInviting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    Promise.all([
      apiFetch<Event>(`/api/events/${params.id}`),
      apiFetch<PromoCode[]>(`/api/promos/events/${params.id}`).catch(() => []),
      apiFetch<Promoter[]>(`/api/promoters/events/${params.id}`).catch(() => []),
    ])
      .then(([data, promosData, promotersData]) => {
        setEvent(data);
        setTitle(data.title);
        setDescription(data.description || "");
        setLocation(data.location || "");
        setStartTime(toLocalDatetime(data.start_time));
        setEndTime(toLocalDatetime(data.end_time));
        if (data.cover_image) {
          setCoverPreview(imageUrl(data.cover_image));
        }
        setHideRemaining(data.hide_remaining_tickets || false);
        setAffiliateMode(data.affiliate_mode || "off");
        setAffiliatePercent(data.affiliate_commission_percent?.toString() || "10");
        setPromos(promosData);
        setPromoters(promotersData);
      })
      .finally(() => setLoading(false));
  }, [params.id]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setCoverFile(file);
      setCoverPreview(URL.createObjectURL(file));
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!event) return;
    setError("");
    setSaving(true);
    setSuccess(false);

    try {
      await apiFetch(`/api/events/${event.id}`, {
        method: "PUT",
        body: JSON.stringify({
          title,
          description: description || null,
          location: location || null,
          start_time: new Date(startTime).toISOString(),
          end_time: new Date(endTime).toISOString(),
          hide_remaining_tickets: hideRemaining,
          affiliate_mode: affiliateMode,
          affiliate_commission_percent: affiliateMode !== "off" ? parseFloat(affiliatePercent) : null,
        }),
      });

      if (coverFile) {
        const formData = new FormData();
        formData.append("file", coverFile);
        const token = localStorage.getItem("token");
        await fetch(`${API_BASE}/api/events/${event.id}/cover`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });
      }

      setSuccess(true);
      setCoverFile(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function handleCreatePromo() {
    if (!event) return;
    setPromoError("");
    if (!newPromo.code.trim()) {
      setPromoError("Enter a promo code");
      return;
    }
    try {
      await apiFetch(`/api/promos/events/${event.id}`, {
        method: "POST",
        body: JSON.stringify({
          code: newPromo.code,
          discount_percent: parseFloat(newPromo.discount),
          max_uses: newPromo.maxUses ? parseInt(newPromo.maxUses) : null,
        }),
      });
      const data = await apiFetch<PromoCode[]>(`/api/promos/events/${event.id}`);
      setPromos(data);
      setNewPromo({ code: "", discount: "10", maxUses: "" });
    } catch (err) {
      setPromoError(err instanceof Error ? err.message : "Failed to create promo code");
    }
  }

  async function handleDeletePromo(promoId: number) {
    if (!event) return;
    await apiFetch(`/api/promos/${promoId}`, { method: "DELETE" });
    const data = await apiFetch<PromoCode[]>(`/api/promos/events/${event.id}`);
    setPromos(data);
  }

  async function handleTogglePromo(promoId: number) {
    if (!event) return;
    await apiFetch(`/api/promos/${promoId}/toggle`, { method: "PATCH" });
    const data = await apiFetch<PromoCode[]>(`/api/promos/events/${event.id}`);
    setPromos(data);
  }

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-brand" />
      </div>
    );
  }

  if (!user || !isOrganizer) {
    router.push("/host");
    return null;
  }

  if (!event) {
    return (
      <div className="py-20 text-center">
        <p className="text-lg text-gray-500">Event not found.</p>
      </div>
    );
  }

  if (event.organizer_id !== user.id) {
    return (
      <div className="py-20 text-center">
        <p className="text-lg text-gray-500">You don't have permission to edit this event.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6 flex items-center justify-between sm:mb-8">
        <div>
          <button
            onClick={() => router.push("/dashboard")}
            className="mb-2 text-sm text-gray-400 hover:text-gray-600"
          >
            &larr; Back to Dashboard
          </button>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Edit Event</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push(`/dashboard/events/${event.id}/attendees`)}
            className="flex items-center gap-1.5 rounded-full border border-brand/20 bg-brand-50 px-3 py-1 text-xs font-medium text-brand transition-colors hover:bg-brand hover:text-white"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Attendees
          </button>
          <span
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              event.status === "published"
                ? "bg-green-50 text-green-600"
                : event.status === "cancelled"
                ? "bg-red-50 text-red-600"
                : "bg-yellow-50 text-yellow-600"
            }`}
          >
            {event.status}
          </span>
        </div>
      </div>

      <form onSubmit={handleSave} className="flex flex-col gap-5 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:p-8">
        {/* Cover Image */}
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Cover Image
          </label>
          <div
            onClick={() => fileInputRef.current?.click()}
            className="flex cursor-pointer flex-col items-center gap-3 rounded-xl border-2 border-dashed border-gray-200 p-8 transition-colors hover:border-brand hover:bg-brand-50/30"
          >
            {coverPreview ? (
              <img
                src={coverPreview}
                alt="Cover preview"
                className="h-40 w-full rounded-lg object-cover"
              />
            ) : (
              <>
                <span className="text-3xl">🖼️</span>
                <p className="text-sm text-gray-500">Click to upload a cover image</p>
                <p className="text-xs text-gray-400">JPEG, PNG, or WebP</p>
              </>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Event Title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
            required
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
            rows={4}
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Location
          </label>
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Start Date & Time
            </label>
            <input
              type="datetime-local"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              End Date & Time
            </label>
            <input
              type="datetime-local"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
              required
            />
          </div>
        </div>

        {/* Ticket Tiers (read-only summary) */}
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Ticket Tiers
          </label>
          <div className="flex flex-col gap-2">
            {event.ticket_types
              .sort((a, b) => a.tier_order - b.tier_order)
              .map((tt) => (
                <div
                  key={tt.id}
                  className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50/50 px-4 py-3"
                >
                  <div>
                    <span className="text-sm font-medium">{tt.name}</span>
                    <span className="ml-3 text-sm text-gray-500">
                      ${tt.price.toFixed(2)}
                    </span>
                  </div>
                  <span className="text-xs text-gray-400">
                    {tt.quantity_sold} / {tt.quantity_total} sold
                  </span>
                </div>
              ))}
          </div>
          <p className="mt-2 text-xs text-gray-400">
            Ticket tiers cannot be edited after creation to protect existing orders.
          </p>
          <div className="mt-3 flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50/50 px-4 py-3">
            <div>
              <p className="text-xs font-medium text-gray-700">Hide remaining ticket count</p>
              <p className="text-xs text-gray-400">Show "Available" instead of exact number</p>
            </div>
            <button
              type="button"
              onClick={() => setHideRemaining(!hideRemaining)}
              className={`relative h-6 w-11 rounded-full transition-colors ${
                hideRemaining ? "bg-brand" : "bg-gray-300"
              }`}
            >
              <span
                className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                  hideRemaining ? "translate-x-5" : ""
                }`}
              />
            </button>
          </div>
        </div>

        {/* Promo Codes */}
        <div>
          <label className="mb-3 block text-sm font-medium text-gray-700">
            Promo Codes
          </label>

          {/* Add new promo */}
          <div className="mb-4 rounded-xl border border-gray-100 bg-gray-50/50 p-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs text-gray-400">Code</label>
                <input
                  type="text"
                  value={newPromo.code}
                  onChange={(e) => setNewPromo({ ...newPromo, code: e.target.value.toUpperCase() })}
                  placeholder="e.g. VIP20"
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm uppercase focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-gray-400">Discount (%)</label>
                <input
                  type="number"
                  value={newPromo.discount}
                  onChange={(e) => setNewPromo({ ...newPromo, discount: e.target.value })}
                  min="1"
                  max="100"
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-gray-400">Max Uses (empty = unlimited)</label>
                <input
                  type="number"
                  value={newPromo.maxUses}
                  onChange={(e) => setNewPromo({ ...newPromo, maxUses: e.target.value })}
                  placeholder="Unlimited"
                  min="1"
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                />
              </div>
            </div>
            {promoError && <p className="mt-2 text-xs text-red-500">{promoError}</p>}
            <button
              type="button"
              onClick={handleCreatePromo}
              className="mt-3 rounded-lg bg-brand px-4 py-1.5 text-xs font-medium text-white hover:bg-brand-dark"
            >
              + Add Promo Code
            </button>
          </div>

          {/* Promo code list */}
          {promos.length > 0 ? (
            <div className="flex flex-col gap-2">
              {promos.map((p) => (
                <div
                  key={p.id}
                  className={`flex flex-col gap-2 rounded-xl border p-3 sm:flex-row sm:items-center sm:justify-between ${
                    p.active ? "border-gray-100 bg-white" : "border-gray-100 bg-gray-50 opacity-60"
                  }`}
                >
                  <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                    <span className="rounded-lg bg-brand-50 px-3 py-1 font-mono text-sm font-bold text-brand">
                      {p.code}
                    </span>
                    <span className="text-sm font-medium text-green-600">
                      {p.discount_percent}% off
                    </span>
                    <span className="text-xs text-gray-400">
                      {p.times_used}{p.max_uses ? ` / ${p.max_uses}` : ""} used
                    </span>
                    {!p.active && (
                      <span className="rounded-full bg-gray-200 px-2 py-0.5 text-[10px] font-bold uppercase text-gray-500">
                        Disabled
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleTogglePromo(p.id)}
                      className="rounded-lg border border-gray-200 px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50"
                    >
                      {p.active ? "Disable" : "Enable"}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeletePromo(p.id)}
                      className="rounded-lg border border-red-100 px-3 py-1 text-xs font-medium text-red-500 hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-400">
              No promo codes yet. Add one above to offer discounts.
            </p>
          )}
        </div>

        {/* Affiliate Program */}
        <div className="rounded-xl border border-purple-100 bg-purple-50/50 p-5">
          <div>
            <label className="text-sm font-medium text-gray-700">
              Affiliate Program
            </label>
            <p className="mb-3 text-xs text-gray-400">
              Let promoters earn commission by sharing your event
            </p>
            <div className="flex gap-2">
              {(["off", "public", "private"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setAffiliateMode(mode)}
                  className={`rounded-lg px-4 py-2 text-xs font-semibold transition-colors ${
                    affiliateMode === mode
                      ? "bg-purple-600 text-white"
                      : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {mode === "off" ? "Off" : mode === "public" ? "Public" : "Private"}
                </button>
              ))}
            </div>
            {affiliateMode === "public" && (
              <p className="mt-2 text-xs text-purple-600">
                Anyone who buys a ticket automatically becomes a promoter and can share their link.
              </p>
            )}
            {affiliateMode === "private" && (
              <p className="mt-2 text-xs text-purple-600">
                Only promoters you invite can earn commission. You can assign them personal promo codes.
              </p>
            )}
          </div>
          {affiliateMode !== "off" && (
            <div className="mt-4">
              <label className="mb-1 block text-xs text-gray-500">
                Commission Rate (%)
              </label>
              <input
                type="number"
                value={affiliatePercent}
                onChange={(e) => setAffiliatePercent(e.target.value)}
                min="1"
                max="50"
                className="w-32 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
              />
              <p className="mt-1 text-xs text-gray-400">
                Promoters earn {affiliatePercent}% of each sale they refer
              </p>
            </div>
          )}
        </div>

        {/* Invite Promoters (Private mode) */}
        {affiliateMode === "private" && (
          <div className="rounded-xl border border-purple-100 bg-white p-5">
            <label className="mb-3 block text-sm font-medium text-gray-700">
              Invite Promoters
            </label>

            {/* Invite form */}
            <div className="mb-4 rounded-xl border border-gray-100 bg-gray-50/50 p-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                  <label className="mb-1 block text-xs text-gray-400">Email</label>
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="promoter@email.com"
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-gray-400">Promo Code (optional)</label>
                  <input
                    type="text"
                    value={invitePromoCode}
                    onChange={(e) => setInvitePromoCode(e.target.value.toUpperCase())}
                    placeholder="e.g. JOHN20"
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm uppercase focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-gray-400">Discount % (optional)</label>
                  <input
                    type="number"
                    value={inviteDiscount}
                    onChange={(e) => setInviteDiscount(e.target.value)}
                    placeholder="e.g. 10"
                    min="0"
                    max="100"
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                  />
                </div>
              </div>
              {inviteError && <p className="mt-2 text-xs text-red-500">{inviteError}</p>}
              <button
                type="button"
                disabled={inviting || !inviteEmail.trim()}
                onClick={async () => {
                  if (!event) return;
                  setInviting(true);
                  setInviteError("");
                  try {
                    await apiFetch(`/api/promoters/events/${event.id}/invite`, {
                      method: "POST",
                      body: JSON.stringify({
                        email: inviteEmail,
                        personal_promo_code: invitePromoCode || null,
                        promo_code_discount_percent: inviteDiscount ? parseFloat(inviteDiscount) : null,
                      }),
                    });
                    const data = await apiFetch<Promoter[]>(`/api/promoters/events/${event.id}`);
                    setPromoters(data);
                    setInviteEmail("");
                    setInvitePromoCode("");
                    setInviteDiscount("");
                  } catch (err) {
                    setInviteError(err instanceof Error ? err.message : "Failed to invite");
                  } finally {
                    setInviting(false);
                  }
                }}
                className="mt-3 rounded-lg bg-purple-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-purple-700 disabled:opacity-50"
              >
                {inviting ? "Sending..." : "+ Invite Promoter"}
              </button>
            </div>

            {/* Promoter list */}
            {promoters.length > 0 ? (
              <div className="flex flex-col gap-2">
                {promoters.map((p) => (
                  <div
                    key={p.id}
                    className="flex flex-col gap-2 rounded-xl border border-gray-100 bg-white p-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                      <span className="text-sm font-medium text-gray-900">
                        {p.user_name || p.email}
                      </span>
                      {p.personal_promo_code && (
                        <span className="rounded-lg bg-purple-50 px-3 py-1 font-mono text-xs font-bold text-purple-600">
                          {p.personal_promo_code}
                        </span>
                      )}
                      {p.promo_code_discount_percent != null && p.promo_code_discount_percent > 0 && (
                        <span className="text-xs text-green-600">
                          {p.promo_code_discount_percent}% off
                        </span>
                      )}
                      <span className="text-xs text-gray-400">
                        {p.total_sales} sales · ${p.total_revenue.toFixed(0)} rev
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        if (!event) return;
                        await apiFetch(`/api/promoters/events/${event.id}/promoters/${p.id}`, { method: "DELETE" });
                        setPromoters(promoters.filter((x) => x.id !== p.id));
                      }}
                      className="rounded-lg border border-red-100 px-3 py-1 text-xs font-medium text-red-500 hover:bg-red-50"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-400">
                No promoters invited yet. Add one above.
              </p>
            )}
          </div>
        )}

        {/* Promoter list (Public mode - read only) */}
        {affiliateMode === "public" && promoters.length > 0 && (
          <div className="rounded-xl border border-purple-100 bg-white p-5">
            <label className="mb-3 block text-sm font-medium text-gray-700">
              Active Promoters ({promoters.length})
            </label>
            <div className="flex flex-col gap-2">
              {promoters.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50/50 p-3"
                >
                  <span className="text-sm font-medium text-gray-900">
                    {p.user_name || p.email}
                  </span>
                  <span className="text-xs text-gray-400">
                    {p.total_sales} sales · ${p.total_revenue.toFixed(0)} rev
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        {success && (
          <div className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-600">
            Event updated successfully!
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="flex-1 rounded-xl bg-brand py-3 text-sm font-semibold text-white shadow-lg shadow-brand/25 transition-all hover:bg-brand-dark disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
          <button
            type="button"
            onClick={() => router.push("/dashboard")}
            className="rounded-xl border border-gray-200 px-6 py-3 text-sm font-semibold text-gray-600 transition-all hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
