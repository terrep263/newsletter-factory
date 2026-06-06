// Publication registry for the Newsletter Factory.
// Each publication is a self-contained profile: geography, pillars (with discovery
// queries), schedule, and the exclude/disambiguation rules that enforce LOCAL + FIT.

export interface Pillar {
  key: string;
  label: string;
  terms: string[];
  statewide?: boolean; // statewide-relevant (e.g. Florida Explained): no local-town anchor required
  max: number;
}

export interface Publication {
  id: string;
  name: string;
  lettermanName: string;
  brandId?: string;
  draftDay: number;
  sendDayLabel: string;
  flUnique: string[];
  ambiguous: string[];
  anchors: string[];
  exclude: string[];
  pillars: Pillar[];
}

export const FLORIDA_SIGNAL = ["florida", " fla", " fl ", "fl.", "fla."];

export const PUBLICATIONS: Publication[] = [
  {
    id: "the352beat",
    name: "The 352 Beat",
    lettermanName: "The 352 Beat",
    brandId: "c72c2449-2949-40f7-8b8f-1a1848190b38",
    draftDay: 3,
    sendDayLabel: "Thursday/Friday",
    flUnique: [
      "ocala", "the villages", "dunnellon", "homosassa", "lecanto", "ocklawaha",
      "crystal river", "lady lake", "mount dora", "belleview",
    ],
    ambiguous: [
      "inverness", "clermont", "bushnell", "tavares", "eustis", "leesburg",
      "groveland", "minneola", "wildwood", "beverly hills",
      "marion county", "lake county", "sumter county", "citrus county",
    ],
    anchors: [
      "Marion County", "Sumter County", "Citrus County", "Lake County",
      "Ocala", "The Villages", "Leesburg", "Clermont", "Inverness", "Crystal River",
    ],
    exclude: [
      "trump", "biden", "harris", "congress", "u.s. senate", "abortion",
      "shooting", "murder", "homicide", "arrested", "stabbing", "celebrity",
      "nfl", "nba", "gaza", "israel", "ukraine", "nova scotia", ", ns", ", n.s.",
      ", ore", "oregon", "pacific university", "maine", "cd2", "contender",
      "republicans", "democrats", "lepage", "ms now", "governor race", "reelection",
    ],
    pillars: [
      { key: "whats_happening", label: "What's Happening in the 352", max: 5,
        terms: ["new business", "grand opening", "development", "road project", "county commission", "new store"] },
      { key: "money_housing", label: "Money & Housing", max: 3,
        terms: ["now hiring", "new employer", "economic development", "housing market", "home prices"] },
      { key: "florida_explained", label: "Florida Explained", max: 3, statewide: true,
        terms: ["property insurance", "homestead exemption", "HOA law", "property tax"] },
      { key: "health_after_50", label: "Health After 50", max: 3,
        terms: ["Medicare", "VA benefits", "senior scam", "Medicaid"] },
      { key: "events", label: "Best Events This Week", max: 5,
        terms: ["festival", "farmers market", "concert", "event this weekend"] },
    ],
  },
];

export function getPublication(id: string): Publication | undefined {
  return PUBLICATIONS.find((p) => p.id === id);
}
