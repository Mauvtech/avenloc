import type { ListingType } from '@prisma/client';

export interface SearchFilters {
  lat?: number;
  lng?: number;
  radiusKm: number;
  q?: string;
  type?: ListingType;
  minPrice?: number;
  maxPrice?: number;
  maxGuests?: number;
  amenities?: string[];
  instantBook?: boolean;
  startDate?: string;
  endDate?: string;
  page: number;
  limit: number;
  sort: 'price_asc' | 'price_desc' | 'distance' | 'newest';
}

export interface ListingSearchItem {
  id: string;
  title: string;
  type: string;
  city: string;
  latitude: number;
  longitude: number;
  distanceKm: number;
  basePrice: number;
  pricingUnit: string;
  maxGuests: number | null;
  amenities: string[];
  coverPhotoUrl: string | null;
  rating: number | null;
  reviewCount: number;
  /** Identité de l'hôte vérifiée — voir VerifiedBadge dans le design de référence. */
  hostVerified: boolean;
}

export interface SearchResult {
  listings: ListingSearchItem[];
  total: number;
  page: number;
  limit: number;
}

/** Options de filtrage disponibles, dérivées du catalogue publié — voir allTypes/allAmenities/maxPricePossible dans le design de référence. */
export interface SearchFacets {
  types: string[];
  amenities: string[];
  maxPrice: number;
}

export const SEARCH_ENGINE_PORT = 'SEARCH_ENGINE_PORT';

export interface SearchEnginePort {
  search(filters: SearchFilters): Promise<SearchResult>;
  facets(): Promise<SearchFacets>;
}
