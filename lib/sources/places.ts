/**
 * Google Places business source — The 352 Beat.
 * Pulls independent-leaning, well-reviewed local businesses per town/category
 * via the Places API v1 (searchText). Server-side only (holds the API key).
 */
import type { NormalizedItem } from "@/lib/collector";

const KEY = process.env.GOOGLE_PLACES_API_KEY ?? "";
const SEARCH = "https://places.googleapis.com/v1/places:searchText";
const FIELD_MASK = [
  "places.id","places.displayName","places.rating","places.userRatingCount",
  "places.formattedAddress","places.websiteUri","places.googleMapsUri",
  "places.photos","places.primaryTypeDisplayName","places.businessStatus",
].join(",");

export const DEFAULT_TOWNS = [
  "Leesburg","Mount Dora","Eustis","Tavares","Lady Lake","The Villages","Clermont","Ocala",
];
export const DEFAULT_CATEGORIES = [
  "restaurant","coffee shop or cafe","bakery","craft brewery or bar",
  "boutique or local shop","barber shop or salon","ice cream or dessert shop","local attraction",
];

// National/regional chains to exclude (we feature locally owned). Lowercase substrings.
export const CHAINS = [
  // fast food / qsr
  "starbucks","mcdonald","burger king","wendy","subway","taco bell","kfc","popeyes",
  "chick-fil-a","chick fil a","dunkin","wawa","domino","pizza hut","papa john","chipotle",
  "panera","7-eleven","circle k","little caesars","firehouse subs","jersey mike","five guys",
  "zaxby","wingstop","jimmy john","dairy queen","hardee","checkers","sonic","arby","culver",
  "panda express","moe's","tijuana flats","pollo tropical","pdq","smoothie king","tropical smoothie",
  "einstein","steak n shake","steak 'n shake","whataburger","raising cane","del taco","el pollo",
  // casual dining chains
  "applebee","chili's","olive garden","ihop","denny","waffle house","outback","texas roadhouse",
  "longhorn","cracker barrel","ruby tuesday","first watch","bob evans","perkins","red lobster",
  "harry's","mission bbq","sonny's","bono's","beef 'o","beef o'","miller's ale","world of beer",
  "bahama breeze","carrabba","bonefish","twin peaks","hooters","buffalo wild","ford's garage",
  "mellow mushroom","keke","metro diner","another broken egg","glory days","tgi friday","on the border",
  // coffee/dessert chains
  "7 brew","foxtail","ellianos","scooter","biggby","pj's coffee","the human bean","crumbl",
  "baskin","cold stone","tcby","menchie","marble slab","jeremiah's","kona ice","nothing bundt",
  // retail / services / grocery
  "walmart","target","publix","winn-dixie","aldi","sam's club","costco","home depot","lowe's",
  "cvs","walgreens","dollar general","dollar tree","family dollar","great clips","sport clips",
  "supercuts","european wax","massage envy","planet fitness","anytime fitness","orangetheory",
  "crunch fitness","ups store","batteries plus","ace hardware","tractor supply","five below",
];

export function isChain(name: string): boolean {
  const n = (name || "").toLowerCase();
  return CHAINS.some((c) => n.includes(c));
}

export interface PlacesOpts {
  towns?: string[];
  categories?: string[];
  minRating?: number;
  minReviews?: number;
  perQuery?: number;
}

interface PlaceResult {
  id?: string;
  displayName?: { text?: string };
  rating?: number;
  userRatingCount?: number;
  formattedAddress?: string;
  websiteUri?: string;
  googleMapsUri?: string;
  photos?: Array<{ name?: string }>;
  primaryTypeDisplayName?: { text?: string };
  businessStatus?: string;
}

async function searchText(query: string, max: number): Promise<PlaceResult[]> {
  const res = await fetch(SEARCH, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": KEY,
      "X-Goog-FieldMask": FIELD_MASK,
    },
    body: JSON.stringify({ textQuery: query, maxResultCount: max, regionCode: "US" }),
    cache: "no-store",
  });
  if (!res.ok) return [];
  const data = (await res.json()) as { places?: PlaceResult[] };
  return data.places ?? [];
}

export async function fetchPlacesBusinesses(opts: PlacesOpts = {}): Promise<NormalizedItem[]> {
  if (!KEY) throw new Error("GOOGLE_PLACES_API_KEY is not set");
  const towns = opts.towns ?? DEFAULT_TOWNS;
  const categories = opts.categories ?? DEFAULT_CATEGORIES;
  const minRating = opts.minRating ?? 4.5;
  const minReviews = opts.minReviews ?? 50;
  const perQuery = opts.perQuery ?? 5;

  const byPlace = new Map<string, NormalizedItem>();
  for (const town of towns) {
    for (const cat of categories) {
      const places = await searchText(`${cat} in ${town}, Florida`, perQuery);
      for (const p of places) {
        const name = p.displayName?.text ?? "";
        const rating = p.rating ?? 0;
        const reviews = p.userRatingCount ?? 0;
        const id = p.id ?? "";
        if (!name || !id) continue;
        if (p.businessStatus && p.businessStatus !== "OPERATIONAL") continue;
        if (rating < minRating || reviews < minReviews) continue;
        if (isChain(name)) continue;
        if (byPlace.has(id) && reviews <= ((byPlace.get(id)!.raw?.reviews as number) ?? 0)) continue;
        byPlace.set(id, {
          item_type: "business",
          title: name,
          body: null,
          url: p.websiteUri ?? p.googleMapsUri ?? null,
          image_url: null,
          zone: town,
          location: p.formattedAddress ?? town,
          raw: {
            place_id: id,
            rating,
            reviews,
            website: p.websiteUri ?? null,
            maps: p.googleMapsUri ?? null,
            category: cat,
            primaryType: p.primaryTypeDisplayName?.text ?? null,
            photo: p.photos?.[0]?.name ?? null,
          },
        });
      }
    }
  }
  return [...byPlace.values()];
}
