import {
  ArrowUpRight,
  CalendarCheck,
  Camera,
  Check,
  Dumbbell,
  Flame,
  LineChart,
  LockKeyhole,
  MapPin,
  ScanLine,
  ShieldCheck,
  Sparkles,
  Target,
  Timer,
  Trophy,
  Users,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import type { PublicLocale } from '@progym/shared';

import { ContactForm } from '@/components/public/contact-form';
import { JsonLd } from '@/components/public/json-ld';
import {
  brand,
  coaches,
  publicCopy,
  publicImages,
  resolvePublicLocale,
  type PublicImage,
} from '@/lib/public/content';
import { breadcrumbJsonLd, coachesJsonLd, membershipJsonLd } from '@/lib/public/seo';
import { cn } from '@/lib/utils';

const creativeCopy = {
  ar: {
    heroKicker: 'Fitness Operating System',
    heroBadge: 'تجربة نادي مصممة كعلامة عالمية',
    heroTitle: 'ادخل مكانا يغير شكل التزامك قبل أن تبدأ التمرين.',
    heroBody:
      'Pro Gym يجمع التدريب القوي، المتابعة الرقمية، المدربين، والهوية البصرية في تجربة واحدة تجعل العضو يشعر أن كل تفصيلة صممت لهدفه.',
    storyEyebrow: 'التجربة',
    storyTitle: 'ليست صفحة تعريف. هذه رحلة تقنع الزائر أن النادي يعمل بنظام.',
    storyIntro:
      'الصورة تبقى ثابتة، والمحتوى يتحرك حولها: من أول زيارة إلى أول نتيجة قابلة للقياس.',
    storySteps: [
      ['01', 'استقبال واضح', 'QR للتسجيل والحضور، حساب فوري، وبيانات منظمة من أول دقيقة.', ScanLine],
      ['02', 'خطة تتحرك معك', 'المدرب يرى الحضور، الوزن، الصور، والقياسات قبل أن يعدل البرنامج.', Target],
      ['03', 'نتائج مرئية', 'صور تقدم خاصة، مقارنات، وإحصاءات تجعل التحول ملموسا لا مجرد إحساس.', Camera],
      ['04', 'ثقة يومية', 'الاشتراك، الحضور، التنبيهات، والخطة كلها في مكان واحد بلا فوضى.', LockKeyhole],
    ],
    operatingTitle: 'ما يراه الزائر يجب أن يشرح قوة النظام من غير كلام كثير.',
    operatingItems: [
      ['عضوية ذكية', 'الأيام المتبقية، حالة الاشتراك، والحضور تظهر بوضوح.', CalendarCheck],
      ['مدرب فعلي', 'لا يوجد وعد عام. يوجد طلب متابعة، خطة، وقياس.', Users],
      ['نتائج موثقة', 'صور وقياسات واتجاهات تساعد العضو والمدرب.', LineChart],
    ],
    proofTitle: 'أجواء النادي: قوية، نظيفة، ومصممة للتركيز.',
    proofBody:
      'الواجهة الجديدة تستخدم الأبيض كأساس، الأسود للثقة، والأخضر كلحظة طاقة حادة مرتبطة بالشعار.',
    manifesto: ['لا فوضى', 'لا قوالب', 'لا وعود رخيصة', 'نظام واضح ونتيجة مرئية'],
    finalTitle: 'اجعل أول زيارة للموقع تشبه أول تمرين جاد: مباشرة، قوية، ولا تنسى.',
  },
  en: {
    heroKicker: 'Fitness Operating System',
    heroBadge: 'A gym experience designed like a global brand',
    heroTitle: 'Step into a place that changes your discipline before the first set.',
    heroBody:
      'Pro Gym combines hard training, digital follow-up, coaches, and visual identity into one experience that makes every member feel the system was designed around their goal.',
    storyEyebrow: 'The Experience',
    storyTitle: 'This is not a brochure. It is a scroll story that proves the gym has a system.',
    storyIntro:
      'The image stays fixed while the content moves: from first visit to the first measurable result.',
    storySteps: [
      ['01', 'Frictionless entry', 'QR registration and attendance, instant account creation, and structured data from minute one.', ScanLine],
      ['02', 'A plan that moves', 'The coach sees attendance, weight, photos, and measurements before adjusting the program.', Target],
      ['03', 'Visible results', 'Private progress photos, comparisons, and statistics make transformation tangible.', Camera],
      ['04', 'Daily trust', 'Membership, attendance, notifications, and plans live in one clean place.', LockKeyhole],
    ],
    operatingTitle: 'Visitors should understand the platform power without reading a manual.',
    operatingItems: [
      ['Smart membership', 'Remaining days, subscription status, and attendance are always clear.', CalendarCheck],
      ['Real coaching', 'No vague promise. Requests, plans, and measurable feedback.', Users],
      ['Documented results', 'Photos, measurements, and trends support the member and coach.', LineChart],
    ],
    proofTitle: 'The club atmosphere: strong, clean, and engineered for focus.',
    proofBody:
      'The new interface uses white as the base, black for confidence, and green as a sharp energy hit tied directly to the logo.',
    manifesto: ['No clutter', 'No templates', 'No cheap promises', 'Clear system, visible result'],
    finalTitle: 'Make the first website visit feel like the first serious training session: direct, strong, unforgettable.',
  },
} satisfies Record<
  PublicLocale,
  {
    finalTitle: string;
    heroBadge: string;
    heroBody: string;
    heroKicker: string;
    heroTitle: string;
    manifesto: string[];
    operatingItems: Array<[string, string, LucideIcon]>;
    operatingTitle: string;
    proofBody: string;
    proofTitle: string;
    storyEyebrow: string;
    storyIntro: string;
    storySteps: Array<[string, string, string, LucideIcon]>;
    storyTitle: string;
  }
>;

function Eyebrow({ children }: { children: string }) {
  return (
    <p className="text-xs font-black uppercase tracking-[0.28em] text-green-700 dark:text-brand-accent md:text-sm">
      {children}
    </p>
  );
}

function PublicButton({
  children,
  href,
  variant = 'primary',
}: {
  children: string;
  href: string;
  variant?: 'primary' | 'secondary' | 'ghost';
}) {
  return (
    <Link
      className={cn(
        'group inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-6 text-sm font-black transition duration-300 focus:outline-none focus:ring-2 focus:ring-brand-accent focus:ring-offset-2 focus:ring-offset-background',
        variant === 'primary' &&
          'bg-foreground text-background shadow-[0_18px_45px_rgba(7,10,6,0.18)] hover:-translate-y-0.5 hover:bg-brand-accent hover:text-black',
        variant === 'secondary' &&
          'glass-panel text-foreground hover:-translate-y-0.5 hover:border-brand-accent/50',
        variant === 'ghost' &&
          'border border-border bg-transparent text-foreground hover:-translate-y-0.5 hover:bg-foreground hover:text-background',
      )}
      href={href}
    >
      {children}
      <ArrowUpRight className="h-4 w-4 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden="true" />
    </Link>
  );
}

function SectionHeader({
  align = 'center',
  body,
  eyebrow,
  title,
}: {
  align?: 'center' | 'start';
  body?: string;
  eyebrow: string;
  title: string;
}) {
  return (
    <div className={cn('max-w-3xl', align === 'center' && 'mx-auto text-center')} data-reveal>
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2 className="mt-4 text-balance text-3xl font-black leading-tight text-foreground md:text-5xl">{title}</h2>
      {body ? <p className="mt-5 text-base leading-8 text-muted-foreground md:text-lg">{body}</p> : null}
    </div>
  );
}

function ImagePanel({
  className,
  clip = 'a',
  image,
  priority = false,
}: {
  className?: string;
  clip?: 'a' | 'b' | 'c' | 'd' | 'e' | 'f' | 'none';
  image: PublicImage;
  priority?: boolean;
}) {
  return (
    <div
      className={cn(
        'glass-panel relative overflow-hidden rounded-lg bg-card',
        clip === 'a' && 'cut-image-a',
        clip === 'b' && 'cut-image-b',
        clip === 'c' && 'cut-image-c',
        clip === 'd' && 'cut-image-d',
        clip === 'e' && 'cut-image-e',
        clip === 'f' && 'cut-image-f',
        className,
      )}
    >
      <Image
        alt={image.alt.en}
        className="scale-110 object-cover saturate-[1.05]"
        data-parallax="-12"
        fill
        priority={priority}
        sizes="(min-width: 1024px) 44vw, 100vw"
        src={image.src}
      />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent,rgba(7,10,6,0.28))]" />
    </div>
  );
}

