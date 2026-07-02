import type { PaginationDto } from '../dto/pagination.dto';

export function paginationArgs(query: PaginationDto) {
  return {
    skip: (query.page - 1) * query.pageSize,
    take: query.pageSize,
  };
}

export function paginated<T>(items: T[], total: number, query: PaginationDto) {
  return {
    items,
    meta: {
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
    },
  };
}
