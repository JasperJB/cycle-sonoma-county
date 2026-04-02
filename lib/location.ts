import { env } from "@/lib/env";

type ExistingLocation = {
  city?: string | null;
  addressLine1?: string | null;
  postalCode?: string | null;
  latitude?: number | null;
  longitude?: number | null;
};

type ResolveMapLocationInput = {
  city: string;
  addressLine1?: string | null;
  postalCode?: string | null;
  label: string;
  existing?: ExistingLocation;
};

type NominatimAddress = {
  city?: string;
  town?: string;
  village?: string;
  hamlet?: string;
  municipality?: string;
  county?: string;
  state?: string;
  postcode?: string;
  road?: string;
  pedestrian?: string;
  cycleway?: string;
  footway?: string;
  path?: string;
  house_number?: string;
  house_name?: string;
  country_code?: string;
  "ISO3166-2-lvl4"?: string;
};

type NominatimResult = {
  lat: string;
  lon: string;
  display_name: string;
  addresstype?: string;
  address?: NominatimAddress;
};

const geocodeCache = new Map<string, Promise<NominatimResult>>();
const sonomaCountyViewbox = "-123.35,39.28,-122.02,38.02";

export function normalizeLocationText(value?: string | null) {
  return value?.replace(/\s+/g, " ").replace(/\s*,\s*/g, ", ").trim().replace(/^,+|,+$/g, "") || undefined;
}

function normalizePostalCode(value?: string | null) {
  return value?.replace(/\s+/g, "").trim().toUpperCase() || undefined;
}

function isSameNormalizedText(left?: string | null, right?: string | null) {
  return normalizeLocationText(left)?.toLowerCase() === normalizeLocationText(right)?.toLowerCase();
}

function isSamePostalCode(left?: string | null, right?: string | null) {
  return normalizePostalCode(left) === normalizePostalCode(right);
}

function hasCoordinates(existing?: ExistingLocation) {
  return typeof existing?.latitude === "number" && typeof existing.longitude === "number";
}

function resolveCityName(address?: NominatimAddress) {
  return (
    address?.city ||
    address?.town ||
    address?.village ||
    address?.hamlet ||
    address?.municipality
  );
}

function buildStreetAddress(address?: NominatimAddress) {
  const streetName =
    address?.road ||
    address?.pedestrian ||
    address?.cycleway ||
    address?.footway ||
    address?.path;
  const street = [address?.house_number, streetName].filter(Boolean).join(" ");

  return normalizeLocationText(street || address?.house_name);
}

function isCaliforniaResult(address?: NominatimAddress) {
  return (
    address?.country_code?.toLowerCase() === "us" &&
    (address.state === "California" || address["ISO3166-2-lvl4"]?.endsWith("-CA"))
  );
}

function isSonomaCountyResult(address?: NominatimAddress) {
  return !address?.county || address.county.toLowerCase().includes("sonoma");
}

function scoreResult(result: NominatimResult, wantsStreetAddress: boolean) {
  const address = result.address;
  let score = 0;

  if (isCaliforniaResult(address)) {
    score += 50;
  }

  if (isSonomaCountyResult(address)) {
    score += 30;
  }

  if (resolveCityName(address)) {
    score += 10;
  }

  if (wantsStreetAddress && buildStreetAddress(address)) {
    score += 15;
  }

  if (result.addresstype === "house" || result.addresstype === "building") {
    score += 10;
  }

  return score;
}

