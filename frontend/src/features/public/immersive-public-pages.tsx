import {
  ArrowDownRight,
  ArrowUpRight,
  Check,
  Dumbbell,
  MapPin,
  Phone,
  Sparkles,
  Target,
  Trophy,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import type { PublicLocale } from '@progym/shared';

import { ContactForm } from '@/components/public/contact-form';
import { JsonLd } from '@/components/public/json-ld';
import { brand, coaches, publicCopy } from '@/lib/public/content';
import { ExpandedMap } from '@/components/ui/expanded-map';
import { breadcrumbJsonLd, coachesJsonLd, membershipJsonLd } from '@/lib/public/seo';
import { cn } from '@/lib/utils';

const gymImages = [
  '/images/gym/optimized/gym-01.webp',
  '/images/gym/optimized/gym-02.webp',
  '/images/gym/optimized/gym-03.webp',
  '/images/gym/optimized/gym-04.webp',
  '/images/gym/optimized/gym-05.webp',
  '/images/gym/optimized/gym-06.webp',
  '/images/gym/optimized/gym-07.webp',
  '/images/gym/optimized/gym-08.webp',
  '/images/gym/optimized/gym-09.webp',
  '/images/gym/optimized/gym-10.webp',
] as const;

const labels = {
  ar: {
    aboutBody: 'مساحة تدريب حقيقية يديرها نظام واضح، من أول زيارة حتى آخر نتيجة.',
    aboutGallery: 'المكان / التفاصيل',
    aboutKicker: 'داخل Pro Gym',
    aboutMission: 'مهمتنا',
    aboutVision: 'رؤيتنا',
    coachCta: 'اختر المدرب الذي يفهم الهدف، ثم ابدأ بخطة يمكن قياسها.',
    coachIndex: 'فريق التدريب',
    contactHours: 'ساعات العمل',
    contactHoursValue: 'يومياً 07:00 صباحاً — 12:00 ظهراً / الجمعة 02:00 ظهراً — 07:00 مساءً',
    contactFormTitle: 'أخبرنا ما الذي تريد تغييره.',
    contactIntro: 'زيارة واحدة تكفي لتشاهد المكان، تفهم النظام، وتحدد خطوتك التالية.',
    contactKicker: 'ابدأ المحادثة',
    included: 'ضمن العضوية',
    join: 'ابدأ الآن',
    membershipIntro: 'خيارات مباشرة بدون تعقيد. اختر المدة، وابدأ التدريب، وتابع كل شيء من حسابك.',
    membershipKicker: 'اختر التزامك',
    next: 'الخطوة التالية',
    realFacility: 'صور حقيقية من النادي',
    values: 'المبادئ',
  },
  en: {
    aboutBody: 'A real training floor run through one clear system, from the first visit to the latest result.',
    aboutGallery: 'Space / detail',
    aboutKicker: 'Inside Pro Gym',
    aboutMission: 'Our mission',
    aboutVision: 'Our vision',
    coachCta: 'Choose the coach who understands the target, then start with a plan you can measure.',
    coachIndex: 'Training team',
    contactHours: 'Opening hours',
    contactHoursValue: 'Daily 7:00 AM — 12:00 PM / Friday 2:00 PM — 7:00 PM',
    contactFormTitle: 'Tell us what you want to change.',
    contactIntro: 'One visit is enough to see the space, understand the system, and define your next move.',
    contactKicker: 'Start the conversation',
    included: 'What is included',
    join: 'Get started',
    membershipIntro: 'Direct options without friction. Choose the duration, start training, and track everything from your account.',
    membershipKicker: 'Choose your commitment',
    next: 'Next move',
    realFacility: 'Real photographs from the gym',
    values: 'Principles',
  },
} as const;

function Eyebrow({ children }: { children: string }) {
  return (
    <p className="flex items-center gap-3 text-[0.62rem] font-black uppercase tracking-[0.24em] text-[#39ff14]">
      <span className="h-1.5 w-1.5 rounded-full bg-[#39ff14] shadow-[0_0_12px_#39ff14]" />
      {children}
    </p>
  );
}

function PageButton({ children, href, inverse = false }: { children: string; href: string; inverse?: boolean }) {
  return (
    <Link
      className={cn(
        'group inline-flex min-h-14 items-center justify-between gap-10 px-6 text-xs font-black uppercase tracking-[0.12em] transition',
        inverse ? 'border border-white/18 text-white hover:border-white/60' : 'bg-[#39ff14] text-black hover:bg-white',
      )}
      href={href}
    >
      {children}
      <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5" />
    </Link>
  );
}

function Photo({
  alt,
  className,
  index,
  number,
  priority = false,
  sizes = '(min-width: 1024px) 50vw, 100vw',
  src,
}: {
  alt: string;
  className?: string;
  index: number;
  number?: string;
  priority?: boolean;
  sizes?: string;
  src?: string;
}) {
  return (
    <div className={cn('group relative overflow-hidden bg-[#0c0f0c]', className)} data-reveal>
      <Image
        alt={alt}
        className="object-cover grayscale transition duration-700 group-hover:scale-[1.035] group-hover:grayscale-0"
        fill
        priority={priority}
        quality={90}
        sizes={sizes}
        src={src ?? gymImages[index % gymImages.length] ?? gymImages[0]}
      />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_45%,rgba(0,0,0,0.72))]" />
      {number ? (
        <span className="absolute bottom-5 end-5 text-[0.58rem] font-black uppercase tracking-[0.18em] text-white/55">
          Pro Gym / {number}
        </span>
      ) : null}
    </div>
  );
}

