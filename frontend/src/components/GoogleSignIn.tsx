"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { apiFetch } from "@/lib/api";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: Record<string, unknown>) => void;
          renderButton: (element: HTMLElement, config: Record<string, unknown>) => void;
        };
      };
    };
  }
}

interface GoogleSignInProps {
  onSuccess?: () => void;
  becomeOrganizer?: boolean;
  redirectUrl?: string | null;
}

export default function GoogleSignIn({ onSuccess, becomeOrganizer, redirectUrl }: GoogleSignInProps) {
  const buttonRef = useRef<HTMLDivElement>(null);
  const callbackRef = useRef<(response: { credential: string }) => void>(undefined);
  const [error, setError] = useState("");

  const handleCredentialResponse = useCallback(async (response: { credential: string }) => {
    setError("");
    try {
      const data = await apiFetch<{ access_token: string }>("/api/auth/google", {
        method: "POST",
        body: JSON.stringify({ credential: response.credential }),
      });

      localStorage.setItem("token", data.access_token);

      if (becomeOrganizer) {
        await apiFetch("/api/users/me/become-organizer", { method: "POST" });
      }

      if (onSuccess) {
        onSuccess();
      } else {
        window.location.href = redirectUrl || (becomeOrganizer ? "/dashboard" : "/events");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Google sign-in failed");
    }
  }, [becomeOrganizer, onSuccess, redirectUrl]);

  callbackRef.current = handleCredentialResponse;

  useEffect(() => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!clientId || clientId === "your-google-client-id") return;

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.onload = () => {
      window.google?.accounts.id.initialize({
        client_id: clientId,
        callback: (resp: { credential: string }) => callbackRef.current?.(resp),
      });
      if (buttonRef.current) {
        window.google?.accounts.id.renderButton(buttonRef.current, {
          theme: "outline",
          size: "large",
          width: buttonRef.current.offsetWidth,
          text: "continue_with",
        });
      }
    };
    document.head.appendChild(script);

    return () => {
      document.head.removeChild(script);
    };
  }, []);

  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  if (!clientId || clientId === "your-google-client-id") return null;

  return (
    <>
      <div ref={buttonRef} className="w-full [&>div]:w-full" />
      {error && (
        <div className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600">
          {error}
        </div>
      )}
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-gray-200" />
        <span className="text-xs text-gray-400">or</span>
        <div className="h-px flex-1 bg-gray-200" />
      </div>
    </>
  );
}