export function WhySection({ locale }: { locale: PublicLocale }) {
  const home = publicCopy[locale].home;
  const icons = [ShieldCheck, Timer, Trophy];

  return (
    <section className="px-4 py-16 md:px-6 md:py-24" id="features">
      <div className="mx-auto max-w-7xl">
        <SectionHeader eyebrow={home.why.eyebrow} title={home.why.title} />
        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {home.why.items.map(([title, body], index) => {
            const Icon = icons[index] ?? ShieldCheck;

            return (
              <article
                className="glass-panel group rounded-lg p-6 transition duration-300 hover:-translate-y-1 hover:border-brand-accent/50"
                data-reveal
                key={title}
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-foreground text-background transition group-hover:bg-brand-accent group-hover:text-black">
                  <Icon className="h-6 w-6" aria-hidden="true" />
                </div>
                <h3 className="mt-7 text-2xl font-black text-foreground">{title}</h3>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">{body}</p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export function StickyStory({ locale }: { locale: PublicLocale }) {
  const extra = creativeCopy[resolvePublicLocale(locale)];

  return (
    <section className="section-sheen relative overflow-hidden px-4 py-16 md:px-6 md:py-28">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-accent/50 to-transparent" />
      <div className="mx-auto max-w-7xl">
        <SectionHeader align="start" body={extra.storyIntro} eyebrow={extra.storyEyebrow} title={extra.storyTitle} />
      </div>
      <div className="mx-auto mt-12 grid max-w-7xl gap-10 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="lg:sticky lg:top-28 lg:h-[calc(100vh-8rem)]">
          <div className="relative h-[28rem] overflow-hidden rounded-lg lg:h-[36rem]" data-reveal>
            <ImagePanel className="absolute inset-0" clip="d" image={publicImages.transformation} />
            <div className="glass-panel absolute bottom-4 start-4 end-4 rounded-lg p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-black text-foreground">Transformation protocol</p>
                <Flame className="h-5 w-5 text-green-700 dark:text-brand-accent" />
              </div>
              <div className="mt-4 grid grid-cols-4 gap-2">
                {[36, 58, 76, 92].map((width) => (
                  <div className="h-2 overflow-hidden rounded-full bg-muted" key={width}>
                    <div className="h-full rounded-full bg-brand-accent" style={{ width: `${width}%` }} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-5 lg:py-10">
          {extra.storySteps.map(([number, title, body, Icon]) => (
            <article className="glass-panel rounded-lg p-6 md:p-8" data-reveal data-story-card key={number}>
              <div className="flex items-start gap-5">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-foreground text-background">
                  <Icon className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm font-black text-green-700 dark:text-brand-accent">{number}</p>
                  <h3 className="mt-2 text-2xl font-black text-foreground md:text-4xl">{title}</h3>
                  <p className="mt-4 text-sm leading-7 text-muted-foreground md:text-base">{body}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function FacilitiesSection({ locale }: { locale: PublicLocale }) {
  const home = publicCopy[locale].home;
  const extra = creativeCopy[resolvePublicLocale(locale)];

  return (
    <section className="overflow-hidden px-4 py-16 md:px-6 md:py-24">
      <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.82fr_1.18fr] lg:items-end">
        <div data-reveal>
          <Eyebrow>{home.facilities.eyebrow}</Eyebrow>
          <h2 className="mt-4 text-balance text-3xl font-black leading-tight text-foreground md:text-5xl">
            {home.facilities.title}
          </h2>
          <p className="mt-6 text-base leading-8 text-muted-foreground">{extra.proofBody}</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <ImagePanel className="h-80 md:h-[32rem]" clip="a" image={publicImages.facility} />
          <div className="grid gap-4 md:pt-14">
            <ImagePanel className="h-64" clip="e" image={publicImages.equipment} />
            <div className="glass-panel rounded-lg p-5">
              <Dumbbell className="h-7 w-7 text-green-700 dark:text-brand-accent" />
              <h3 className="mt-4 text-2xl font-black text-foreground">{home.equipment.title}</h3>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function OperatingSystemSection({ locale }: { locale: PublicLocale }) {
  const extra = creativeCopy[resolvePublicLocale(locale)];

  return (
    <section className="section-sheen px-4 py-16 md:px-6 md:py-24">
      <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-1">
          {extra.operatingItems.map(([title, body, Icon]) => (
            <article className="glass-panel rounded-lg p-5" data-reveal key={title}>
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-brand-accent text-black">
                  <Icon className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-foreground">{title}</h3>
                  <p className="mt-2 text-sm leading-7 text-muted-foreground">{body}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
        <div data-reveal>
          <p className="text-xs font-black uppercase tracking-[0.28em] text-muted-foreground">Digital Layer</p>
          <h2 className="mt-4 text-balance text-3xl font-black leading-tight text-foreground md:text-5xl">
            {extra.operatingTitle}
          </h2>
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            {extra.manifesto.map((item) => (
              <div className="glass-panel rounded-lg p-4 text-sm font-black text-foreground" key={item}>
                <Check className="mb-3 h-5 w-5 text-green-700 dark:text-brand-accent" />
                {item}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export function TransformationStats({ locale }: { locale: PublicLocale }) {
  const home = publicCopy[locale].home;

  return (
    <section className="relative overflow-hidden bg-foreground px-4 py-16 text-background md:px-6 md:py-24">
      <div className="absolute inset-0 premium-grid opacity-20" />
      <div className="absolute start-1/2 top-0 h-96 w-96 -translate-x-1/2 rounded-full bg-brand-accent/20 blur-3xl" />
      <div className="relative mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <div data-reveal>
          <Eyebrow>{home.journey.eyebrow}</Eyebrow>
          <h2 className="mt-4 text-balance text-3xl font-black leading-tight text-background md:text-5xl">
            {home.journey.title}
          </h2>
          <div className="mt-8 grid gap-4">
            {home.journey.steps.map(([title, body], index) => (
              <div className="grid grid-cols-[3rem_1fr] gap-4" key={title}>
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-accent text-sm font-black text-black">
                  {index + 1}
                </div>
                <div>
                  <h3 className="font-black text-background">{title}</h3>
                  <p className="mt-1 text-sm leading-6 text-background/68">{body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3" data-reveal>
          {home.stats.map(([value, label]) => (
            <div className="rounded-lg border border-white/10 bg-white/[0.06] p-6 backdrop-blur" key={label}>
              <p className="text-5xl font-black text-brand-accent" data-count={value}>
                0
              </p>
              <p className="mt-4 text-xs font-bold uppercase tracking-[0.14em] text-background/60">{label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CoachesGrid({ locale, preview = false }: { locale: PublicLocale; preview?: boolean }) {
  const safeLocale = resolvePublicLocale(locale);
  const visibleCoaches = preview ? coaches.slice(0, 3) : coaches;
  const clipVariants = ['cut-image-d', 'cut-image-e', 'cut-image-f'] as const;

  return (
    <div className="grid gap-5 md:grid-cols-3">
      {visibleCoaches.map((coach, index) => (
        <article
          className="glass-panel group overflow-hidden rounded-lg transition duration-300 hover:-translate-y-1 hover:border-brand-accent/50"
          data-reveal
          key={coach.name.en}
        >
          <div className={cn('relative aspect-[4/5] overflow-hidden bg-muted', clipVariants[index % clipVariants.length])}>
            <Image
              alt={coach.image.alt[safeLocale]}
              className="scale-110 object-cover transition duration-700 group-hover:scale-[1.16]"
              data-parallax="-8"
              fill
              sizes="(min-width: 768px) 33vw, 100vw"
              src={coach.image.src}
            />
          </div>
          <div className="p-5">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-green-700 dark:text-brand-accent">
              {coach.specialty[safeLocale]}
            </p>
            <h3 className="mt-3 text-2xl font-black text-foreground">{coach.name[safeLocale]}</h3>
            <p className="mt-2 text-sm font-semibold text-muted-foreground">{coach.experience[safeLocale]}</p>
            <p className="mt-4 text-sm leading-7 text-muted-foreground">{coach.bio[safeLocale]}</p>
          </div>
        </article>
      ))}
    </div>
  );
}

export function SocialProof({ locale }: { locale: PublicLocale }) {
  const copy = publicCopy[locale];
  const home = copy.home;

  return (
    <section className="px-4 py-16 md:px-6 md:py-24">
      <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.9fr_1.1fr]">
        <div data-reveal>
          <h2 className="text-balance text-3xl font-black leading-tight text-foreground md:text-5xl">
            {home.community.title}
          </h2>
          <p className="mt-5 text-base leading-8 text-muted-foreground">{home.community.body}</p>
          <ImagePanel className="mt-8 h-80" clip="f" image={publicImages.community} />
        </div>
        <div className="grid gap-4">
          {copy.testimonials.map(([quote, name], index) => (
            <blockquote className="glass-panel rounded-lg p-6 text-foreground" data-reveal key={name}>
              <div className="mb-5 flex items-center gap-2 text-green-700 dark:text-brand-accent">
                {Array.from({ length: 5 }).map((_, star) => (
                  <Sparkles className="h-4 w-4" key={`${name}-${star}`} />
                ))}
              </div>
              <p className="text-lg font-semibold leading-8">“{quote}”</p>
              <footer className="mt-5 flex items-center justify-between gap-3">
                <span className="text-sm font-black uppercase tracking-[0.16em] text-green-700 dark:text-brand-accent">
                  {name}
                </span>
                <span className="text-xs font-black text-muted-foreground">0{index + 1}</span>
              </footer>
            </blockquote>
          ))}
        </div>
      </div>
    </section>
  );
}

export function FinalCta({ locale }: { locale: PublicLocale }) {
  const home = publicCopy[locale].home;
  const extra = creativeCopy[resolvePublicLocale(locale)];

  return (
    <section className="section-sheen px-4 py-16 text-foreground md:px-6 md:py-24">
      <div className="glass-panel mx-auto flex max-w-7xl flex-col items-start justify-between gap-8 rounded-lg p-6 md:flex-row md:items-end md:p-10">
        <div data-reveal>
          <p className="text-xs font-black uppercase tracking-[0.24em] text-muted-foreground">Pro Gym</p>
          <h2 className="mt-4 max-w-4xl text-balance text-3xl font-black leading-tight md:text-5xl">{extra.finalTitle}</h2>
          <p className="mt-5 max-w-2xl text-base leading-8 text-muted-foreground">{home.cta.body}</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <PublicButton href={`/${locale}/contact`}>{home.cta.primary}</PublicButton>
          <PublicButton href={`/${locale}/membership`} variant="ghost">
            {publicCopy[locale].nav.membership}
          </PublicButton>
        </div>
      </div>
    </section>
  );
}

function PageHero({
  body,
  eyebrow,
  image,
  title,
}: {
  body: string;
  eyebrow: string;
  image: PublicImage;
  title: string;
}) {
  return (
    <section className="section-sheen relative isolate overflow-hidden px-4 pb-16 pt-32 md:px-6 md:pb-24 md:pt-40">
      <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
        <div data-reveal>
          <Eyebrow>{eyebrow}</Eyebrow>
          <h1 className="mt-5 text-balance text-4xl font-black leading-[1.05] tracking-[-0.02em] text-foreground md:text-6xl">
            {title}
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">{body}</p>
        </div>
        <ImagePanel className="h-[30rem]" clip="d" image={image} priority />
      </div>
    </section>
  );
}

export function AboutPage({ locale }: { locale: PublicLocale }) {
  const copy = publicCopy[locale];

  return (
    <main>
      <JsonLd
        data={breadcrumbJsonLd(locale, [
          { label: copy.nav.home, path: `/${locale}` },
          { label: copy.nav.about, path: `/${locale}/about` },
        ])}
      />
      <PageHero body={copy.about.story} eyebrow={copy.about.eyebrow} image={publicImages.facility} title={copy.about.title} />
      <section className="px-4 py-16 md:px-6 md:py-24">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-2">
          <div data-reveal>
            <Eyebrow>Mission</Eyebrow>
            <p className="mt-5 text-balance text-2xl font-black leading-10 text-foreground md:text-4xl">{copy.about.mission}</p>
          </div>
          <div className="grid gap-4">
            <div className="glass-panel rounded-lg p-6" data-reveal>
              <h2 className="text-2xl font-black text-foreground">Vision</h2>
              <p className="mt-4 leading-8 text-muted-foreground">{copy.about.vision}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {copy.about.values.map((value) => (
                <div className="glass-panel rounded-lg p-5 text-center" data-reveal key={value}>
                  <p className="font-black text-green-700 dark:text-brand-accent">{value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
      <section className="section-sheen px-4 py-16 text-foreground md:px-6 md:py-24">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <ImagePanel className="h-[34rem]" clip="f" image={publicImages.equipment} />
          <div data-reveal>
            <p className="text-xs font-black uppercase tracking-[0.24em] text-muted-foreground">Facility</p>
            <h2 className="mt-4 text-balance text-3xl font-black leading-tight md:text-5xl">{copy.about.facilityTitle}</h2>
            <div className="mt-8 grid gap-4">
              {copy.about.highlights.map((item) => (
                <div className="glass-panel flex gap-3 rounded-lg p-4" key={item}>
                  <Check className="mt-1 h-5 w-5 shrink-0 text-green-700 dark:text-brand-accent" />
                  <p className="text-sm leading-7 text-muted-foreground">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

export function CoachesPage({ locale }: { locale: PublicLocale }) {
  const copy = publicCopy[locale];

  return (
    <main>
      <JsonLd data={coachesJsonLd(locale)} />
      <JsonLd
        data={breadcrumbJsonLd(locale, [
          { label: copy.nav.home, path: `/${locale}` },
          { label: copy.nav.coaches, path: `/${locale}/coaches` },
        ])}
      />
      <PageHero body={copy.coaches.intro} eyebrow={copy.coaches.eyebrow} image={publicImages.coachFocus} title={copy.coaches.title} />
      <section className="px-4 py-16 md:px-6 md:py-24">
        <div className="mx-auto max-w-7xl">
          <CoachesGrid locale={locale} />
          <div className="glass-panel mt-10 rounded-lg p-6 text-center" data-reveal>
            <p className="text-lg font-black text-foreground">{copy.coaches.cta}</p>
            <div className="mt-5">
              <PublicButton href={`/${locale}/contact`}>{copy.nav.contact}</PublicButton>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

export function MembershipPage({ locale }: { locale: PublicLocale }) {
  const copy = publicCopy[locale];

  return (
    <main>
      <JsonLd data={membershipJsonLd(locale)} />
      <JsonLd
        data={breadcrumbJsonLd(locale, [
          { label: copy.nav.home, path: `/${locale}` },
          { label: copy.nav.membership, path: `/${locale}/membership` },
        ])}
      />
      <PageHero
        body={copy.membership.intro}
        eyebrow={copy.membership.eyebrow}
        image={publicImages.membership}
        title={copy.membership.title}
      />
      <section className="px-4 py-16 md:px-6 md:py-24">
        <div className="mx-auto grid max-w-7xl gap-6 md:grid-cols-3">
          {copy.membership.tiers.map(([title, body], index) => (
            <article
              className={cn(
                'glass-panel rounded-lg p-6 transition duration-300 hover:-translate-y-1 hover:border-brand-accent/50',
                index === 1 && 'bg-foreground text-background',
              )}
              data-reveal
              key={title}
            >
              <p className={cn('text-xs font-black uppercase tracking-[0.18em]', index === 1 ? 'text-brand-accent' : 'text-green-700 dark:text-brand-accent')}>
                Pro Gym
              </p>
              <h2 className={cn('mt-5 text-3xl font-black', index === 1 ? 'text-background' : 'text-foreground')}>{title}</h2>
              <p className={cn('mt-4 text-sm leading-7', index === 1 ? 'text-background/70' : 'text-muted-foreground')}>{body}</p>
            </article>
          ))}
        </div>
        <div className="mx-auto mt-10 grid max-w-7xl gap-4 md:grid-cols-4">
          {copy.membership.benefits.map((benefit) => (
            <div className="glass-panel rounded-lg p-5" data-reveal key={benefit}>
              <Check className="h-5 w-5 text-green-700 dark:text-brand-accent" />
              <p className="mt-4 text-sm font-semibold leading-7 text-muted-foreground">{benefit}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

export function ContactPage({ locale }: { locale: PublicLocale }) {
  const safeLocale = resolvePublicLocale(locale);
  const copy = publicCopy[safeLocale];

  return (
    <main>
      <JsonLd
        data={breadcrumbJsonLd(locale, [
          { label: copy.nav.home, path: `/${locale}` },
          { label: copy.nav.contact, path: `/${locale}/contact` },
        ])}
      />
      <PageHero body={copy.contact.cta} eyebrow={copy.contact.eyebrow} image={publicImages.community} title={copy.contact.title} />
      <section className="px-4 py-16 md:px-6 md:py-24">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="grid gap-4" data-reveal>
            {([
              [copy.contact.phone, brand.phone, Zap],
              [copy.contact.email, brand.email, Sparkles],
              [copy.contact.address, brand.address[safeLocale], MapPin],
            ] satisfies Array<[string, string, LucideIcon]>).map(([label, value, Icon]) => (
              <div className="glass-panel rounded-lg p-5" key={String(label)}>
                <Icon className="h-5 w-5 text-green-700 dark:text-brand-accent" />
                <p className="mt-4 text-xs font-black uppercase tracking-[0.18em] text-muted-foreground">{String(label)}</p>
                <p className="mt-3 text-lg font-black text-foreground">{String(value)}</p>
              </div>
            ))}
            <div className="glass-panel premium-grid relative min-h-72 overflow-hidden rounded-lg p-6">
              <div className="relative flex h-full min-h-60 flex-col items-center justify-center text-center">
                <MapPin className="h-10 w-10 text-green-700 dark:text-brand-accent" />
                <p className="mt-4 text-xl font-black text-foreground">{copy.contact.map}</p>
                <p className="mt-2 text-sm text-muted-foreground">{brand.address[safeLocale]}</p>
              </div>
            </div>
          </div>
          <div data-reveal>
            <ContactForm locale={locale} />
          </div>
        </div>
      </section>
    </main>
  );
}