function PageHero({
  body,
  eyebrow,
  image,
  locale,
  compactTitle = false,
  title,
}: {
  body: string;
  eyebrow: string;
  image: number;
  locale: PublicLocale;
  compactTitle?: boolean;
  title: string;
}) {
  const isArabic = locale === 'ar';

  return (
    <section className="home-cinematic-hero relative min-h-[88vh] overflow-hidden px-5 pb-16 pt-32 text-white md:px-8 md:pb-24 md:pt-40 lg:px-10 xl:px-14">
      <div className="home-hero-grid absolute inset-0 opacity-20" />
      <div className="home-hero-noise absolute inset-0 opacity-[0.08]" />
      <div className="relative mx-auto grid min-h-[calc(88vh-10rem)] max-w-[94rem] gap-12 lg:grid-cols-[1.04fr_0.96fr] lg:items-end">
        <div className="relative z-10 pb-2" data-reveal>
          <Eyebrow>{eyebrow}</Eyebrow>
          <h1
            className={cn(
              'mt-8 max-w-5xl font-black leading-[0.91] text-white',
              isArabic
                ? compactTitle
                  ? 'font-ar-display text-[clamp(2.65rem,5vw,5.7rem)] leading-[1.15] tracking-[-0.035em]'
                  : 'font-ar-display text-[clamp(3rem,7vw,7.8rem)] tracking-[-0.04em]'
                : compactTitle
                  ? 'text-[clamp(2.75rem,4.7vw,5.4rem)] uppercase leading-[0.98] tracking-[-0.055em]'
                  : 'text-[clamp(4rem,9.6vw,10.5rem)] uppercase tracking-[-0.075em]',
            )}
          >
            {title}
          </h1>
          <div className="mt-8 max-w-xl border-s border-white/18 ps-5">
            <p className="text-base leading-8 text-white/52 md:text-lg">{body}</p>
          </div>
        </div>
        <div className="relative min-h-[25rem] lg:h-[70vh]" data-reveal>
          <Photo alt={title} className="absolute inset-0" index={image} number={`0${image + 1}`} priority />
          <div className="absolute -start-4 top-8 hidden bg-[#39ff14] px-4 py-3 text-[0.55rem] font-black uppercase tracking-[0.16em] text-black md:block">
            Homs / Syria
          </div>
        </div>
      </div>
      <ArrowDownRight className="absolute bottom-7 start-5 h-6 w-6 text-[#39ff14] md:start-8 lg:start-10" />
    </section>
  );
}

