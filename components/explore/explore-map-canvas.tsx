"use client";

import Link from "next/link";
import { useEffect } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import { divIcon, type LatLngExpression } from "leaflet";
import type { ExploreItem } from "@/lib/data/public";
import "leaflet/dist/leaflet.css";

const tileUrl =
  process.env.NEXT_PUBLIC_MAP_TILE_URL ||
  "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const tileAttribution =
  process.env.NEXT_PUBLIC_MAP_ATTRIBUTION || "&copy; OpenStreetMap contributors";

const datasetMarkerMeta: Record<
  ExploreItem["dataset"],
  {
    accent: string;
    iconLabel: string;
    iconMarkup: string;
  }
> = {
  rides: {
    accent: "#3B7D5B",
    iconLabel: "Ride",
    iconMarkup:
      '<circle cx="16" cy="24" r="4" /><circle cx="32" cy="24" r="4" /><path d="M16 24l6-10 4 7h6" /><path d="M23 14h-6" /><path d="M24 24l-5-10" />',
  },
  shops: {
    accent: "#8C5A35",
    iconLabel: "Business",
    iconMarkup:
      '<path d="M14 16h20l-2 4H16l-2-4Z" /><path d="M17 20v9h14v-9" /><path d="M22 20v9" /><path d="M27 13v3" />',
  },
  clubs: {
    accent: "#506C94",
    iconLabel: "Club",
    iconMarkup:
      '<circle cx="18" cy="18" r="4" /><circle cx="30" cy="19" r="3.5" /><path d="M12 29c1.5-4 5-6 9-6s7.5 2 9 6" /><path d="M24 29c1-3 3.5-4.5 6.5-4.5 2 0 3.7.6 5 1.8" />',
  },
  events: {
    accent: "#C16D4F",
    iconLabel: "Event",
    iconMarkup:
      '<rect x="13" y="15" width="22" height="16" rx="3" /><path d="M18 12v6" /><path d="M30 12v6" /><path d="M13 20h22" /><path d="M19 25h4" /><path d="M27 25h2" />',
  },
  routes: {
    accent: "#7C6A3A",
    iconLabel: "Route",
    iconMarkup:
      '<circle cx="14" cy="27" r="2.5" fill="currentColor" stroke="none" /><circle cx="34" cy="15" r="2.5" fill="currentColor" stroke="none" /><path d="M16 27c5-1 7-9 11-9s4 6 7 6" /><path d="M23 31l6-2" />',
  },
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function markerIcon(item: ExploreItem, active: boolean) {
  const meta = datasetMarkerMeta[item.dataset];
  const fill = active ? "#A86537" : meta.accent;
  const shadow = active
    ? "filter: drop-shadow(0 14px 24px rgba(168, 101, 55, 0.32)); transform: translateY(-2px) scale(1.06);"
    : "filter: drop-shadow(0 10px 18px rgba(24, 58, 45, 0.2));";

  return divIcon({
    html: `
      <div
        data-marker-id="${escapeHtml(item.id)}"
        data-marker-dataset="${item.dataset}"
        data-active="${active ? "true" : "false"}"
        aria-label="${meta.iconLabel}: ${escapeHtml(item.title)}"
        style="width: 44px; height: 56px; ${shadow}"
      >
        <svg width="44" height="56" viewBox="0 0 44 56" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <path d="M22 2C11 2 3 10.3 3 20.9c0 13.5 15.2 27.4 18 30a1.5 1.5 0 0 0 2 0c2.8-2.6 18-16.5 18-30C41 10.3 33 2 22 2Z" fill="${fill}" />
          <circle cx="22" cy="22" r="11" fill="#fffdf8" />
          <g stroke="${fill}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            ${meta.iconMarkup}
          </g>
        </svg>
      </div>
    `,
    className: "",
    iconSize: [44, 56],
    iconAnchor: [22, 52],
    popupAnchor: [0, -44],
  });
}

function clusterIcon(childCount: number) {
  const size = childCount < 10 ? 44 : childCount < 25 ? 50 : 56;
  const palette =
    childCount < 10
      ? {
          outer: "linear-gradient(135deg, #3B7D5B, #506C94)",
          inner: "rgba(255, 253, 248, 0.92)",
          text: "#183A2D",
        }
      : childCount < 25
        ? {
            outer: "linear-gradient(135deg, #A86537, #C16D4F)",
            inner: "rgba(255, 248, 242, 0.94)",
            text: "#5A2F17",
          }
        : {
            outer: "linear-gradient(135deg, #506C94, #7C6A3A)",
            inner: "rgba(248, 245, 236, 0.94)",
            text: "#21324F",
          };

  return divIcon({
    html: `
      <div
        aria-label="${childCount} grouped listings"
        style="
          width: ${size}px;
          height: ${size}px;
          border-radius: 9999px;
          background: ${palette.outer};
          box-shadow: 0 18px 34px rgba(24, 58, 45, 0.2);
          display: grid;
          place-items: center;
          border: 3px solid rgba(255, 255, 255, 0.92);
        "
      >
        <div
          style="
            width: ${size - 12}px;
            height: ${size - 12}px;
            border-radius: 9999px;
            background: ${palette.inner};
            display: grid;
            place-items: center;
            color: ${palette.text};
            font-size: ${childCount < 10 ? 14 : 15}px;
            font-weight: 800;
            line-height: 1;
            letter-spacing: 0.01em;
          "
        >
          ${childCount}
        </div>
      </div>
    `,
    className: "",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function MapFocus({ item }: { item?: ExploreItem }) {
  const map = useMap();

  useEffect(() => {
    if (typeof item?.latitude === "number" && typeof item.longitude === "number") {
      map.flyTo([item.latitude, item.longitude], 12, { duration: 0.5 });
    }
  }, [item, map]);

  return null;
}

export function ExploreMapCanvas({
  items,
  activeId,
  onSelect,
}: {
  items: ExploreItem[];
  activeId?: string;
  onSelect: (id: string) => void;
}) {
  const activeItem = items.find((item) => item.id === activeId);
  const centeredItems = items.filter(
    (item) => typeof item.latitude === "number" && typeof item.longitude === "number",
  );
  const center: LatLngExpression =
    typeof activeItem?.latitude === "number" && typeof activeItem.longitude === "number"
      ? [activeItem.latitude, activeItem.longitude]
      : typeof centeredItems[0]?.latitude === "number" &&
          typeof centeredItems[0]?.longitude === "number"
        ? [centeredItems[0].latitude!, centeredItems[0].longitude!]
        : [38.44, -122.72];

  return (
    <MapContainer center={center} zoom={10.5} className="h-full w-full">
      <TileLayer attribution={tileAttribution} url={tileUrl} />
      <MapFocus item={activeItem} />
      <MarkerClusterGroup
        chunkedLoading
        iconCreateFunction={(cluster: { getChildCount(): number }) =>
          clusterIcon(cluster.getChildCount())
        }
      >
        {centeredItems.map((item) => (
          <Marker
            key={item.id}
            position={[item.latitude!, item.longitude!]}
            icon={markerIcon(item, activeId === item.id)}
            title={item.title}
            zIndexOffset={activeId === item.id ? 1000 : 0}
            eventHandlers={{
              click: () => onSelect(item.id),
            }}
          >
            <Popup>
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-forest-soft)]">
                  {item.dataset}
                </p>
                <div>
                  <h3 className="font-semibold text-[var(--color-pine)]">{item.title}</h3>
                  <p className="text-sm text-[var(--color-forest-muted)]">{item.summary}</p>
                </div>
                <Link href={item.href} className="text-sm font-medium text-[var(--color-pine)]">
                  Open listing
                </Link>
              </div>
            </Popup>
          </Marker>
        ))}
      </MarkerClusterGroup>
    </MapContainer>
  );
}
