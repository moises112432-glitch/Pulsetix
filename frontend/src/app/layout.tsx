import type { Metadata } from "next";
import Nav from "@/components/Nav";
import "./globals.css";

export const metadata: Metadata = {
  title: "PulseTix — Create events that people love",
  description:
    "Sell tickets, manage check-ins with QR codes, and grow your audience. The modern event ticketing platform.",
  metadataBase: new URL("https://pulsetix.net"),
  openGraph: {
    title: "PulseTix — Create events that people love",
    description:
      "Sell tickets, manage check-ins with QR codes, and grow your audience. The modern event ticketing platform.",
    type: "website",
    url: "https://pulsetix.net",
    siteName: "PulseTix",
  },
  twitter: {
    card: "summary",
    title: "PulseTix — Create events that people love",
    description:
      "Sell tickets, manage check-ins with QR codes, and grow your audience. The modern event ticketing platform.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900 antialiased">
        <Nav />
        <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">{children}</main>
        <footer className="mt-12 border-t border-gray-100 bg-white sm:mt-16">
          <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 px-4 py-6 text-xs text-gray-400 sm:gap-4 sm:px-6 sm:py-8">
            <div className="flex flex-wrap justify-center gap-4 sm:gap-6">
              <a href="/terms" className="hover:text-gray-600">Terms of Service</a>
              <a href="/privacy" className="hover:text-gray-600">Privacy Policy</a>
              <a href="/acceptable-use" className="hover:text-gray-600">Acceptable Use</a>
            </div>
            <p>&copy; {new Date().getFullYear()} PulseTix. All rights reserved.</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
