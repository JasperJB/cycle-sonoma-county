export const siteConfig = {
  name: "Cycle Sonoma County",
  title: "Cycle Sonoma County | Rides, routes, races, shops, and cycling events",
  description:
    "A trusted local cycling hub for Sonoma County with rides, races, routes, shops and services, events, and organizer tools.",
  shortDescription:
    "A local cycling hub for Sonoma County riders, visitors, clubs, shops and services, and event organizers.",
  locale: "en_US",
  defaultCity: "Santa Rosa",
  region: "Sonoma County, California",
  themeColor: "#183a2d",
  keywords: [
    "Sonoma County cycling",
    "Sonoma bike rides",
    "Sonoma group rides",
    "Sonoma bike shops",
    "Sonoma bike rentals",
    "Sonoma bike-friendly cafes",
    "Sonoma cycling events",
    "Wine country cycling routes",
  ],
};

export const supportLink =
  "https://venmo.com/code?user_id=3631114384049847283&created=1775266918";

export type PublicNavLink = {
  href: string;
  label: string;
};

export type PublicNavItem =
  | {
      kind: "link";
      href: string;
      label: string;
      matchPaths: string[];
    }
  | {
      kind: "group";
      label: string;
      matchPaths: string[];
      items: PublicNavLink[];
    };

export const rideMenuLinks: PublicNavLink[] = [
  { href: "/rides", label: "All rides" },
  { href: "/rides?beginner=true", label: "Beginner-friendly rides" },
  { href: "/rides?nodrop=true", label: "No-drop rides" },
  { href: "/clubs", label: "Clubs & teams" },
];

export const eventMenuLinks: PublicNavLink[] = [
  { href: "/events", label: "All events" },
  { href: "/events?type=RACE", label: "Races" },
  { href: "/events?type=FONDO", label: "Fondos" },
  { href: "/events?type=CLINIC", label: "Clinics & skills" },
];

export const routeMenuLinks: PublicNavLink[] = [
  { href: "/routes", label: "All route guides" },
  { href: "/routes?beginner=true", label: "Beginner-friendly routes" },
  { href: "/visitors", label: "For visitors" },
];

export const shopMenuLinks: PublicNavLink[] = [
  { href: "/shops", label: "All shops & services" },
  { href: "/shops?rentals=true", label: "Bike rentals" },
  { href: "/shops?verified=true", label: "Verified shops" },
];

export const publicPrimaryNav: PublicNavItem[] = [
  {
    kind: "link",
    href: "/explore",
    label: "Explore",
    matchPaths: ["/explore"],
  },
  {
    kind: "group",
    label: "Rides",
    matchPaths: ["/rides", "/clubs"],
    items: rideMenuLinks,
  },
  {
    kind: "group",
    label: "Events",
    matchPaths: ["/events"],
    items: eventMenuLinks,
  },
  {
    kind: "group",
    label: "Routes",
    matchPaths: ["/routes", "/visitors"],
    items: routeMenuLinks,
  },
  {
    kind: "group",
    label: "Shops & Services",
    matchPaths: ["/shops"],
    items: shopMenuLinks,
  },
];

export const publicSecondaryNav: PublicNavLink[] = [
  { href: "/visitors", label: "For Visitors" },
  { href: "/newsletter", label: "Newsletter" },
  { href: "/about", label: "About / Contact" },
];

export const footerExploreLinks: PublicNavLink[] = [
  { href: "/explore", label: "Explore" },
  { href: "/rides", label: "Rides" },
  { href: "/events", label: "Events" },
  { href: "/routes", label: "Routes" },
  { href: "/shops", label: "Shops & Services" },
  { href: "/clubs", label: "Clubs & Teams" },
  { href: "/visitors", label: "For Visitors" },
];

export const rideFilterLinks: PublicNavLink[] = [
  { href: "/rides", label: "All" },
  { href: "/rides?beginner=true", label: "Beginner-friendly" },
  { href: "/rides?nodrop=true", label: "No-drop" },
  { href: "/clubs", label: "Clubs & teams" },
];

export const eventFilterLinks: PublicNavLink[] = [
  { href: "/events", label: "All" },
  { href: "/events?type=RACE", label: "Races" },
  { href: "/events?type=FONDO", label: "Fondos" },
  { href: "/events?type=CLINIC", label: "Clinics & skills" },
];

export const routeFilterLinks: PublicNavLink[] = [
  { href: "/routes", label: "All" },
  { href: "/routes?beginner=true", label: "Beginner-friendly" },
  { href: "/visitors", label: "For visitors" },
];

export const shopFilterLinks: PublicNavLink[] = [
  { href: "/shops", label: "All" },
  { href: "/shops?rentals=true", label: "Bike rentals" },
  { href: "/shops?verified=true", label: "Verified" },
];

export const sonomaCities = [
  "Santa Rosa",
  "Petaluma",
  "Sebastopol",
  "Healdsburg",
  "Sonoma",
  "Windsor",
  "Rohnert Park",
  "Cloverdale",
  "Bodega Bay",
  "Guerneville",
];
