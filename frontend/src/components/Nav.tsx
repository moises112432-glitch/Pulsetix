"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import type { User } from "@/types";

export default function Nav() {
  const [user, setUser] = useState<User | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      apiFetch<User>("/api/auth/me")
        .then(setUser)
        .catch(() => localStorage.removeItem("token"));
    }
  }, []);

  function handleLogout() {
    localStorage.removeItem("token");
    window.location.href = "/";
  }

  const isOrganizer = user?.role === "organizer" || user?.role === "admin";

  return (
    <nav className="sticky top-0 z-50 border-b border-gray-100 bg-white/80 backdrop-blur-lg">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:h-16 sm:px-6">
        <Link
          href="/"
          className="flex items-center gap-2 text-lg font-bold tracking-tight sm:text-xl"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-sm text-white">
            P
          </span>
          PulseTix
        </Link>

        {/* Desktop nav */}
        <div className="hidden items-center gap-1 md:flex">
          <Link
            href="/events"
            className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900"
          >
            Explore
          </Link>

          {user ? (
            <>
              {isOrganizer ? (
                <>
                  <Link
                    href="/dashboard"
                    className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900"
                  >
                    Dashboard
                  </Link>
                  <Link
                    href="/scanner"
                    className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900"
                  >
                    Scanner
                  </Link>
                </>
              ) : (
                <Link
                  href="/host"
                  className="rounded-lg px-4 py-2 text-sm font-medium text-brand transition-colors hover:bg-brand-50"
                >
                  Start Hosting
                </Link>
              )}
              <Link
                href="/checkout"
                className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900"
              >
                My Tickets
              </Link>
              <div className="ml-2 flex items-center gap-3 border-l border-gray-200 pl-4">
                <Link
                  href={`/profile/${user.id}`}
                  className="flex items-center gap-2 rounded-lg px-2 py-1 transition-colors hover:bg-gray-100"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-50 text-sm font-semibold text-brand">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium leading-tight">
                      {user.name}
                    </span>
                    <span className="text-xs leading-tight text-gray-400">
                      {isOrganizer ? "Organizer" : "Attendee"}
                    </span>
                  </div>
                </Link>
                <button
                  onClick={handleLogout}
                  className="text-sm text-gray-400 transition-colors hover:text-gray-600"
                >
                  Log out
                </button>
              </div>
            </>
          ) : (
            <Link
              href="/auth"
              className="ml-2 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-dark"
            >
              Sign In
            </Link>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="flex h-10 w-10 items-center justify-center rounded-lg text-gray-600 transition-colors hover:bg-gray-100 md:hidden"
        >
          {menuOpen ? (
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="border-t border-gray-100 bg-white px-4 pb-4 pt-2 md:hidden">
          <div className="flex flex-col gap-1">
            <Link
              href="/events"
              onClick={() => setMenuOpen(false)}
              className="rounded-lg px-4 py-3 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100"
            >
              Explore
            </Link>

            {user ? (
              <>
                {isOrganizer ? (
                  <>
                    <Link
                      href="/dashboard"
                      onClick={() => setMenuOpen(false)}
                      className="rounded-lg px-4 py-3 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100"
                    >
                      Dashboard
                    </Link>
                    <Link
                      href="/scanner"
                      onClick={() => setMenuOpen(false)}
                      className="rounded-lg px-4 py-3 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100"
                    >
                      Scanner
                    </Link>
                  </>
                ) : (
                  <Link
                    href="/host"
                    onClick={() => setMenuOpen(false)}
                    className="rounded-lg px-4 py-3 text-sm font-medium text-brand transition-colors hover:bg-brand-50"
                  >
                    Start Hosting
                  </Link>
                )}
                <Link
                  href="/checkout"
                  onClick={() => setMenuOpen(false)}
                  className="rounded-lg px-4 py-3 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100"
                >
                  My Tickets
                </Link>

                <div className="mt-2 flex items-center justify-between border-t border-gray-100 pt-3">
                  <Link
                    href={`/profile/${user.id}`}
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-3"
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-50 text-sm font-semibold text-brand">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{user.name}</p>
                      <p className="text-xs text-gray-400">
                        {isOrganizer ? "Organizer" : "Attendee"}
                      </p>
                    </div>
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="rounded-lg px-4 py-2 text-sm font-medium text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                  >
                    Log out
                  </button>
                </div>
              </>
            ) : (
              <Link
                href="/auth"
                onClick={() => setMenuOpen(false)}
                className="mt-2 rounded-lg bg-brand px-4 py-3 text-center text-sm font-medium text-white transition-colors hover:bg-brand-dark"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
