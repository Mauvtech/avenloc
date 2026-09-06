import { Module } from '@nestjs/common';
import { SearchService } from './search.service';
import { SearchController } from './search.controller';
import { PostgisSearchAdapter } from './adapters/postgis-search.adapter';
import { SEARCH_ENGINE_PORT } from './ports/search-engine.port';

@Module({
  providers: [
    SearchService,
    {
      provide: SEARCH_ENGINE_PORT,
      useClass: PostgisSearchAdapter,
    },
  ],
  controllers: [SearchController],
})
export class SearchModule {}
