import { ArrowLeft, ArrowRight, Check, LockKeyhole, ScanLine } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { Suspense } from 'react';
import type { PublicLocale } from '@progym/shared';

import { ImmersiveRegisterForm } from '@/features/auth/auth-forms';
import { Skeleton } from '@/components/ui/state';

const pageCopy = {
  ar: {
    back: 'العودة للرئيسية',
    benefits: ['ملف عضوية منظم', 'خطط تدريب وتغذية', 'متابعة حضور وتقدم'],
    eyebrow: 'إنشاء ملفك',
    login: 'لديك حساب؟ سجل الدخول',
    note: 'بعد إرسال البيانات يراجع المراقب معلوماتك وصورتك ويحدد مدة الاشتراك قبل تفعيل الحساب.',
    step: 'إعداد العضوية',
    title: 'ابدأ من بيانات واضحة. ابنِ نتيجة يمكن قياسها.',
  },
  en: {
    back: 'Back to home',
    benefits: ['Structured member profile', 'Training and nutrition plans', 'Attendance and progress tracking'],
    eyebrow: 'Build your profile',
    login: 'Already a member? Sign in',
    note: 'After submission, staff review your details and photo and set the membership duration before activation.',
    step: 'Membership setup',
    title: 'Start with clear data. Build a result you can measure.',
  },
} as const;

export default async function RegisterPage({ params }: { params: Promise<{ locale: PublicLocale }> }) {
  const { locale } = await params;
  const copy = pageCopy[locale];
  const otherLocale = locale === 'ar' ? 'en' : 'ar';
  const DirectionArrow = locale === 'ar' ? ArrowRight : ArrowLeft;

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#050605] text-white">
      <div className="home-hero-grid absolute inset-0 opacity-15" />
      <div className="home-hero-noise absolute inset-0 opacity-[0.07]" />

      <header className="relative z-30 flex items-center justify-between border-b border-white/10 px-5 py-5 md:px-8 lg:px-10">
        <Link className="group flex items-center gap-3" href={`/${locale}`}>
          <span className="relative h-11 w-9 overflow-hidden bg-black">
            <Image
              alt="Pro Gym"
              className="scale-[1.42] object-cover transition duration-500 group-hover:scale-[1.52]"
              fill
              priority
              sizes="36px"
              src="/images/gym/log_bw.jpeg"
            />
          </span>
          <span className="text-xs font-black uppercase tracking-[0.22em]">Pro Gym®</span>
        </Link>
        <div className="flex items-center gap-3">
          <Link
            className="text-[0.58rem] font-black uppercase tracking-[0.18em] text-white/42 transition hover:text-[#39ff14]"
            href={`/${otherLocale}/register`}
          >
            {otherLocale}
          </Link>
          <Link
            className="group flex items-center gap-3 border border-white/12 bg-white/[0.035] px-4 py-3 text-[0.58rem] font-black uppercase tracking-[0.14em] text-white/62 transition hover:border-[#39ff14]/60 hover:text-[#39ff14]"
            href={`/${locale}`}
          >
            <DirectionArrow className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5 rtl:group-hover:translate-x-0.5" />
            <span className="hidden sm:inline">{copy.back}</span>
          </Link>
        </div>
      </header>

      <div className="relative z-10 mx-auto grid max-w-[94rem] gap-12 px-5 py-12 md:px-8 md:py-16 lg:grid-cols-[0.72fr_1.28fr] lg:gap-16 lg:px-10 lg:py-20">
        <aside className="lg:sticky lg:top-10 lg:h-fit">
          <div className="flex items-center gap-3 text-[0.58rem] font-black uppercase tracking-[0.2em] text-[#39ff14]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#39ff14] shadow-[0_0_12px_#39ff14]" />
            {copy.eyebrow}
          </div>
          <h1
            className={`mt-7 max-w-3xl font-black ${
              locale === 'ar'
                ? 'font-ar-display text-[clamp(2.7rem,4.8vw,5.6rem)] leading-[1.15] tracking-[-0.035em]'
                : 'text-[clamp(3rem,5vw,6rem)] uppercase leading-[0.94] tracking-[-0.065em]'
            }`}
          >
            {copy.title}
          </h1>
          <div className="mt-8 hidden gap-3 lg:grid">
            {copy.benefits.map((benefit, index) => (
              <div className="flex items-center gap-4 border-t border-white/10 pt-4" key={benefit}>
                <span className="text-[0.54rem] font-black text-[#39ff14]">0{index + 1}</span>
                <p className="text-sm font-bold text-white/58">{benefit}</p>
                <Check className="ms-auto h-4 w-4 text-white/25" />
              </div>
            ))}
          </div>

          <div className="relative mt-10 hidden aspect-[16/9] overflow-hidden lg:block">
            <Image
              alt="Pro Gym membership"
              className="object-cover grayscale"
              fill
              sizes="(min-width: 1024px) 34vw, 100vw"
              src="/images/gym/optimized/gym-03.webp"
            />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent,rgba(0,0,0,0.78))]" />
            <div className="absolute inset-x-5 bottom-5 flex items-center justify-between border-t border-white/20 pt-4">
              <span className="text-[0.54rem] font-black uppercase tracking-[0.16em] text-white/48">{copy.step}</span>
              <ScanLine className="h-4 w-4 text-[#39ff14]" />
            </div>
          </div>

          <div className="mt-5 hidden items-start gap-3 border border-white/10 bg-white/[0.025] p-4 text-xs leading-6 text-white/35 lg:flex">
            <LockKeyhole className="mt-1 h-4 w-4 shrink-0 text-[#39ff14]" />
            {copy.note}
          </div>
          <Link
            className="mt-5 hidden items-center gap-3 text-[0.6rem] font-black uppercase tracking-[0.14em] text-white/40 transition hover:text-[#39ff14] lg:inline-flex"
            href={`/${locale}/login`}
          >
            {copy.login}
            <ArrowLeft className="h-3.5 w-3.5 rtl:rotate-180" />
          </Link>
        </aside>

        <section>
          <Suspense
            fallback={<Skeleton className="h-[50rem] w-full rounded-none border border-white/10 bg-white/[0.035]" />}
          >
            <ImmersiveRegisterForm locale={locale} />
          </Suspense>
        </section>
      </div>
    </main>
  );
}
