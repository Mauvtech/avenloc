import { Controller, Get, Query } from '@nestjs/common';
import { SearchService } from './search.service';
import { SearchQueryDto } from './dto/search-query.dto';
import type { SearchResult, SearchFacets } from './ports/search-engine.port';

@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get('facets')
  facets(): Promise<SearchFacets> {
    return this.searchService.facets();
  }

  @Get()
  search(@Query() query: SearchQueryDto): Promise<SearchResult> {
    return this.searchService.search(query);
  }
}
