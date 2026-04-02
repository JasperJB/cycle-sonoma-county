import { beforeEach, describe, expect, it, vi } from "vitest";
import { normalizeLocationText, resolveMapLocation } from "@/lib/location";

describe("location resolver", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("normalizes organizer-entered location text", () => {
    expect(normalizeLocationText("  123  Main   St,   Suite 2  ")).toBe(
      "123 Main St, Suite 2",
    );
  });

  it("geocodes and normalizes a Sonoma County address", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify([
            {
              lat: "38.4404",
              lon: "-122.7141",
              display_name: "123 Main St, Santa Rosa, Sonoma County, California, USA",
              addresstype: "house",
              address: {
                house_number: "123",
                road: "Main St",
                city: "Santa Rosa",
                county: "Sonoma County",
                state: "California",
                postcode: "95401",
                country_code: "us",
                "ISO3166-2-lvl4": "US-CA",
              },
            },
          ]),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      ),
    );

    const result = await resolveMapLocation({
      city: " santa rosa ",
      addressLine1: " 123  Main st ",
      label: "event location",
    });

    expect(result).toEqual({
      city: "Santa Rosa",
      addressLine1: "123 Main St",
      postalCode: "95401",
      latitude: 38.4404,
      longitude: -122.7141,
    });
  });

  it("keeps existing coordinates when the saved location has not changed", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const result = await resolveMapLocation({
      city: "Sebastopol",
      addressLine1: "88 Bloomfield Rd",
      label: "ride meeting point",
      existing: {
        city: "sebastopol",
        addressLine1: " 88 bloomfield rd ",
        latitude: 38.3812,
        longitude: -122.8353,
      },
    });

    expect(result).toEqual({
      city: "Sebastopol",
      addressLine1: "88 Bloomfield Rd",
      postalCode: undefined,
      latitude: 38.3812,
      longitude: -122.8353,
    });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("falls back to free-form geocoding when structured lookup misses", async () => {
    const fetchSpy = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify([]), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify([
            {
              lat: "38.2937",
              lon: "-122.458",
              display_name: "21 Creekside Ave, Sonoma, Sonoma County, California, USA",
              addresstype: "house",
              address: {
                house_number: "21",
                road: "Creekside Ave",
                city: "Sonoma",
                county: "Sonoma County",
                state: "California",
                country_code: "us",
                "ISO3166-2-lvl4": "US-CA",
              },
            },
          ]),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      );

    vi.stubGlobal("fetch", fetchSpy);

    const result = await resolveMapLocation({
      city: "Sonoma",
      addressLine1: "21 Creekside Ave",
      label: "route start",
    });

    expect(result.latitude).toBe(38.2937);
    expect(result.longitude).toBe(-122.458);
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });
});