function createGeocodingUrl(
  input: ResolveMapLocationInput,
  structured: boolean,
) {
  const url = new URL(env.GEOCODING_API_URL || "https://nominatim.openstreetmap.org/search");

  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("limit", "5");
  url.searchParams.set("countrycodes", "us");
  url.searchParams.set("viewbox", sonomaCountyViewbox);

  if (env.GEOCODING_API_KEY && !url.searchParams.has("api_key")) {
    url.searchParams.set("api_key", env.GEOCODING_API_KEY);
  }

  if (!env.GEOCODING_API_URL && env.NEWSLETTER_FROM_EMAIL) {
    url.searchParams.set("email", env.NEWSLETTER_FROM_EMAIL);
  }

  const city = normalizeLocationText(input.city);
  const addressLine1 = normalizeLocationText(input.addressLine1);
  const postalCode = normalizePostalCode(input.postalCode);

  if (structured) {
    if (addressLine1) {
      url.searchParams.set("street", addressLine1);
    }

    url.searchParams.set("city", city || "");
    url.searchParams.set("county", "Sonoma County");
    url.searchParams.set("state", "California");
    url.searchParams.set("country", "USA");

    if (postalCode) {
      url.searchParams.set("postalcode", postalCode);
    }
  } else {
    url.searchParams.set(
      "q",
      [addressLine1, city, "Sonoma County", "California", postalCode, "USA"]
        .filter(Boolean)
        .join(", "),
    );
  }

  return url;
}

async function fetchGeocodingResults(input: ResolveMapLocationInput, structured: boolean) {
  const url = createGeocodingUrl(input, structured);
  const cacheKey = url.toString();

  if (!geocodeCache.has(cacheKey)) {
    geocodeCache.set(
      cacheKey,
      (async () => {
        const response = await fetch(url, {
          headers: {
            Accept: "application/json",
            "Accept-Language": "en",
            Referer: env.NEXT_PUBLIC_SITE_URL,
            "User-Agent": `${env.APP_NAME} (${env.NEXT_PUBLIC_SITE_URL})`,
          },
          cache: "no-store",
          signal: AbortSignal.timeout(10_000),
        });

        if (!response.ok) {
          throw new Error(`Geocoding request failed with status ${response.status}.`);
        }

        const payload = (await response.json()) as NominatimResult[];
        const bestMatch = payload
          .filter((result) => isCaliforniaResult(result.address) && isSonomaCountyResult(result.address))
          .sort(
            (left, right) =>
              scoreResult(right, Boolean(input.addressLine1)) -
              scoreResult(left, Boolean(input.addressLine1)),
          )[0];

        if (!bestMatch) {
          throw new Error(`No Sonoma County match found for ${input.label}.`);
        }

        return bestMatch;
      })(),
    );
  }

  return geocodeCache.get(cacheKey)!;
}

export async function resolveMapLocation(input: ResolveMapLocationInput) {
  const city = normalizeLocationText(input.city);
  const addressLine1 = normalizeLocationText(input.addressLine1);
  const postalCode = normalizePostalCode(input.postalCode);

  if (!city) {
    throw new Error(`Enter a city for the ${input.label}.`);
  }

  if (!addressLine1) {
    throw new Error(`Enter a street or meetup address for the ${input.label}.`);
  }

  if (
    input.existing &&
    hasCoordinates(input.existing) &&
    isSameNormalizedText(city, input.existing.city) &&
    isSameNormalizedText(addressLine1, input.existing.addressLine1) &&
    isSamePostalCode(postalCode, input.existing.postalCode)
  ) {
    return {
      city,
      addressLine1,
      postalCode,
      latitude: input.existing.latitude!,
      longitude: input.existing.longitude!,
    };
  }

  let match: NominatimResult | undefined;

  try {
    match = await fetchGeocodingResults(
      {
        ...input,
        city,
        addressLine1,
        postalCode,
      },
      true,
    );
  } catch {
    match = await fetchGeocodingResults(
      {
        ...input,
        city,
        addressLine1,
        postalCode,
      },
      false,
    );
  }

  const latitude = Number(match.lat);
  const longitude = Number(match.lon);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new Error(`Unable to place the ${input.label} on the map.`);
  }

  return {
    city: resolveCityName(match.address) || city,
    addressLine1: buildStreetAddress(match.address) || addressLine1,
    postalCode: normalizePostalCode(match.address?.postcode) || postalCode,
    latitude,
    longitude,
  };
}
