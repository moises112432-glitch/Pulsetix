"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import type { User } from "@/types";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setLoading(false);
      return;
    }
    apiFetch<User>("/api/auth/me")
      .then(setUser)
      .catch(() => localStorage.removeItem("token"))
      .finally(() => setLoading(false));
  }, []);

  const isOrganizer = user?.role === "organizer" || user?.role === "admin";
  const stripeConnected = user?.stripe_onboarding_complete ?? false;

  return { user, loading, isOrganizer, stripeConnected };
}