function ContactHero({ body, locale, title }: { body: string; locale: PublicLocale; title: string }) {
  const local = labels[locale];

  return (
    <section className="home-cinematic-hero relative min-h-screen overflow-hidden px-5 pb-10 pt-32 text-white md:px-8 md:pb-14 md:pt-40 lg:px-10 xl:px-14">
      <div className="home-hero-grid absolute inset-0 opacity-20" />
      <div className="home-hero-noise absolute inset-0 opacity-[0.08]" />
      <div className="relative mx-auto grid min-h-[calc(100vh-11rem)] max-w-[94rem] gap-10 lg:grid-cols-[0.92fr_1.08fr] lg:items-stretch">
        <div className="flex flex-col justify-between py-3" data-reveal>
          <div>
            <Eyebrow>{publicCopy[locale].contact.eyebrow}</Eyebrow>
            <h1
              className={cn(
                'mt-8 max-w-4xl font-black leading-[0.94] text-white',
                locale === 'ar'
                  ? 'font-ar-display text-[clamp(2.8rem,5.7vw,6.4rem)] tracking-[-0.035em]'
                  : 'text-[clamp(2.65rem,4.35vw,5rem)] uppercase leading-[0.98] tracking-[-0.055em]',
              )}
            >
              {title}
            </h1>
            <p className="mt-7 max-w-lg border-s border-white/18 ps-5 text-base leading-8 text-white/48">{body}</p>
          </div>
          <div className="mt-12 grid gap-px bg-white/12 sm:grid-cols-2">
            <div className="bg-[#080a08] p-5">
              <p className="text-[0.54rem] font-black uppercase tracking-[0.18em] text-[#39ff14]">{local.contactHours}</p>
              <p className="mt-3 text-sm font-black text-white/72">{local.contactHoursValue}</p>
            </div>
            <div className="bg-[#080a08] p-5">
              <p className="text-[0.54rem] font-black uppercase tracking-[0.18em] text-[#39ff14]">{publicCopy[locale].contact.address}</p>
              <p className="mt-3 text-sm font-black text-white/72">{brand.address[locale]}</p>
            </div>
          </div>
        </div>

        <div className="relative min-h-[28rem] overflow-hidden lg:min-h-0" data-reveal>
          <Photo
            alt={title}
            className="absolute inset-0"
            index={9}
            number="10"
            priority
            sizes="(min-width: 1024px) 90vw, 100vw"
            src="/images/gym/WhatsApp Image 2026-07-01 at 2.31.30 PM.jpeg"
          />
          <div className="absolute start-0 top-8 bg-[#39ff14] px-5 py-4 text-[0.58rem] font-black uppercase tracking-[0.16em] text-black">
            {locale === 'ar' ? 'احجز زيارتك' : 'Book your visit'}
          </div>
          <a
            className="absolute bottom-6 end-6 flex h-20 w-20 items-center justify-center rounded-full border border-white/30 bg-black/45 text-white backdrop-blur-md transition hover:border-[#39ff14] hover:text-[#39ff14]"
            href="#contact-form"
          >
            <ArrowDownRight className="h-6 w-6" />
            <span className="sr-only">{local.contactKicker}</span>
          </a>
        </div>
      </div>
    </section>
  );
}

