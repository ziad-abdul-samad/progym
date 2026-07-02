import { describe, expect, it } from 'vitest';

import { paginated, paginationArgs } from './pagination.util';

describe('pagination utilities', () => {
  it('calculates database offsets from a one-based page', () => {
    expect(paginationArgs({ page: 3, pageSize: 12 })).toEqual({
      skip: 24,
      take: 12,
    });
  });

  it('returns stable metadata for an empty result', () => {
    expect(paginated([], 0, { page: 1, pageSize: 12 })).toEqual({
      items: [],
      meta: {
        page: 1,
        pageSize: 12,
        total: 0,
        totalPages: 1,
      },
    });
  });

  it('rounds the final page up', () => {
    expect(paginated(['member'], 25, { page: 2, pageSize: 12 }).meta.totalPages).toBe(3);
  });
});
