'use client';

import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  MoreHorizontal,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { getPaginationItems } from '@/components/ui/pagination-utils';
import { useMemberLocale } from '@/features/member/member-locale';

export type PageMeta = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type PaginatedResponse<T> = {
  items: T[];
  meta: PageMeta;
};

export function Pagination({
  meta,
  onPageChange,
}: {
  meta: PageMeta;
  onPageChange: (page: number) => void;
}) {
  const { isEnglish, text } = useMemberLocale();
  if (meta.totalPages <= 1) {
    return (
      <p className="text-center text-xs font-bold text-muted-foreground">{text('عرض', 'Showing')} {meta.total} {text('نتيجة', 'results')}</p>
    );
  }

  const start = (meta.page - 1) * meta.pageSize + 1;
  const end = Math.min(meta.page * meta.pageSize, meta.total);
  const pages = getPaginationItems(meta.page, meta.totalPages);

  return (
    <nav
      aria-label={text('التنقل بين الصفحات', 'Pagination')}
      className="flex flex-col items-center justify-center gap-3 rounded-lg border border-border bg-card/80 p-3 text-center"
    >
      <div className="flex max-w-full flex-wrap items-center justify-center gap-1.5">
        <Button
          aria-label={text('الصفحة الأولى', 'First page')}
          className="h-10 min-h-10 w-10 p-0"
          disabled={meta.page <= 1}
          onClick={() => onPageChange(1)}
          title={text('الصفحة الأولى', 'First page')}
          variant="secondary"
        >
          {isEnglish ? <ChevronsLeft className="h-4 w-4" /> : <ChevronsRight className="h-4 w-4" />}
        </Button>
        <Button
          aria-label={text('الصفحة السابقة', 'Previous page')}
          className="h-10 min-h-10 w-10 p-0"
          disabled={meta.page <= 1}
          onClick={() => onPageChange(meta.page - 1)}
          variant="secondary"
        >
          {isEnglish ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </Button>
        {pages.map((page, index) =>
          page === 'ellipsis' ? (
            <span
              aria-hidden="true"
              className="flex h-10 w-8 items-center justify-center text-muted-foreground"
              key={`ellipsis-${index}`}
            >
              <MoreHorizontal className="h-4 w-4" />
            </span>
          ) : (
            <Button
              aria-current={page === meta.page ? 'page' : undefined}
              aria-label={`${text('الصفحة', 'Page')} ${page}`}
              className={
                page === meta.page
                  ? 'h-10 min-h-10 min-w-10 bg-black px-3 text-white hover:bg-black hover:text-white'
                  : 'h-10 min-h-10 min-w-10 px-3'
              }
              key={page}
              onClick={() => onPageChange(page)}
              variant={page === meta.page ? 'primary' : 'secondary'}
            >
              {page}
            </Button>
          ),
        )}
        <Button
          aria-label={text('الصفحة التالية', 'Next page')}
          className="h-10 min-h-10 w-10 p-0"
          disabled={meta.page >= meta.totalPages}
          onClick={() => onPageChange(meta.page + 1)}
          variant="secondary"
        >
          {isEnglish ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
        <Button
          aria-label={text('الصفحة الأخيرة', 'Last page')}
          className="h-10 min-h-10 w-10 p-0"
          disabled={meta.page >= meta.totalPages}
          onClick={() => onPageChange(meta.totalPages)}
          title={text('الصفحة الأخيرة', 'Last page')}
          variant="secondary"
        >
          {isEnglish ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
        </Button>
      </div>
      <p className="text-xs font-bold text-muted-foreground">
        {text('الصفحة', 'Page')} {meta.page} {text('من', 'of')} {meta.totalPages} · {text('عرض', 'showing')} {start}-{end} {text('من أصل', 'of')} {meta.total}
      </p>
    </nav>
  );
}