function Marquee({ locale }: { locale: PublicLocale }) {
  const words =
    locale === 'ar'
      ? ['قوة', 'نظام', 'التزام', 'متابعة', 'نتيجة']
      : ['Strength', 'System', 'Discipline', 'Tracking', 'Results'];

  return (
    <div className="overflow-hidden border-y border-black/15 bg-[#39ff14] py-5 text-black">
      <div className="home-marquee flex w-max items-center">
        {[...words, ...words].map((word, index) => (
          <div className="flex items-center" key={`${word}-${index}`}>
            <span className={cn('px-8 text-2xl font-black uppercase md:px-14 md:text-4xl', locale === 'ar' && 'font-ar-display')}>
              {word}
            </span>
            <span className="text-xl">✦</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function FinalBand({ locale, title }: { locale: PublicLocale; title: string }) {
  return (
    <section className="relative overflow-hidden bg-[#39ff14] px-5 py-20 text-black md:px-8 md:py-28 lg:px-10 xl:px-14">
      <div className="absolute inset-0 premium-grid opacity-20" />
      <div className="relative mx-auto flex max-w-[94rem] flex-col gap-10 lg:flex-row lg:items-end lg:justify-between">
        <div data-reveal>
          <p className="text-[0.62rem] font-black uppercase tracking-[0.22em]">Pro Gym / {labels[locale].next}</p>
          <h2
            className={cn(
              'mt-5 max-w-5xl font-black leading-[0.92]',
              locale === 'ar'
                ? 'font-ar-display text-[clamp(2.7rem,6vw,6.5rem)]'
                : 'text-[clamp(3.2rem,7vw,7.5rem)] uppercase tracking-[-0.065em]',
            )}
          >
            {title}
          </h2>
        </div>
        <Link
          className="group inline-flex min-h-16 shrink-0 items-center justify-between gap-12 bg-black px-7 text-xs font-black uppercase tracking-[0.12em] text-white transition hover:bg-white hover:text-black"
          href={`/${locale}/register`}
        >
          {labels[locale].join}
          <ArrowUpRight className="h-5 w-5 transition-transform group-hover:-translate-y-1 group-hover:translate-x-1 rtl:group-hover:-translate-x-1" />
        </Link>
      </div>
    </section>
  );
}

export function AboutPage({ locale }: { locale: PublicLocale }) {
  const copy = publicCopy[locale];
  const local = labels[locale];

  return (
    <main className="bg-[#050605] text-white">
      <JsonLd
        data={breadcrumbJsonLd(locale, [
          { label: copy.nav.home, path: `/${locale}` },
          { label: copy.nav.about, path: `/${locale}/about` },
        ])}
      />
      <PageHero
        body={local.aboutBody}
        compactTitle
        eyebrow={copy.about.eyebrow}
        image={2}
        locale={locale}
        title={copy.about.title}
      />
      <Marquee locale={locale} />

      <section className="relative px-5 py-24 md:px-8 md:py-36 lg:px-10 xl:px-14">
        <div className="home-hero-grid absolute inset-0 opacity-10" />
        <div className="relative mx-auto grid max-w-[94rem] gap-16 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="lg:sticky lg:top-28 lg:h-fit" data-reveal>
            <Eyebrow>{local.aboutKicker}</Eyebrow>
            <p className="mt-8 text-sm leading-7 text-white/45">{copy.about.story}</p>
          </div>
          <div className="grid gap-px bg-white/12">
            {[
              [local.aboutMission, copy.about.mission, Target],
              [local.aboutVision, copy.about.vision, Sparkles],
            ].map(([heading, body, Icon], index) => {
              const ItemIcon = Icon as LucideIcon;
              return (
                <article className="bg-[#080a08] p-7 md:p-12" data-reveal key={String(heading)}>
                  <div className="flex items-center justify-between border-b border-white/10 pb-6">
                    <p className="text-[0.6rem] font-black uppercase tracking-[0.2em] text-[#39ff14]">0{index + 1}</p>
                    <ItemIcon className="h-5 w-5 text-white/28" />
                  </div>
                  <h2 className="mt-8 text-xl font-black uppercase tracking-[0.08em] text-white/45">{String(heading)}</h2>
                  <p className="mt-5 text-2xl font-black leading-[1.35] text-white md:text-4xl">{String(body)}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="px-5 pb-24 md:px-8 md:pb-36 lg:px-10 xl:px-14">
        <div className="mx-auto max-w-[94rem]">
          <div className="mb-10 flex items-end justify-between border-b border-white/12 pb-5" data-reveal>
            <div>
              <Eyebrow>{local.aboutGallery}</Eyebrow>
              <h2 className="mt-5 text-3xl font-black uppercase tracking-[-0.05em] md:text-6xl">{copy.about.facilityTitle}</h2>
            </div>
            <span className="hidden text-[0.55rem] font-black uppercase tracking-[0.18em] text-white/30 md:block">
              {local.realFacility} / 10
            </span>
          </div>
          <div className="grid gap-3 md:grid-cols-12">
            <Photo alt={copy.about.facilityTitle} className="min-h-[32rem] md:col-span-7" index={4} number="05" />
            <div className="grid gap-3 md:col-span-5">
              <Photo alt={copy.about.facilityTitle} className="min-h-64" index={7} number="08" />
              <Photo alt={copy.about.facilityTitle} className="min-h-64" index={9} number="10" />
            </div>
          </div>
          <div className="mt-12 grid gap-px bg-white/12 sm:grid-cols-2 lg:grid-cols-4">
            {copy.about.values.map((value, index) => (
              <div className="bg-[#080a08] p-6" data-reveal key={value}>
                <p className="text-[0.56rem] font-black text-[#39ff14]">0{index + 1}</p>
                <p className="mt-10 text-xl font-black uppercase">{value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <FinalBand locale={locale} title={copy.home.cta.title} />
    </main>
  );
}

export function CoachesPage({ locale }: { locale: PublicLocale }) {
  const copy = publicCopy[locale];
  const local = labels[locale];

  return (
    <main className="bg-[#050605] text-white">
      <JsonLd data={coachesJsonLd(locale)} />
      <JsonLd
        data={breadcrumbJsonLd(locale, [
          { label: copy.nav.home, path: `/${locale}` },
          { label: copy.nav.coaches, path: `/${locale}/coaches` },
        ])}
      />
      <PageHero body={copy.coaches.intro} eyebrow={copy.coaches.eyebrow} image={6} locale={locale} title={copy.coaches.title} />
      <Marquee locale={locale} />

      <section className="px-5 py-24 md:px-8 md:py-36 lg:px-10 xl:px-14">
        <div className="mx-auto max-w-[94rem]">
          <div className="mb-12 grid gap-8 lg:grid-cols-2 lg:items-end" data-reveal>
            <div>
              <Eyebrow>{local.coachIndex}</Eyebrow>
              <h2 className="mt-6 text-4xl font-black uppercase tracking-[-0.055em] md:text-7xl">{copy.coaches.eyebrow}</h2>
            </div>
            <p className="max-w-xl text-base leading-8 text-white/48 lg:justify-self-end">{local.coachCta}</p>
          </div>

          <div className="grid gap-px bg-white/12 lg:grid-cols-3">
            {coaches.map((coach, index) => (
              <article className="group bg-[#080a08]" data-reveal key={coach.name.en}>
                <Photo
                  alt={coach.name[locale]}
                  className={cn('aspect-[4/5]', index === 1 && 'lg:mt-16')}
                  index={[1, 5, 8][index] ?? index}
                  number={`0${index + 1}`}
                />
                <div className="p-6 md:p-8">
                  <p className="text-[0.58rem] font-black uppercase tracking-[0.18em] text-[#39ff14]">
                    {coach.specialty[locale]}
                  </p>
                  <h2 className="mt-4 text-3xl font-black uppercase tracking-[-0.04em]">{coach.name[locale]}</h2>
                  <p className="mt-2 text-xs font-bold uppercase tracking-[0.1em] text-white/35">{coach.experience[locale]}</p>
                  <p className="mt-6 border-t border-white/10 pt-5 text-sm leading-7 text-white/48">{coach.bio[locale]}</p>
                </div>
              </article>
            ))}
          </div>
          <div className="mt-10 flex flex-col items-start justify-between gap-6 border-t border-white/12 pt-8 md:flex-row md:items-center" data-reveal>
            <p className="max-w-2xl text-2xl font-black leading-tight md:text-4xl">{copy.coaches.cta}</p>
            <PageButton href={`/${locale}/contact`}>{copy.nav.contact}</PageButton>
          </div>
        </div>
      </section>
      <FinalBand locale={locale} title={copy.home.cta.title} />
    </main>
  );
}

export function MembershipPage({ locale }: { locale: PublicLocale }) {
  const copy = publicCopy[locale];
  const local = labels[locale];

  return (
    <main className="bg-[#050605] text-white">
      <JsonLd data={membershipJsonLd(locale)} />
      <JsonLd
        data={breadcrumbJsonLd(locale, [
          { label: copy.nav.home, path: `/${locale}` },
          { label: copy.nav.membership, path: `/${locale}/membership` },
        ])}
      />
      <PageHero body={local.membershipIntro} eyebrow={copy.membership.eyebrow} image={0} locale={locale} title={copy.membership.title} />
      <Marquee locale={locale} />

      <section className="relative px-5 py-24 md:px-8 md:py-36 lg:px-10 xl:px-14">
        <div className="home-hero-grid absolute inset-0 opacity-10" />
        <div className="relative mx-auto max-w-[94rem]">
          <div className="mb-12 grid gap-8 lg:grid-cols-2 lg:items-end" data-reveal>
            <div>
              <Eyebrow>{local.membershipKicker}</Eyebrow>
              <h2 className="mt-6 text-4xl font-black uppercase tracking-[-0.055em] md:text-7xl">{copy.membership.eyebrow}</h2>
            </div>
            <p className="max-w-xl text-base leading-8 text-white/48 lg:justify-self-end">{copy.membership.intro}</p>
          </div>

          <div className="grid gap-px bg-white/12 lg:grid-cols-3">
            {copy.membership.tiers.map(([title, body], index) => (
              <article
                className={cn(
                  'relative flex min-h-[31rem] flex-col p-7 md:p-9',
                  index === 1 ? 'bg-[#39ff14] text-black' : 'bg-[#080a08] text-white',
                )}
                data-reveal
                key={title}
              >
                <div className={cn('flex items-center justify-between border-b pb-5', index === 1 ? 'border-black/20' : 'border-white/10')}>
                  <p className="text-[0.58rem] font-black uppercase tracking-[0.18em]">Pro Gym / 0{index + 1}</p>
                  {index === 1 ? <Trophy className="h-5 w-5" /> : <Zap className="h-5 w-5 text-[#39ff14]" />}
                </div>
                <h2 className="mt-10 text-5xl font-black uppercase tracking-[-0.06em] md:text-6xl">{title}</h2>
                <p className={cn('mt-6 text-sm leading-7', index === 1 ? 'text-black/60' : 'text-white/45')}>{body}</p>
                <Link
                  className={cn(
                    'group mt-auto flex items-center justify-between border-t pt-6 text-xs font-black uppercase tracking-[0.12em]',
                    index === 1 ? 'border-black/20' : 'border-white/12',
                  )}
                  href={`/${locale}/register`}
                >
                  {local.join}
                  <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-1 group-hover:translate-x-1 rtl:group-hover:-translate-x-1" />
                </Link>
              </article>
            ))}
          </div>

          <div className="mt-20 grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <Photo alt={copy.membership.title} className="min-h-[34rem]" index={3} number="04" />
            <div data-reveal>
              <Eyebrow>{local.included}</Eyebrow>
              <div className="mt-8">
                {copy.membership.benefits.map((benefit, index) => (
                  <div className="flex items-center gap-5 border-t border-white/12 py-6" key={benefit}>
                    <span className="text-[0.56rem] font-black text-[#39ff14]">0{index + 1}</span>
                    <p className="text-xl font-black md:text-2xl">{benefit}</p>
                    <Check className="ms-auto h-5 w-5 text-white/30" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
      <FinalBand locale={locale} title={copy.home.cta.title} />
    </main>
  );
}

export function ContactPage({ locale }: { locale: PublicLocale }) {
  const copy = publicCopy[locale];
  const local = labels[locale];
  const contactItems: Array<[string, string, LucideIcon, string]> = [
    [copy.contact.phone, brand.phone, Phone, `tel:${brand.phone}`],
    [copy.contact.address, brand.address[locale], MapPin, brand.mapsUrl],
    [local.contactHours, local.contactHoursValue, Dumbbell, '#contact-form'],
  ];

  return (
    <main className="bg-[#050605] text-white">
      <JsonLd
        data={breadcrumbJsonLd(locale, [
          { label: copy.nav.home, path: `/${locale}` },
          { label: copy.nav.contact, path: `/${locale}/contact` },
        ])}
      />
      <ContactHero body={local.contactIntro} locale={locale} title={copy.contact.title} />
      <Marquee locale={locale} />

      <section className="px-5 py-24 md:px-8 md:py-36 lg:px-10 xl:px-14" id="contact-form">
        <div className="mx-auto max-w-[94rem]">
          <div className="grid gap-12 lg:grid-cols-[0.85fr_1.15fr]">
            <div data-reveal>
              <Eyebrow>{local.contactKicker}</Eyebrow>
              <h2 className="mt-7 text-4xl font-black uppercase leading-[0.95] tracking-[-0.055em] md:text-7xl">{local.contactFormTitle}</h2>
              <div className="mt-12 grid gap-px bg-white/12 sm:grid-cols-2 lg:grid-cols-1">
                {contactItems.map(([label, value, Icon, href], index) => (
                  <a className="group flex items-start gap-5 bg-[#080a08] p-5 transition hover:bg-white/[0.06]" href={href} key={label}>
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center border border-white/12 text-[#39ff14]">
                      <Icon className="h-5 w-5" />
                    </span>
                    <span>
                      <span className="block text-[0.55rem] font-black uppercase tracking-[0.18em] text-white/30">
                        0{index + 1} / {label}
                      </span>
                      <span className="mt-2 block text-sm font-black text-white/78">{value}</span>
                    </span>
                  </a>
                ))}
              </div>
            </div>
            <div data-reveal>
              <ContactForm locale={locale} />
            </div>
          </div>

          <div className="mt-16 grid gap-3 md:grid-cols-12" id="location">
            <div className="md:col-span-8">
              <ExpandedMap label={brand.address[locale]} latitude={34.7179977} longitude={36.6970795} mapUrl={brand.mapsUrl} />
            </div>
            <div className="relative flex min-h-72 flex-col justify-between overflow-hidden bg-[#39ff14] p-7 text-black md:col-span-4">
              <div className="premium-grid absolute inset-0 opacity-25" />
              <div className="relative">
                <MapPin className="h-10 w-10" />
                <p className="mt-8 text-[0.58rem] font-black uppercase tracking-[0.18em]">{copy.contact.map}</p>
                <h2 className="mt-4 text-4xl font-black uppercase leading-none tracking-[-0.05em]">{brand.address[locale]}</h2>
              </div>
              <div className="relative border-t border-black/20 pt-5">
                <p className="text-xs font-black uppercase tracking-[0.12em]">Pro Gym / Homs</p>
                <p className="mt-2 text-sm text-black/55">{local.contactHoursValue}</p>
              </div>
            </div>
          </div>
        </div>
      </section>
      <FinalBand locale={locale} title={copy.home.cta.title} />
    </main>
  );
}
