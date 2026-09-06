import { Injectable, Inject } from '@nestjs/common';
import { SEARCH_ENGINE_PORT, type SearchEnginePort, type SearchResult } from './ports/search-engine.port';
import type { SearchQueryDto } from './dto/search-query.dto';

@Injectable()
export class SearchService {
  constructor(
    @Inject(SEARCH_ENGINE_PORT)
    private readonly searchEngine: SearchEnginePort,
  ) {}

  search(query: SearchQueryDto): Promise<SearchResult> {
    return this.searchEngine.search({
      lat: query.lat,
      lng: query.lng,
      radiusKm: query.radius,
      type: query.type,
      minPrice: query.minPrice,
      maxPrice: query.maxPrice,
      maxGuests: query.maxGuests,
      amenities: query.amenitiesArray,
      startDate: query.startDate,
      endDate: query.endDate,
      page: query.page,
      limit: query.limit,
      sort: query.sort,
    });
  }
}
