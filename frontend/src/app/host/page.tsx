"use client";

import { useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import GoogleSignIn from "@/components/GoogleSignIn";

export default function HostSignupPage() {
  const [isLogin, setIsLogin] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Step 1: Register or login
      const endpoint = isLogin ? "/api/auth/login" : "/api/auth/register";
      const body = isLogin ? { email, password } : { name, email, password };

      const data = await apiFetch<{ access_token: string }>(endpoint, {
        method: "POST",
        body: JSON.stringify(body),
      });

      localStorage.setItem("token", data.access_token);

      // Step 2: Upgrade to organizer
      await apiFetch("/api/users/me/become-organizer", { method: "POST" });

      // Step 3: Go to dashboard
      window.location.href = "/dashboard";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand text-lg font-bold text-white">
            P
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            {isLogin ? "Sign in as Organizer" : "Become an Organizer"}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Create events, sell tickets, and grow your audience
          </p>
        </div>

        {/* Benefits */}
        <div className="mb-8 flex flex-col gap-3">
          <div className="flex items-center gap-3 rounded-xl bg-brand-50 p-3">
            <span className="text-lg">🎪</span>
            <span className="text-sm font-medium text-brand-dark">
              Create and manage unlimited events
            </span>
          </div>
          <div className="flex items-center gap-3 rounded-xl bg-brand-50 p-3">
            <span className="text-lg">💰</span>
            <span className="text-sm font-medium text-brand-dark">
              Sell tickets with secure payments
            </span>
          </div>
          <div className="flex items-center gap-3 rounded-xl bg-brand-50 p-3">
            <span className="text-lg">📱</span>
            <span className="text-sm font-medium text-brand-dark">
              QR code scanner for check-in at the door
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <GoogleSignIn becomeOrganizer />
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {!isLogin && (
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Your Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm transition-colors focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                placeholder="Your name"
                required
              />
            </div>
          )}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm transition-colors focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
              placeholder="you@example.com"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm transition-colors focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
              placeholder="••••••••"
              required
            />
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          {!isLogin && (
            <p className="text-xs text-gray-400 text-center">
              By signing up, you agree to our{" "}
              <Link href="/terms" className="underline hover:text-gray-600">Terms</Link>,{" "}
              <Link href="/acceptable-use" className="underline hover:text-gray-600">Acceptable Use</Link>, and{" "}
              <Link href="/privacy" className="underline hover:text-gray-600">Privacy Policy</Link>.
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 rounded-xl bg-brand py-3 text-sm font-semibold text-white shadow-lg shadow-brand/25 transition-all hover:bg-brand-dark disabled:opacity-50"
          >
            {loading
              ? "Setting up..."
              : isLogin
              ? "Sign In & Continue"
              : "Create Organizer Account"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          {isLogin
            ? "Need a new account?"
            : "Already have an account?"}{" "}
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              setError("");
            }}
            className="font-medium text-brand hover:text-brand-dark"
          >
            {isLogin ? "Sign up" : "Sign in"}
          </button>
        </p>

        <p className="mt-4 text-center text-sm text-gray-400">
          Just want to buy tickets?{" "}
          <a href="/auth" className="font-medium text-gray-600 hover:text-gray-900">
            Sign in as attendee
          </a>
        </p>
      </div>
    </div>
  );
}
