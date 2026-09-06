import type { ListingType } from '@prisma/client';

export interface SearchFilters {
  lat?: number;
  lng?: number;
  radiusKm: number;
  type?: ListingType;
  minPrice?: number;
  maxPrice?: number;
  maxGuests?: number;
  amenities?: string[];
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
}

export interface SearchResult {
  listings: ListingSearchItem[];
  total: number;
  page: number;
  limit: number;
}

export const SEARCH_ENGINE_PORT = 'SEARCH_ENGINE_PORT';

export interface SearchEnginePort {
  search(filters: SearchFilters): Promise<SearchResult>;
}
