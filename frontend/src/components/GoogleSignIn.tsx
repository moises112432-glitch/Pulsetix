"use client";

import { useEffect, useRef } from "react";
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
}

export default function GoogleSignIn({ onSuccess, becomeOrganizer }: GoogleSignInProps) {
  const buttonRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!clientId || clientId === "your-google-client-id") return;

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.onload = () => {
      window.google?.accounts.id.initialize({
        client_id: clientId,
        callback: handleCredentialResponse,
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

  async function handleCredentialResponse(response: { credential: string }) {
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
        window.location.href = becomeOrganizer ? "/dashboard" : "/events";
      }
    } catch {
      // Silently fail — user can still use email/password
    }
  }

  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  if (!clientId || clientId === "your-google-client-id") return null;

  return (
    <>
      <div ref={buttonRef} className="w-full [&>div]:w-full" />
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-gray-200" />
        <span className="text-xs text-gray-400">or</span>
        <div className="h-px flex-1 bg-gray-200" />
      </div>
    </>
  );
}
