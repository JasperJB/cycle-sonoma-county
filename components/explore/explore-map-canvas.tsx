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

function markerIcon(active: boolean) {
  return divIcon({
    html: `<div class="${active ? "bg-[var(--color-clay)]" : "bg-[var(--color-pine)]"} flex h-6 w-6 items-center justify-center rounded-full border-2 border-white shadow-lg"></div>`,
    className: "",
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
}

function MapFocus({ item }: { item?: ExploreItem }) {
  const map = useMap();

  useEffect(() => {
    if (item?.latitude && item.longitude) {
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
    activeItem?.latitude && activeItem.longitude
      ? [activeItem.latitude, activeItem.longitude]
      : centeredItems[0]?.latitude && centeredItems[0]?.longitude
        ? [centeredItems[0].latitude!, centeredItems[0].longitude!]
        : [38.44, -122.72];

  return (
    <MapContainer center={center} zoom={10.5} className="h-full w-full">
      <TileLayer attribution={tileAttribution} url={tileUrl} />
      <MapFocus item={activeItem} />
      <MarkerClusterGroup chunkedLoading>
        {centeredItems.map((item) => (
          <Marker
            key={item.id}
            position={[item.latitude!, item.longitude!]}
            icon={markerIcon(activeId === item.id)}
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
