import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import type {
  SearchEnginePort,
  SearchFilters,
  SearchResult,
  ListingSearchItem,
} from '../ports/search-engine.port';

interface RawListingRow {
  id: string;
  title: string;
  type: string;
  city: string;
  latitude: number;
  longitude: number;
  distance_m: number | null;
  base_price: number;
  pricing_unit: string;
  max_guests: number | null;
  amenities: string[];
  cover_photo_url: string | null;
  avg_rating: number | null;
  review_count: number;
  total_count: number;
}

@Injectable()
export class PostgisSearchAdapter implements SearchEnginePort {
  constructor(private readonly prisma: PrismaService) {}

  async search(filters: SearchFilters): Promise<SearchResult> {
    const radiusMeters = filters.radiusKm * 1000;
    const offset = (filters.page - 1) * filters.limit;

    // Recherche géolocalisée seulement si des coordonnées valides sont fournies.
    // Sinon : parcours de toutes les annonces publiées (page d'accueil).
    const hasGeo =
      typeof filters.lat === 'number' &&
      typeof filters.lng === 'number' &&
      Number.isFinite(filters.lat) &&
      Number.isFinite(filters.lng) &&
      !(filters.lat === 0 && filters.lng === 0);

    const point = hasGeo
      ? Prisma.sql`ST_SetSRID(ST_MakePoint(${filters.lng}, ${filters.lat}), 4326)::geography`
      : Prisma.empty;

    const distanceSelect = hasGeo
      ? Prisma.sql`ST_Distance(l.location::geography, ${point})`
      : Prisma.sql`NULL::float`;

    const geoClause = hasGeo
      ? Prisma.sql`AND ST_DWithin(l.location::geography, ${point}, ${radiusMeters})`
      : Prisma.empty;

    // Build optional filter clauses safely
    const typeClause = filters.type
      ? Prisma.sql`AND l.type = ${filters.type}::"ListingType"`
      : Prisma.empty;

    const minPriceClause =
      filters.minPrice !== undefined
        ? Prisma.sql`AND l."basePrice" >= ${filters.minPrice}`
        : Prisma.empty;

    const maxPriceClause =
      filters.maxPrice !== undefined
        ? Prisma.sql`AND l."basePrice" <= ${filters.maxPrice}`
        : Prisma.empty;

    const maxGuestsClause =
      filters.maxGuests !== undefined
        ? Prisma.sql`AND l."maxGuests" >= ${filters.maxGuests}`
        : Prisma.empty;

    const amenitiesClause =
      filters.amenities && filters.amenities.length > 0
        ? Prisma.sql`AND l.amenities @> ${filters.amenities}::text[]`
        : Prisma.empty;

    // Exclut les annonces déjà réservées OU dont l'hôte a bloqué la plage demandée
    const dateClause =
      filters.startDate && filters.endDate
        ? Prisma.sql`
            AND NOT EXISTS (
              SELECT 1 FROM "Booking" b
              WHERE b."listingId" = l.id
                AND b.status IN ('PENDING', 'CONFIRMED')
                AND daterange(b."startDate"::date, b."endDate"::date, '[)') &&
                    daterange(${filters.startDate}::date, ${filters.endDate}::date, '[)')
            )
            AND NOT EXISTS (
              SELECT 1 FROM "ListingAvailability" a
              WHERE a."listingId" = l.id
                AND a."isAvailable" = false
                AND daterange(a."startDate"::date, a."endDate"::date, '[)') &&
                    daterange(${filters.startDate}::date, ${filters.endDate}::date, '[)')
            )`
        : Prisma.empty;

    const orderClause = (() => {
      switch (filters.sort) {
        case 'price_asc':  return Prisma.sql`ORDER BY l."basePrice" ASC`;
        case 'price_desc': return Prisma.sql`ORDER BY l."basePrice" DESC`;
        case 'newest':     return Prisma.sql`ORDER BY l."createdAt" DESC`;
        default:
          // "distance" par défaut, mais sans géo on retombe sur les plus récentes.
          return hasGeo
            ? Prisma.sql`ORDER BY distance_m ASC`
            : Prisma.sql`ORDER BY l."createdAt" DESC`;
      }
    })();

    const rows = await this.prisma.$queryRaw<RawListingRow[]>`
      SELECT
        l.id,
        l.title,
        l.type,
        l.city,
        l.latitude,
        l.longitude,
        ${distanceSelect} AS distance_m,
        l."basePrice"        AS base_price,
        l."pricingUnit"      AS pricing_unit,
        l."maxGuests"        AS max_guests,
        l.amenities,
        (
          SELECT p.url FROM "ListingPhoto" p
          WHERE p."listingId" = l.id
          ORDER BY p.position ASC
          LIMIT 1
        ) AS cover_photo_url,
        AVG(r.rating)::float AS avg_rating,
        COUNT(r.id)::int     AS review_count,
        COUNT(*) OVER ()::int AS total_count
      FROM "Listing" l
      LEFT JOIN "Review" r ON r."listingId" = l.id AND r.target = 'LISTING'
      WHERE l.status = 'PUBLISHED'
        ${geoClause}
        ${typeClause}
        ${minPriceClause}
        ${maxPriceClause}
        ${maxGuestsClause}
        ${amenitiesClause}
        ${dateClause}
      GROUP BY l.id
      ${orderClause}
      LIMIT ${filters.limit} OFFSET ${offset}
    `;

    const total = rows[0]?.total_count ?? 0;

    const listings: ListingSearchItem[] = rows.map((row) => ({
      id: row.id,
      title: row.title,
      type: row.type,
      city: row.city,
      latitude: Number(row.latitude),
      longitude: Number(row.longitude),
      distanceKm: row.distance_m != null ? Number(row.distance_m) / 1000 : 0,
      basePrice: Number(row.base_price),
      pricingUnit: row.pricing_unit,
      maxGuests: row.max_guests,
      amenities: row.amenities ?? [],
      coverPhotoUrl: row.cover_photo_url,
      rating: row.avg_rating !== null ? Math.round(Number(row.avg_rating) * 10) / 10 : null,
      reviewCount: Number(row.review_count),
    }));

    return { listings, total, page: filters.page, limit: filters.limit };
  }
}
