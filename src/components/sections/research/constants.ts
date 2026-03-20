import { ResearchDomain, type ResearchCondition, type DomainState } from "@/lib/types";

export const DOMAINS: { key: ResearchDomain; ja: string; en: string }[] = [
  { key: ResearchDomain.Environment, ja: "環境", en: "Environment" },
  { key: ResearchDomain.Market, ja: "マーケット", en: "Market" },
  { key: ResearchDomain.Culture, ja: "文化・歴史", en: "Culture / History" },
  { key: ResearchDomain.Economy, ja: "経済", en: "Economy" },
  { key: ResearchDomain.Society, ja: "社会", en: "Society" },
  { key: ResearchDomain.Technology, ja: "技術", en: "Technology" },
];

export const DOMAIN_LABELS: Record<string, string> = {
  environment: "環境",
  market: "マーケット",
  culture: "文化・歴史",
  economy: "経済",
  society: "社会",
  technology: "技術",
};

export const DOMAIN_COLORS: Record<string, string> = {
  environment: "#4ade80", // green-400
  market: "#f472b6",      // pink-400
  culture: "#c084fc",     // purple-400
  economy: "#facc15",     // yellow-400
  society: "#38bdf8",     // sky-400
  technology: "#fb923c",  // orange-400
};

export const FINDING_CONFIG: Record<string, { label: string; labelJa: string; color: string; bg: string }> = {
  fact: { label: "Facts", labelJa: "事実", color: "text-blue-400", bg: "bg-blue-400/10" },
  implication: { label: "Implications", labelJa: "示唆", color: "text-amber-400", bg: "bg-amber-400/10" },
  risk: { label: "Risks", labelJa: "リスク", color: "text-red-400", bg: "bg-red-400/10" },
  opportunity: { label: "Opportunities", labelJa: "機会", color: "text-emerald-400", bg: "bg-emerald-400/10" },
};

export function createInitialState(): Record<ResearchDomain, DomainState> {
  const state = {} as Record<ResearchDomain, DomainState>;
  for (const d of DOMAINS) {
    state[d.key] = { notes: "", tags: [], keywords: [] };
  }
  return state;
}

export function conditionsToState(conditions: ResearchCondition[]): Record<ResearchDomain, DomainState> {
  const state = createInitialState();
  for (const c of conditions) {
    if (state[c.domain as ResearchDomain]) {
      state[c.domain as ResearchDomain] = {
        notes: c.notes,
        tags: c.tags,
        findings: c.findings,
        keywords: c.keywords ?? [],
        relatedDomains: c.relatedDomains,
      };
    }
  }
  return state;
}
