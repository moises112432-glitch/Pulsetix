"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { apiFetch, API_BASE } from "@/lib/api";

interface TicketDetail {
  ticket_id: number;
  qr_code_token: string;
  ticket_type: string;
  event_title: string;
  event_location: string | null;
  event_start: string;
  event_end: string;
  attendee_name: string;
  checked_in: boolean;
}

export default function TicketPage() {
  const params = useParams();
  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`${API_BASE}/api/tickets/${params.token}/public`)
      .then((r) => r.ok ? r.json() : Promise.reject())
      .then(setTicket)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [params.token]);

  async function handleDownload() {
    if (!cardRef.current) return;

    // Use html2canvas to capture the ticket card as an image
    const { default: html2canvas } = await import("html2canvas");
    const canvas = await html2canvas(cardRef.current, {
      scale: 3,
      backgroundColor: null,
      useCORS: true,
    });

    const link = document.createElement("a");
    link.download = `ticket-${ticket?.qr_code_token.slice(0, 8)}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-brand" />
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="py-20 text-center">
        <p className="text-lg text-gray-500">Ticket not found.</p>
      </div>
    );
  }

  const startDate = new Date(ticket.event_start);
  const endDate = new Date(ticket.event_end);

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-2 py-4 sm:gap-6 sm:px-0 sm:py-8">
      {/* Ticket Card */}
      <div
        ref={cardRef}
        className="w-full overflow-hidden rounded-3xl bg-white shadow-xl"
      >
        {/* Top colored section */}
        <div className="bg-gradient-to-br from-brand to-brand-dark px-5 pb-6 pt-6 text-white sm:px-8 sm:pb-8 sm:pt-8">
          <p className="mb-1 text-xs font-medium uppercase tracking-widest opacity-80 sm:text-sm">
            {ticket.ticket_type}
          </p>
          <h1 className="text-xl font-bold sm:text-2xl">{ticket.event_title}</h1>
          <div className="mt-4 flex flex-col gap-1.5 text-sm opacity-90">
            <p>
              📅{" "}
              {startDate.toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </p>
            <p>
              🕐{" "}
              {startDate.toLocaleTimeString("en-US", {
                hour: "numeric",
                minute: "2-digit",
              })}{" "}
              —{" "}
              {endDate.toLocaleTimeString("en-US", {
                hour: "numeric",
                minute: "2-digit",
              })}
            </p>
            {ticket.event_location && <p>📍 {ticket.event_location}</p>}
          </div>
        </div>

        {/* Tear line */}
        <div className="relative flex items-center">
          <div className="-ml-4 h-8 w-8 rounded-full bg-gray-50" />
          <div className="flex-1 border-t-2 border-dashed border-gray-200" />
          <div className="-mr-4 h-8 w-8 rounded-full bg-gray-50" />
        </div>

        {/* Bottom section with QR */}
        <div className="flex flex-col items-center px-5 pb-6 pt-4 sm:px-8 sm:pb-8">
          <p className="mb-1 text-sm font-medium text-gray-500">
            {ticket.attendee_name}
          </p>
          <img
            src={`${API_BASE}/api/tickets/${ticket.qr_code_token}/qr.png`}
            alt="QR Code"
            className="my-4 h-48 w-48"
            crossOrigin="anonymous"
          />
          <p className="font-mono text-xs text-gray-300">
            {ticket.qr_code_token}
          </p>
          {ticket.checked_in && (
            <div className="mt-4 rounded-full bg-green-50 px-4 py-1.5 text-sm font-medium text-green-600">
              ✓ Checked In
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex w-full gap-3">
        <button
          onClick={handleDownload}
          className="flex-1 rounded-xl bg-brand py-3 text-sm font-semibold text-white shadow-lg shadow-brand/25 transition-all hover:bg-brand-dark"
        >
          Download Ticket
        </button>
      </div>

      <p className="text-center text-xs text-gray-400">
        Show this QR code at the event entrance for check-in
      </p>
    </div>
  );
}
