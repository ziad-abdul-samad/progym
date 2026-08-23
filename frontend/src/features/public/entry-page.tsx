'use client';

import { useMutation } from '@tanstack/react-query';
import { ArrowUpRight, CheckCircle2, LogIn, ScanLine, UserPlus } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { PublicLocale } from '@progym/shared';

import { apiRequest, jsonBody } from '@/lib/api/client';
import { useAuth } from '@/lib/auth/use-auth';

type EntryResult = {
  member: { name: string };
  membership: { remainingDays: number; status: string };
  message: string;
};

export function EntryPage({
  branchCode = 'b1',
  locale,
}: {
  branchCode?: string;
  locale: PublicLocale;
}) {
  const auth = useAuth();
  const entry = useMutation({
    mutationFn: () =>
      apiRequest<EntryResult>('/attendance/entry', {
        body: jsonBody({ branchCode }),
        method: 'POST',
      }),
  });
  const [autoSubmitted, setAutoSubmitted] = useState(false);
  const ar = locale === 'ar';

  useEffect(() => {
    if (auth.data?.role !== 'MEMBER' || autoSubmitted || entry.isPending || entry.data) return;
    setAutoSubmitted(true);
    entry.mutate();
  }, [auth.data?.role, autoSubmitted, entry]);

  return (
    <main className="relative min-h-[78vh] overflow-hidden bg-[#050605] px-5 py-20 text-white md:px-8 md:py-28">
      <div className="home-hero-grid absolute inset-0 opacity-15" />
      <div className="relative mx-auto max-w-4xl border border-white/10 bg-[#080a08]/95 p-6 md:p-12">
        <div className="flex h-14 w-14 items-center justify-center border border-[#39ff14]/40 text-[#39ff14]">
          <ScanLine className="h-7 w-7" />
        </div>
        <p className="mt-7 text-[0.62rem] font-black uppercase tracking-[0.22em] text-[#39ff14]">
          Pro Gym / Entry
        </p>
        <h1
          className={`mt-5 max-w-3xl font-black ${
            ar
              ? 'font-ar-display text-4xl leading-[1.45] md:text-6xl'
              : 'text-5xl uppercase leading-[0.95] tracking-[-0.05em] md:text-7xl'
          }`}
        >
          {ar ? 'بوابة دخول اللاعب' : 'Member entry gate'}
        </h1>

        {auth.isLoading ? (
          <div className="mt-10 h-28 animate-pulse bg-white/[0.04]" />
        ) : auth.data?.role === 'MEMBER' ? (
          <div className="mt-10 border-t border-white/10 pt-8">
            {entry.data ? (
              <div className="border border-[#39ff14]/30 bg-[#39ff14]/[0.06] p-6">
                <CheckCircle2 className="h-8 w-8 text-[#39ff14]" />
                <h2 className="mt-4 font-ar-display text-3xl font-black leading-[1.4]">
                  {ar ? `أهلاً ${entry.data.member.name}` : `Welcome, ${entry.data.member.name}`}
                </h2>
                <p className="mt-3 text-white/55">
                  {entry.data.membership.status === 'ACTIVE'
                    ? ar
                      ? `تم تسجيل دخولك. متبقي ${entry.data.membership.remainingDays} يوم في اشتراكك.`
                      : `Entry recorded. ${entry.data.membership.remainingDays} membership days remain.`
                    : ar
                      ? 'تم تسجيل دخولك، لكن اشتراكك يحتاج إلى مراجعة الاستقبال.'
                      : 'Entry recorded, but reception needs to review your membership.'}
                </p>
              </div>
            ) : (
              <>
                <p className="max-w-xl text-sm leading-7 text-white/50">
                  {entry.isPending
                    ? ar
                      ? `أهلاً ${auth.data.fullName}. جاري تسجيل الدخول وعرض حالة الاشتراك...`
                      : `Welcome ${auth.data.fullName}. Recording entry and checking membership status...`
                    : ar
                      ? `أهلاً ${auth.data.fullName}. سيتم تسجيل دخولك تلقائياً.`
                      : `Welcome ${auth.data.fullName}. Your entry will be recorded automatically.`}
                </p>
                {entry.error ? (
                  <p className="mt-4 border border-red-500/25 bg-red-500/10 p-4 text-sm text-red-200">
                    {entry.error.message}
                  </p>
                ) : null}
                {entry.isPending ? (
                  <div className="mt-7 h-2 overflow-hidden bg-white/10">
                    <div className="h-full w-1/2 animate-pulse bg-[#39ff14]" />
                  </div>
                ) : null}
              </>
            )}
          </div>
        ) : auth.data ? (
          <div className="mt-10 border-t border-white/10 pt-8">
            <p className="text-white/55">
              {ar ? 'هذه البوابة مخصصة للاعبين.' : 'This entry gate is for members.'}
            </p>
            <Link
              className="mt-6 inline-flex items-center gap-3 text-sm font-black text-[#39ff14]"
              href="/ar/dashboard/admin"
            >
              {ar ? 'الذهاب إلى لوحة التحكم' : 'Go to dashboard'}{' '}
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
        ) : (
          <div className="mt-10 grid gap-4 border-t border-white/10 pt-8 md:grid-cols-2">
            <Link
              className="group border border-[#39ff14]/45 bg-[#39ff14] p-6 text-black transition hover:bg-white"
              href={`/${locale}/login?next=/${locale}/entry/${branchCode}`}
            >
              <LogIn className="h-6 w-6" />
              <strong className="mt-5 block text-lg">
                {ar ? 'لدي حساب' : 'I have an account'}
              </strong>
              <span className="mt-2 block text-sm opacity-60">
                {ar ? 'سجل الدخول ثم أكمل دخول النادي.' : 'Sign in, then complete gym entry.'}
              </span>
            </Link>
            <Link
              className="group border border-white/12 bg-white/[0.035] p-6 transition hover:border-[#39ff14]/50"
              href={`/${locale}/register?entry=1&branch=${encodeURIComponent(branchCode)}`}
            >
              <UserPlus className="h-6 w-6 text-[#39ff14]" />
              <strong className="mt-5 block text-lg">
                {ar ? 'لا أملك حساباً' : 'Create an account'}
              </strong>
              <span className="mt-2 block text-sm text-white/40">
                {ar ? 'أرسل بياناتك ليعتمدها المراقب.' : 'Submit your details for staff approval.'}
              </span>
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
