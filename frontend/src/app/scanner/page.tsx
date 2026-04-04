"use client";

import { useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/useAuth";

interface CheckInResult {
  status: "success" | "error" | "already_used";
  message: string;
  attendee_name?: string;
  ticket_type?: string;
  event_title?: string;
  checked_in_at?: string;
}

export default function ScannerPage() {
  const { user, loading: authLoading, isOrganizer } = useAuth();
  const [result, setResult] = useState<CheckInResult | null>(null);
  const [scanning, setScanning] = useState(false);
  const [manualToken, setManualToken] = useState("");
  const scannerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  function extractToken(input: string): string {
    // Handle both raw tokens and URLs like http://localhost:3000/ticket/abc123
    const urlMatch = input.match(/\/ticket\/([a-f0-9]+)/);
    if (urlMatch) return urlMatch[1];
    return input.trim();
  }

  async function handleScan(rawInput: string) {
    if (!rawInput) return;
    setResult(null);
    const token = extractToken(rawInput);

    try {
      const data = await apiFetch<any>(`/api/tickets/${token}/checkin`, {
        method: "POST",
      });
      setResult({
        status: "success",
        message: "Checked in!",
        attendee_name: data.attendee_name,
        ticket_type: data.ticket_type,
        event_title: data.event_title,
        checked_in_at: data.checked_in_at,
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Something went wrong";
      setResult({
        status: message.includes("Already") ? "already_used" : "error",
        message,
      });
    }
  }

  async function startScanner() {
    setScanning(true);
    setResult(null);

    // Dynamic import to avoid SSR issues
    const { Html5Qrcode } = await import("html5-qrcode");

    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
      } catch {}
    }

    const scanner = new Html5Qrcode("qr-reader");
    scannerRef.current = scanner;

    try {
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        async (decodedText: string) => {
          // Pause scanning while processing
          try {
            await scanner.pause();
          } catch {}
          await handleScan(decodedText);
          // Resume after a short delay
          setTimeout(async () => {
            try {
              await scanner.resume();
            } catch {}
          }, 3000);
        },
        () => {} // ignore errors (no QR found in frame)
      );
    } catch {
      setScanning(false);
    }
  }

  async function stopScanner() {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
      } catch {}
    }
    setScanning(false);
  }

  function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault();
    handleScan(manualToken.trim());
    setManualToken("");
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        try {
          scannerRef.current.stop();
        } catch {}
      }
    };
  }, []);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-brand" />
      </div>
    );
  }

  if (!user || !isOrganizer) {
    return (
      <div className="flex flex-col items-center gap-4 py-20 text-center">
        <span className="text-5xl">🔒</span>
        <h2 className="text-2xl font-bold">Organizer Access Only</h2>
        <p className="text-gray-500">
          Only event organizers can use the check-in scanner.
        </p>
        <a
          href="/host"
          className="rounded-xl bg-brand px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-brand/25 hover:bg-brand-dark"
        >
          Become an Organizer
        </a>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg">
      <div className="mb-6 text-center sm:mb-8">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Check-in Scanner</h1>
        <p className="mt-1 text-gray-500">
          Scan attendee QR codes to check them in
        </p>
      </div>

      {/* Scanner */}
      <div className="mb-6 overflow-hidden rounded-2xl border border-gray-100 bg-white">
        <div
          id="qr-reader"
          ref={containerRef}
          className={scanning ? "block" : "hidden"}
        />

        {!scanning ? (
          <div className="flex flex-col items-center gap-4 p-12">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-brand-50 text-4xl">
              📷
            </div>
            <p className="text-sm text-gray-500">
              Use your camera to scan ticket QR codes
            </p>
            <button
              onClick={startScanner}
              className="rounded-xl bg-brand px-8 py-3 text-sm font-semibold text-white shadow-lg shadow-brand/25 transition-all hover:bg-brand-dark"
            >
              Start Camera
            </button>
          </div>
        ) : (
          <div className="p-4">
            <button
              onClick={stopScanner}
              className="w-full rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50"
            >
              Stop Camera
            </button>
          </div>
        )}
      </div>

      {/* Manual entry */}
      <div className="mb-6 rounded-2xl border border-gray-100 bg-white p-4 sm:p-6">
        <h2 className="mb-3 text-sm font-semibold text-gray-700">
          Or enter ticket code manually
        </h2>
        <form onSubmit={handleManualSubmit} className="flex flex-col gap-2 sm:flex-row">
          <input
            type="text"
            value={manualToken}
            onChange={(e) => setManualToken(e.target.value)}
            placeholder="Paste ticket code..."
            className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
          />
          <button
            type="submit"
            className="rounded-xl bg-brand px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-dark"
          >
            Check In
          </button>
        </form>
      </div>

      {/* Result */}
      {result && (
        <div
          className={`rounded-2xl p-6 ${
            result.status === "success"
              ? "border-2 border-green-200 bg-green-50"
              : result.status === "already_used"
              ? "border-2 border-yellow-200 bg-yellow-50"
              : "border-2 border-red-200 bg-red-50"
          }`}
        >
          <div className="mb-3 flex items-center gap-3">
            <span className="text-3xl">
              {result.status === "success"
                ? "✅"
                : result.status === "already_used"
                ? "⚠️"
                : "❌"}
            </span>
            <div>
              <p
                className={`text-lg font-bold ${
                  result.status === "success"
                    ? "text-green-700"
                    : result.status === "already_used"
                    ? "text-yellow-700"
                    : "text-red-700"
                }`}
              >
                {result.status === "success"
                  ? "Checked In!"
                  : result.status === "already_used"
                  ? "Already Used"
                  : "Invalid Ticket"}
              </p>
              <p
                className={`text-sm ${
                  result.status === "success"
                    ? "text-green-600"
                    : result.status === "already_used"
                    ? "text-yellow-600"
                    : "text-red-600"
                }`}
              >
                {result.message}
              </p>
            </div>
          </div>

          {result.attendee_name && (
            <div className="mt-4 grid grid-cols-1 gap-3 border-t border-green-200 pt-4 sm:grid-cols-2">
              <div>
                <p className="text-xs text-green-500">Attendee</p>
                <p className="font-semibold text-green-800">
                  {result.attendee_name}
                </p>
              </div>
              <div>
                <p className="text-xs text-green-500">Ticket Type</p>
                <p className="font-semibold text-green-800">
                  {result.ticket_type}
                </p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-xs text-green-500">Event</p>
                <p className="font-semibold text-green-800">
                  {result.event_title}
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
