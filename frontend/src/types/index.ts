export interface CommunityMatch {
  id: string;
  name: string;
  acronym: string | null;
  city: string;
  category: string;
  tags: string[];
  min_age: number | null;
  max_age: number | null;
  is_university_affiliated: boolean;
  institution: string;
  description_short: string | null;
  description_full: string | null;
  estimated_annual_fee_eur: number | null;
  primary_language: string;
  location_type: string;
  address: string | null;
  postal_code: string | null;
  website_url: string | null;
  instagram_url: string | null;
  contact_email: string | null;
  image_url: string | null;
  match_reason?: string;
  relevance_score?: number;
}

export type SortKey = "alphabetical" | "fee-asc" | "fee-desc" | "newest";

export interface DiscoveryFilters {
  cities: string[];
  categories: string[];
  ageRange: [number, number];
  languages: string[];
  institutions: string[];
  tags: string[];
  maxFee: number;
  freeOnly: boolean;
  locationTypes: string[];
  sort: SortKey;
}

export const VALID_RECOMMENDER_CITIES = ["Delft", "Den Haag", "Rotterdam"] as const;
export type RecommenderCity = (typeof VALID_RECOMMENDER_CITIES)[number];
