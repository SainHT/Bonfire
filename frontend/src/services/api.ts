import type {
  CommunityMatch,
  DiscoveryFilters,
  RecommenderCity,
} from "@/types";
import { VALID_RECOMMENDER_CITIES } from "@/types";

const API_BASE =
  (import.meta.env.VITE_API_BASE as string | undefined)?.replace(/\/$/, "") ??
  "http://localhost:8000";

export interface RecommendRequest {
  city: RecommenderCity;
  interests: string;
  limit?: number;
}

interface BackendCommunity extends Partial<CommunityMatch> {
  id: string;
  name: string;
  city: string;
  category: string;
}

interface BackendRecommendResponse {
  user_input: string;
  city: string;
  recommendations: BackendCommunity[];
  total_count: number;
  generated_at: string;
}

interface BackendCommunitiesResponse {
  total: number;
  communities: BackendCommunity[];
}

// Backend fields are optional/nullable; the frontend type assumes some are strings.
// Coerce nulls/undefined into safe defaults so UI never renders "null".
function normalize(c: BackendCommunity): CommunityMatch {
  return {
    id: c.id,
    name: c.name,
    acronym: c.acronym ?? null,
    city: c.city,
    category: c.category,
    tags: c.tags ?? [],
    min_age: c.min_age ?? null,
    max_age: c.max_age ?? null,
    is_university_affiliated: c.is_university_affiliated ?? false,
    institution: c.institution ?? "Independent",
    description_short: c.description_short ?? null,
    description_full: c.description_full ?? null,
    estimated_annual_fee_eur: c.estimated_annual_fee_eur ?? null,
    primary_language: c.primary_language ?? "Unknown",
    location_type: c.location_type ?? "Unknown",
    address: c.address ?? null,
    postal_code: c.postal_code ?? null,
    website_url: c.website_url ?? null,
    instagram_url: c.instagram_url ?? null,
    contact_email: c.contact_email ?? null,
    image_url: c.image_url ?? null,
    match_reason: c.match_reason,
    relevance_score: c.relevance_score,
  };
}

export async function fetchCommunities(opts: {
  city?: string;
  limit?: number;
  signal?: AbortSignal;
} = {}): Promise<CommunityMatch[]> {
  const params = new URLSearchParams();
  if (opts.city) params.set("city", opts.city);
  params.set("limit", String(opts.limit ?? 1000));

  const res = await fetch(`${API_BASE}/api/communities?${params.toString()}`, {
    signal: opts.signal,
  });
  if (!res.ok) throw new Error(`GET /api/communities failed (${res.status})`);
  const json = (await res.json()) as BackendCommunitiesResponse;
  return json.communities.map(normalize);
}

export interface RecommendResult {
  /** Ordered IDs as ranked by the semantic engine. */
  orderedIds: string[];
  /** Echoed-back input so callers can detect stale responses. */
  userInput: string;
  city: string;
  generatedAt: string;
}

export async function recommend(
  req: RecommendRequest,
  signal?: AbortSignal,
): Promise<RecommendResult> {
  const res = await fetch(`${API_BASE}/api/recommend`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      city: req.city,
      interests: req.interests,
      limit: req.limit ?? 50,
    }),
    signal,
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`POST /api/recommend failed (${res.status}): ${body}`);
  }
  const json = (await res.json()) as BackendRecommendResponse;
  return {
    orderedIds: json.recommendations.map((r) => r.id),
    userInput: json.user_input,
    city: json.city,
    generatedAt: json.generated_at,
  };
}

export function isRecommenderCity(value: string): value is RecommenderCity {
  return (VALID_RECOMMENDER_CITIES as readonly string[]).includes(value);
}

export function passesFilters(
  c: CommunityMatch,
  f?: Partial<DiscoveryFilters>,
): boolean {
  if (!f) return true;
  if (f.cities && f.cities.length > 0 && !f.cities.includes(c.city)) return false;
  if (f.categories && f.categories.length > 0 && !f.categories.includes(c.category)) return false;
  if (f.ageRange) {
    const [lo, hi] = f.ageRange;
    if (c.min_age != null && c.min_age > hi) return false;
    if (c.max_age != null && c.max_age < lo) return false;
  }
  if (f.languages && f.languages.length > 0 && !f.languages.includes(c.primary_language)) return false;
  if (f.institutions && f.institutions.length > 0 && !f.institutions.includes(c.institution)) return false;
  if (f.tags && f.tags.length > 0 && !f.tags.some((t) => c.tags.includes(t))) return false;
  if (f.freeOnly && (c.estimated_annual_fee_eur ?? 0) > 0) return false;
  if (!f.freeOnly && f.maxFee != null && (c.estimated_annual_fee_eur ?? 0) > f.maxFee) return false;
  if (f.locationTypes && f.locationTypes.length > 0 && !f.locationTypes.includes(c.location_type)) return false;
  return true;
}

export function sortCommunities(
  list: CommunityMatch[],
  sort: DiscoveryFilters["sort"],
): CommunityMatch[] {
  const out = [...list];
  switch (sort) {
    case "alphabetical":
      return out.sort((a, b) => a.name.localeCompare(b.name));
    case "fee-asc":
      return out.sort((a, b) => (a.estimated_annual_fee_eur ?? 0) - (b.estimated_annual_fee_eur ?? 0));
    case "fee-desc":
      return out.sort((a, b) => (b.estimated_annual_fee_eur ?? 0) - (a.estimated_annual_fee_eur ?? 0));
    default:
      return out;
  }
}
