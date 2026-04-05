import type { Metadata } from "next";
import EventDetailWrapper from "@/components/EventDetailContent";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface EventMeta {
  id: number;
  title: string;
  description: string | null;
  location: string | null;
  start_time: string;
  cover_image: string | null;
  organizer_name: string | null;
}

function getImageUrl(path: string | null): string {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  return `${API_BASE}${path}`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;

  try {
    const res = await fetch(`${API_BASE}/api/events/${id}`, {
      next: { revalidate: 60 },
    });

    if (!res.ok) {
      return { title: "Event Not Found | PulseTix" };
    }

    const event: EventMeta = await res.json();
    const date = new Date(event.start_time);
    const dateStr = date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });

    const title = `${event.title} | PulseTix`;
    const description = event.description
      ? event.description.slice(0, 160)
      : `${dateStr}${event.location ? ` at ${event.location}` : ""} — Get tickets on PulseTix`;

    const images = event.cover_image ? [getImageUrl(event.cover_image)] : [];

    return {
      title,
      description,
      openGraph: {
        title: event.title,
        description,
        type: "website",
        url: `https://pulsetix.net/events/${id}`,
        images,
        siteName: "PulseTix",
      },
      twitter: {
        card: images.length > 0 ? "summary_large_image" : "summary",
        title: event.title,
        description,
        images,
      },
    };
  } catch {
    return { title: "PulseTix" };
  }
}

export default function EventDetailPage() {
  return <EventDetailWrapper />;
}
