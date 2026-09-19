import 'reflect-metadata';
import { Prisma } from '@prisma/client';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { SearchQueryDto } from './dto/search-query.dto';
import { PostgisSearchAdapter } from './adapters/postgis-search.adapter';
import type { PrismaService } from '@/infrastructure/database/prisma.service';
import type { SearchFilters } from './ports/search-engine.port';

describe('Marketplace instant booking filter', () => {
  it.each([['true', true], ['false', false], [undefined, undefined]])(
    'parses the URL value %s without treating false as truthy',
    async (value, expected) => {
      const query = plainToInstance(SearchQueryDto, { instantBook: value });
      expect(await validate(query)).toEqual([]);
      expect(query.instantBook).toBe(expected);
    },
  );

  it('rejects unknown boolean values', async () => {
    const query = plainToInstance(SearchQueryDto, { instantBook: 'yes' });
    expect((await validate(query)).some((e) => e.property === 'instantBook')).toBe(true);
  });

  it.each([true, false, undefined])(
    'applies instant booking consistently to the database query (%s)',
    async (instantBook) => {
      const queryRaw = jest.fn().mockResolvedValue([]);
      const adapter = new PostgisSearchAdapter({ $queryRaw: queryRaw } as unknown as PrismaService);
      const filters: SearchFilters = { radiusKm: 25, page: 1, limit: 24, sort: 'newest', instantBook };
      await adapter.search(filters);
      const [strings, ...values] = queryRaw.mock.calls[0];
      const sql = Prisma.sql(strings, ...values).sql;
      expect(sql.includes('l."instantBookEnabled" = true')).toBe(instantBook === true);
      expect(sql.includes('l."activityValidationRequired" = false')).toBe(instantBook === true);
      expect(sql).toContain("l.status = 'PUBLISHED'");
    },
  );
});
