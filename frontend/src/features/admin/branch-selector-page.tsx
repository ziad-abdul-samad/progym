'use client';

import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Building2, MapPin } from 'lucide-react';
import Link from 'next/link';

import { Card } from '@/components/ui/card';
import { DashboardLoader, ErrorState } from '@/components/ui/state';
import { apiRequest } from '@/lib/api/client';
import { useAuth } from '@/lib/auth/use-auth';

type BranchSummary = {
  addressAr: string;
  code: string;
  id: string;
  nameAr: string;
};

export function BranchSelectorPage() {
  const auth = useAuth();
  const branches = useQuery({
    enabled: auth.data?.role === 'ADMIN',
    queryFn: () => apiRequest<BranchSummary[]>('/admin/branches'),
    queryKey: ['admin', 'branches'],
  });

  if (auth.isLoading || auth.data?.role !== 'ADMIN' || branches.isLoading) {
    return <DashboardLoader label="جاري تحميل فروع برو جيم" />;
  }
  if (branches.isError) return <ErrorState message={branches.error.message} />;

  return (
    <section className="space-y-6" dir="rtl">
      <div className="overflow-hidden rounded-2xl border border-border bg-zinc-950 p-6 text-white shadow-sm md:p-9">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-brand-accent/40 bg-brand-accent/10 text-brand-accent">
          <Building2 className="h-6 w-6" />
        </div>
        <p className="mt-6 text-xs font-black tracking-[0.2em] text-brand-accent">
          PRO GYM / BRANCHES
        </p>
        <h1 className="mt-3 font-ar-display text-3xl font-black leading-[1.55] md:text-5xl">
          اختر الفرع الذي تريد إدارته
        </h1>
        <p className="mt-3 max-w-3xl text-sm font-semibold leading-7 text-white/55">
          كل لوحة تعرض أعضاء وحضور وطلبات واشتراكات الفرع المختار فقط. يمكنك الرجوع إلى هذه الشاشة
          وتبديل الفرع في أي وقت.
        </p>
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        {branches.data?.map((branch) => (
          <Link className="group block" href={`/ar/dashboard/admin/${branch.code}`} key={branch.id}>
            <Card className="h-full overflow-hidden border-border p-0 transition duration-200 group-hover:-translate-y-1 group-hover:border-brand-accent/70 group-hover:shadow-xl">
              <div className="border-b border-border bg-muted/40 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <span className="inline-flex rounded-full bg-red-600 px-2.5 py-1 text-[10px] font-black text-white">
                      {branch.code.toUpperCase()}
                    </span>
                    <h2 className="mt-3 font-ar-display text-2xl font-black leading-[1.45]">
                      {branch.nameAr}
                    </h2>
                    <p className="mt-1 text-xs font-semibold leading-6 text-muted-foreground">
                      {branch.addressAr}
                    </p>
                  </div>
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-background transition group-hover:border-brand-accent group-hover:bg-brand-accent group-hover:text-black">
                    <ArrowLeft className="h-4 w-4" />
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3 p-5 text-sm font-bold leading-7 text-muted-foreground">
                <MapPin className="h-5 w-5 shrink-0 text-green-700 dark:text-brand-accent" />
                <span>افتح لوحة هذا الفرع لعرض بياناته وإدارته بشكل مستقل</span>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </section>
  );
}
