import type { Metadata } from "next";
import { env } from "@/lib/env";
import { siteConfig } from "@/lib/site";

export function absoluteUrl(path = "/") {
  return new URL(path, env.NEXT_PUBLIC_SITE_URL).toString();
}

export function buildMetadata(input: {
  title: string;
  description: string;
  path: string;
}): Metadata {
  return {
    title: `${input.title} | ${siteConfig.name}`,
    description: input.description,
    alternates: {
      canonical: absoluteUrl(input.path),
    },
    openGraph: {
      title: input.title,
      description: input.description,
      url: absoluteUrl(input.path),
      siteName: siteConfig.name,
      locale: siteConfig.locale,
      type: "website",
    },
  };
}

export function organizationJsonLd(input: {
  name: string;
  description: string;
  url: string;
  city?: string | null;
  telephone?: string | null;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "SportsActivityLocation",
    name: input.name,
    description: input.description,
    url: input.url,
    telephone: input.telephone || undefined,
    address: input.city
      ? {
          "@type": "PostalAddress",
          addressLocality: input.city,
          addressRegion: "CA",
          addressCountry: "US",
        }
      : undefined,
  };
}

export function eventJsonLd(input: {
  name: string;
  description: string;
  url: string;
  startDate: string;
  endDate: string;
  locationName?: string | null;
  city?: string | null;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Event",
    name: input.name,
    description: input.description,
    url: input.url,
    startDate: input.startDate,
    endDate: input.endDate,
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    eventStatus: "https://schema.org/EventScheduled",
    location: {
      "@type": "Place",
      name: input.locationName || input.city || "Sonoma County",
      address: input.city
        ? {
            "@type": "PostalAddress",
            addressLocality: input.city,
            addressRegion: "CA",
            addressCountry: "US",
          }
        : undefined,
    },
  };
}
