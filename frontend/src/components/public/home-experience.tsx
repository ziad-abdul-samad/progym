'use client';

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Dumbbell,
  ScanLine,
  Sparkles,
  Users,
  type LucideIcon,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useLayoutEffect, useRef, useState } from 'react';
import type { PublicLocale } from '@progym/shared';

import { AnimatedCounter } from '@/components/public/animated-counter';
import { MotionRibbonSection } from '@/components/public/motion-ribbon-section';

const imageRoot = '/images/gym';

const images = {
  cardio: `${imageRoot}/WhatsApp Image 2026-07-01 at 2.31.30 PM (4).jpeg`,
  dumbbellRoom: `${imageRoot}/WhatsApp Image 2026-07-01 at 2.31.30 PM (5).jpeg`,
  dumbbells: `${imageRoot}/WhatsApp Image 2026-07-01 at 2.31.30 PM (9).jpeg`,
  floorDark: `${imageRoot}/WhatsApp Image 2026-07-01 at 2.31.30 PM (2).jpeg`,
  floorWide: `${imageRoot}/WhatsApp Image 2026-07-01 at 2.31.30 PM (3).jpeg`,
  legPress: `${imageRoot}/WhatsApp Image 2026-07-01 at 2.31.30 PM (1).jpeg`,
  plates: `${imageRoot}/WhatsApp Image 2026-07-01 at 2.31.30 PM (6).jpeg`,
  platesClose: `${imageRoot}/WhatsApp Image 2026-07-01 at 2.31.30 PM (8).jpeg`,
  rack: `${imageRoot}/WhatsApp Image 2026-07-01 at 2.31.30 PM (7).jpeg`,
  treadmills: `${imageRoot}/WhatsApp Image 2026-07-01 at 2.31.30 PM.jpeg`,
} as const;

const content = {
  ar: {
    about: {
      body: 'Pro Gym ليس مجموعة صفحات منفصلة. إنه نظام تشغيل يومي يربط الإدارة والمدربين واللاعبين في مسار واضح، سريع، وقابل للقياس.',
      eyebrow: 'عن النظام',
      note: 'وضوح في الإدارة. دقة في المتابعة. تجربة أفضل للجميع.',
      title: 'كل حركة داخل النادي تتحول إلى معلومة يمكنك استخدامها.',
    },
    capabilities: {
      body: 'تنتقل الصورة وتتغير البيانات مع كل مرحلة، بينما يبقى النظام موحداً من أول تسجيل حتى آخر نتيجة.',
      eyebrow: 'من الدخول إلى التقدم',
      title: 'منظومة واحدة. أربع نقاط تحكم أساسية.',
    },
    final: {
      body: 'ابدأ بإدارة أكثر وضوحاً، واترك النظام يتولى التفاصيل اليومية.',
      primary: 'ابدأ الإدارة',
      secondary: 'شاهد لوحة التحكم',
      title: 'ناديك يملك الطاقة. أعطه النظام.',
    },
    gallery: {
      eyebrow: 'المكان الحقيقي',
      title: 'تقنية مصممة حول نادي حقيقي، لا حول صور جاهزة.',
    },
    marquee: ['إدارة الأعضاء', 'الحضور الذكي', 'خطط التدريب', 'متابعة التقدم', 'إدارة المدربين'],
    roles: {
      body: 'واجهة مختلفة لكل دور، لكن البيانات والقرارات تبقى متصلة في نظام واحد.',
      eyebrow: 'نظام واحد، ثلاث تجارب',
      title: 'كل شخص يرى ما يحتاجه، في اللحظة التي يحتاجه فيها.',
    },
    stats: {
      body: 'لمحة مباشرة عن حركة النادي اليومية وقوة النظام التشغيلي.',
      eyebrow: 'أرقام واضحة',
      title: 'ما يحدث داخل النادي، يظهر أمامك فوراً.',
    },
  },
  en: {
    about: {
      body: 'Pro Gym is not a collection of disconnected pages. It is a daily operating system connecting owners, coaches, and members through one measurable workflow.',
      eyebrow: 'About the system',
      note: 'Clear operations. Accurate follow-up. A better experience for everyone.',
      title: 'Every movement inside the gym becomes information you can use.',
    },
    capabilities: {
      body: 'The picture and live data evolve with every stage while the workflow stays connected from first registration to measurable progress.',
      eyebrow: 'From entry to progress',
      title: 'One system. Four essential control points.',
    },
    final: {
      body: 'Run the gym with clarity and let the system handle the daily operational detail.',
      primary: 'Start Managing',
      secondary: 'View Dashboard',
      title: 'Your gym has the energy. Give it the system.',
    },
    gallery: {
      eyebrow: 'The real facility',
      title: 'Technology designed around a real gym—not stock imagery.',
    },
    marquee: ['Member operations', 'Smart attendance', 'Workout plans', 'Progress tracking', 'Coach control'],
    roles: {
      body: 'A focused interface for every role, with data and decisions connected through one operating system.',
      eyebrow: 'One system, three experiences',
      title: 'Everyone sees what matters, exactly when it matters.',
    },
    stats: {
      body: 'A direct snapshot of daily movement and the strength of the operating system.',
      eyebrow: 'Key facts',
      title: 'What happens inside the gym becomes visible instantly.',
    },
  },
} as const;

const steps = {
  ar: [
    {
      body: 'تسجيل QR سريع، ملف منظم، وحالة اشتراك واضحة قبل أن يبدأ اللاعب تمرينه.',
      image: images.floorDark,
      number: '01',
      tag: 'الدخول',
      title: 'عضو معروف من أول لحظة.',
    },
    {
      body: 'خطط تدريب وتغذية وإصدارات محفوظة، مع متابعة دقيقة لما نفّذه اللاعب فعلياً.',
      image: images.plates,
      number: '02',
      tag: 'التدريب',
      title: 'الخطة تتحرك مع النتيجة.',
    },
    {
      body: 'الأوزان والتكرارات والإنجازات والأرقام الشخصية تصبح تاريخاً قابلاً للقراءة.',
      image: images.rack,
      number: '03',
      tag: 'الأداء',
      title: 'كل تمرين يترك أثراً.',
    },
    {
      body: 'صور أمامية وجانبية وخلفية، مقارنات صحيحة، وطلبات متابعة لا تكتمل قبل اكتمال المطلوب.',
      image: images.cardio,
      number: '04',
      tag: 'التقدم',
      title: 'التحول يظهر كما هو.',
    },
  ],
  en: [
    {
      body: 'Fast QR registration, a structured profile, and clear membership status before the workout begins.',
      image: images.floorDark,
      number: '01',
      tag: 'Entry',
      title: 'Know every member from minute one.',
    },
    {
      body: 'Versioned workout and nutrition plans with precise tracking of what the member actually completed.',
      image: images.plates,
      number: '02',
      tag: 'Training',
      title: 'The plan moves with the result.',
    },
    {
      body: 'Weights, repetitions, completion, and personal records become a readable performance history.',
      image: images.rack,
      number: '03',
      tag: 'Performance',
      title: 'Every workout leaves a signal.',
    },
    {
      body: 'Correct front, side, and back comparisons with progress requests that wait for every required view.',
      image: images.cardio,
      number: '04',
      tag: 'Progress',
      title: 'Transformation becomes visible.',
    },
  ],
} as const;

const roles: Record<PublicLocale, Array<{ body: string; icon: LucideIcon; label: string; title: string }>> = {
  ar: [
    { body: 'اشتراكات، حضور، مدربون، تدقيق، وتنبيهات تشغيلية في مكان واحد.', icon: BarChart3, label: '01 / Owner', title: 'المالك يرى الصورة كاملة.' },
    { body: 'عملاء، خطط، طلبات تقدم، وسجل أداء يساعد على اتخاذ قرار أدق.', icon: Dumbbell, label: '02 / Coach', title: 'المدرب يعمل ببيانات حقيقية.' },
    { body: 'اشتراكه، حضوره، خطته، إنجازه، وصور تقدمه بدون تعقيد.', icon: Users, label: '03 / Member', title: 'اللاعب يعرف خطوته التالية.' },
  ],
  en: [
    { body: 'Memberships, attendance, coaches, audit, and operational alerts in one place.', icon: BarChart3, label: '01 / Owner', title: 'The owner sees the whole picture.' },
    { body: 'Clients, plans, progress requests, and performance history for better coaching decisions.', icon: Dumbbell, label: '02 / Coach', title: 'The coach works with real data.' },
    { body: 'Membership, attendance, plans, achievements, and progress photography without friction.', icon: Users, label: '03 / Member', title: 'The member knows the next move.' },
  ],
};

const gallery = [
  { category: { ar: 'تشغيل', en: 'Operations' }, image: images.treadmills, index: '01', title: { ar: 'حركة النادي لحظة بلحظة', en: 'The gym in constant motion' } },
  { category: { ar: 'الأعضاء', en: 'Members' }, image: images.legPress, index: '02', title: { ar: 'كل عضو معروف داخل النظام', en: 'Every member has a clear record' } },
  { category: { ar: 'المساحة', en: 'Facility' }, image: images.floorWide, index: '03', title: { ar: 'رؤية كاملة للمكان والتشغيل', en: 'Total visibility across the floor' } },
  { category: { ar: 'الأداء', en: 'Performance' }, image: images.platesClose, index: '04', title: { ar: 'الأرقام تتحول إلى تقدم', en: 'Numbers become visible progress' } },
  { category: { ar: 'التدريب', en: 'Training' }, image: images.dumbbells, index: '05', title: { ar: 'كل تمرين يترك سجلاً', en: 'Every workout leaves a record' } },
  { category: { ar: 'القوة', en: 'Strength' }, image: images.plates, index: '06', title: { ar: 'خطط مبنية حول النتيجة', en: 'Plans built around the outcome' } },
  { category: { ar: 'التجهيزات', en: 'Equipment' }, image: images.cardio, index: '07', title: { ar: 'كل جهاز جزء من التجربة', en: 'Every machine supports the system' } },
  { category: { ar: 'المتابعة', en: 'Tracking' }, image: images.rack, index: '08', title: { ar: 'تفاصيل صغيرة، قرارات أدق', en: 'Small details, sharper decisions' } },
  { category: { ar: 'النظام', en: 'System' }, image: images.floorDark, index: '09', title: { ar: 'هدوء في الواجهة وقوة في الداخل', en: 'Quiet interface, powerful operation' } },
  { category: { ar: 'المجتمع', en: 'Community' }, image: images.dumbbellRoom, index: '10', title: { ar: 'نادي واحد، تجربة متصلة', en: 'One gym, one connected experience' } },
] as const;

function Eyebrow({ children }: { children: string }) {
  return (
    <p className="flex items-center gap-3 text-[0.62rem] font-black uppercase tracking-[0.24em] text-[#39ff14]">
      <span className="h-1.5 w-1.5 rounded-full bg-[#39ff14] shadow-[0_0_12px_#39ff14]" />
      {children}
    </p>
  );
}

export function HomeExperience({ locale }: { locale: PublicLocale }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [activeStep, setActiveStep] = useState(0);
  const copy = content[locale];
  const localeSteps = steps[locale];
  const isArabic = locale === 'ar';
  const displayClass = isArabic ? 'font-ar-display tracking-[-0.035em]' : 'tracking-[-0.06em]';

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    gsap.registerPlugin(ScrollTrigger);
    const context = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>('[data-home-reveal]').forEach((element) => {
        gsap.from(element, {
          opacity: 0,
          scrollTrigger: { start: 'top 84%', trigger: element },
          y: 48,
          duration: 0.9,
          ease: 'power3.out',
        });
      });

      gsap.utils.toArray<HTMLElement>('[data-home-image]').forEach((element) => {
        const image = element.querySelector('img');
        if (!image) return;
        gsap.fromTo(
          image,
          { scale: 1.14, yPercent: -4 },
          {
            scale: 1,
            yPercent: 4,
            ease: 'none',
            scrollTrigger: {
              end: 'bottom top',
              scrub: 1,
              start: 'top bottom',
              trigger: element,
            },
          },
        );
      });

      gsap.utils.toArray<HTMLElement>('[data-system-step]').forEach((element, index) => {
        ScrollTrigger.create({
          end: 'bottom 46%',
          onEnter: () => setActiveStep(index),
          onEnterBack: () => setActiveStep(index),
          start: 'top 54%',
          trigger: element,
        });
      });

      const media = gsap.matchMedia();
      media.add('(min-width: 1024px)', () => {
        const section = root.querySelector<HTMLElement>('[data-horizontal-section]');
        const track = root.querySelector<HTMLElement>('[data-horizontal-track]');
        if (!section || !track) return;

        const distance = () => Math.max(0, track.scrollWidth - window.innerWidth + 96);
        gsap.set(track, { x: 0, xPercent: 0 });
        gsap.to(track, {
          ease: 'none',
          x: () => -distance(),
          scrollTrigger: {
            end: () => `+=${distance() * 1.18}`,
            invalidateOnRefresh: true,
            pin: true,
            scrub: 1,
            start: 'top top',
            trigger: section,
          },
        });
      });
    }, root);

    return () => context.revert();
  }, []);

  return (
    <div className="overflow-x-clip bg-[#050605] text-white" ref={rootRef}>
      <section className="relative px-5 py-24 md:px-8 md:py-36 lg:px-10 xl:px-14">
        <div className="home-hero-grid absolute inset-0 opacity-15" />
        <div className="relative mx-auto grid max-w-[94rem] gap-12 lg:grid-cols-[1.08fr_0.92fr] lg:items-end">
          <div data-home-reveal>
            <Eyebrow>{copy.about.eyebrow}</Eyebrow>
            <h2
              className={`mt-8 max-w-5xl font-black leading-[0.96] ${
                isArabic ? 'text-[clamp(2.2rem,3.6vw,4.35rem)]' : 'text-[clamp(2.8rem,6.2vw,7rem)]'
              } ${displayClass}`}
            >
              {copy.about.title}
            </h2>
          </div>
          <div className="lg:pb-3" data-home-reveal>
            <p className="max-w-xl text-base leading-8 text-white/55 md:text-lg">{copy.about.body}</p>
            <div className="mt-8 flex items-center gap-4 border-t border-white/12 pt-5 text-xs font-bold leading-6 text-white/35">
              <Sparkles className="h-5 w-5 shrink-0 text-[#39ff14]" />
              {copy.about.note}
            </div>
          </div>
        </div>
        <div className="relative mx-auto mt-16 max-w-[94rem] overflow-hidden" data-home-image>
          <div className="relative aspect-[16/8] min-h-[26rem]">
            <Image alt="Pro Gym dumbbell training area" className="object-cover grayscale" fill sizes="100vw" src={images.dumbbellRoom} />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_48%,rgba(0,0,0,0.62))]" />
            <div className="absolute inset-x-5 bottom-5 flex items-end justify-between border-t border-white/20 pt-4 text-[0.58rem] font-black uppercase tracking-[0.2em] text-white/55 md:inset-x-8 md:bottom-8">
              <span>Pro Gym / Homs</span>
              <span>Real facility — 01</span>
            </div>
          </div>
        </div>
      </section>

      <div className="overflow-hidden border-y border-black/15 bg-[#39ff14] py-5 text-black">
        <div className="home-marquee flex w-max items-center">
          {[...copy.marquee, ...copy.marquee].map((item, index) => (
            <div className="flex items-center" key={`${item}-${index}`}>
              <span className={`px-7 text-2xl font-black uppercase md:px-12 md:text-4xl ${isArabic ? 'font-ar-display' : ''}`}>{item}</span>
              <span className="text-2xl">✦</span>
            </div>
          ))}
        </div>
      </div>

      <MotionRibbonSection locale={locale} />

      <section className="relative px-5 py-24 md:px-8 md:py-36 lg:px-10 xl:px-14" id="features">
        <div className="mx-auto max-w-[94rem]">
          <div className="grid gap-10 lg:grid-cols-[0.82fr_1.18fr]">
            <div className="lg:sticky lg:top-24 lg:h-[calc(100vh-7rem)]">
              <div data-home-reveal>
                <Eyebrow>{copy.capabilities.eyebrow}</Eyebrow>
                <h2
                  className={`mt-7 font-black leading-[0.98] ${
                    isArabic ? 'text-[clamp(2.1rem,3.15vw,3.75rem)]' : 'text-[clamp(2.65rem,4.5vw,5.1rem)]'
                  } ${displayClass}`}
                >
                  {copy.capabilities.title}
                </h2>
                <p className="mt-6 max-w-lg text-sm leading-7 text-white/45 md:text-base">{copy.capabilities.body}</p>
              </div>
              <div className="relative mt-10 hidden h-[45vh] min-h-[22rem] overflow-hidden border border-white/12 lg:block">
                {localeSteps.map((step, index) => (
                  <Image
                    alt={step.title}
                    className={`object-cover grayscale transition duration-700 ${
                      activeStep === index ? 'scale-100 opacity-100' : 'scale-110 opacity-0'
                    }`}
                    fill
                    key={step.number}
                    sizes="42vw"
                    src={step.image}
                  />
                ))}
                <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_48%,rgba(0,0,0,0.7))]" />
                <p className="absolute bottom-5 left-5 text-[0.58rem] font-black uppercase tracking-[0.2em] text-[#39ff14]">
                  Live system / {localeSteps[activeStep]?.number}
                </p>
              </div>
            </div>

            <div className="lg:pt-[22vh]">
              {localeSteps.map((step) => (
                <article
                  className="group min-h-[48vh] border-t border-white/14 py-10 lg:flex lg:min-h-[58vh] lg:flex-col lg:justify-center lg:py-16"
                  data-system-step
                  key={step.number}
                >
              <div className="relative mb-8 aspect-[5/3] overflow-hidden lg:aspect-[16/7]" data-home-image>
                    <Image alt={step.title} className="object-cover grayscale" fill sizes="100vw" src={step.image} />
                  </div>
                  <div className="flex items-start justify-between gap-5">
                    <span className="text-xs font-black text-[#39ff14]">{step.number}</span>
                    <span className="text-[0.58rem] font-black uppercase tracking-[0.2em] text-white/30">{step.tag}</span>
                  </div>
                  <h3
                    className={`mt-10 max-w-3xl font-black leading-[0.98] transition group-hover:text-[#39ff14] ${
                      isArabic ? 'text-[clamp(2rem,3vw,3.5rem)]' : 'text-[clamp(2.3rem,4.5vw,5.2rem)]'
                    } ${displayClass}`}
                  >
                    {step.title}
                  </h3>
                  <p className="mt-6 max-w-xl text-sm leading-7 text-white/45 md:text-base">{step.body}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section
        className="relative min-h-screen overflow-hidden bg-[#d8d5cc] text-[#080a08] [direction:ltr]"
        data-horizontal-section
        dir="ltr"
      >
        <div
          className="flex min-h-screen w-max items-center gap-5 px-5 py-20 [direction:ltr] md:gap-8 md:px-10 lg:gap-10 lg:px-14"
          data-horizontal-track
        >
          <div
            className="flex w-[88vw] shrink-0 flex-col justify-center lg:w-[58vw]"
            dir={locale === 'ar' ? 'rtl' : 'ltr'}
          >
            <Eyebrow>{copy.gallery.eyebrow}</Eyebrow>
            <h2
              className={`mt-8 max-w-4xl font-black leading-[0.92] ${
                isArabic ? 'text-[clamp(2.35rem,3.8vw,4.6rem)]' : 'text-[clamp(3rem,6.4vw,7.2rem)]'
              } ${displayClass}`}
            >
              {copy.gallery.title}
            </h2>
            <ArrowDownRight className="mt-10 h-12 w-12 text-[#23b90e]" />
          </div>
          {gallery.map((item) => (
            <figure
              className="w-[78vw] shrink-0 lg:w-[38vw]"
              dir={locale === 'ar' ? 'rtl' : 'ltr'}
              key={item.index}
            >
              <div className="border border-black/16 bg-[#e7e5df] p-2 shadow-[0_24px_55px_rgba(20,20,18,0.12)]">
                <div className="relative aspect-[4/3] overflow-hidden" data-home-image>
                  <Image
                    alt={item.title[locale]}
                    className="object-cover grayscale"
                    fill
                    sizes="80vw"
                    src={item.image}
                  />
                  <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_56%,rgba(0,0,0,0.38))]" />
                  <span className="absolute left-4 top-4 bg-[#39ff14] px-3 py-2 text-[0.52rem] font-black uppercase tracking-[0.15em]">
                    Pro Gym / {item.index}
                  </span>
                </div>
              </div>
              <figcaption className="mt-5 grid grid-cols-[1fr_auto] gap-6 border-t border-black/22 pt-4">
                <div>
                  <p className="text-[0.56rem] font-black uppercase tracking-[0.18em] text-black/48">
                    {item.category[locale]}
                  </p>
                  <h3
                    className={`mt-3 max-w-md text-2xl font-black leading-tight md:text-3xl ${
                      isArabic ? 'font-ar-display tracking-[-0.025em]' : 'tracking-[-0.045em]'
                    }`}
                  >
                    {item.title[locale]}
                  </h3>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-full border border-black/28">
                  <ArrowUpRight className="h-4 w-4" />
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section className="relative px-5 py-24 md:px-8 md:py-36 lg:px-10 xl:px-14">
        <div className="mx-auto max-w-[94rem]">
          <div className="grid gap-10 lg:grid-cols-2 lg:items-end" data-home-reveal>
            <div>
              <Eyebrow>{copy.stats.eyebrow}</Eyebrow>
              <h2
                className={`mt-7 font-black leading-[0.96] ${
                  isArabic ? 'text-[clamp(2.25rem,3.4vw,4.1rem)]' : 'text-[clamp(2.8rem,5vw,5.7rem)]'
                } ${displayClass}`}
              >
                {copy.stats.title}
              </h2>
            </div>
            <p className="max-w-lg text-base leading-8 text-white/45 lg:justify-self-end">{copy.stats.body}</p>
          </div>
          <div className="mt-16 grid border-t border-white/14 md:grid-cols-2 lg:grid-cols-4">
            {[
              ['248', '', isArabic ? 'عضو نشط' : 'Active members'],
              ['18', '', isArabic ? 'مدرباً' : 'Coaches'],
              ['94', '%', isArabic ? 'معدل الحضور' : 'Attendance rate'],
              ['126', '', isArabic ? 'اشتراكاً فعالاً' : 'Active subscriptions'],
            ].map(([target, suffix, label], index) => (
              <div className="border-b border-white/14 py-8 md:px-7 md:odd:border-e lg:border-e lg:last:border-e-0" key={label}>
                <p className="text-[0.58rem] font-black uppercase tracking-[0.18em] text-[#39ff14]">0{index + 1}</p>
                <p className="mt-10 text-[clamp(3.8rem,7vw,7.4rem)] font-black leading-none tracking-[-0.08em] tabular-nums">
                  <AnimatedCounter suffix={suffix} value={Number(target)} />
                </p>
                <p className="mt-4 text-xs font-bold text-white/38">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#39ff14] px-5 py-24 text-black md:px-8 md:py-36 lg:px-10 xl:px-14">
        <div className="mx-auto max-w-[94rem]">
          <div className="grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-end" data-home-reveal>
            <div>
              <p className="flex items-center gap-3 text-[0.62rem] font-black uppercase tracking-[0.24em]">
                <span className="h-1.5 w-1.5 rounded-full bg-black" />
                {copy.roles.eyebrow}
              </p>
              <h2
                className={`mt-7 font-black leading-[0.94] ${
                  isArabic ? 'text-[clamp(2.3rem,3.6vw,4.3rem)]' : 'text-[clamp(2.8rem,5.4vw,6.1rem)]'
                } ${displayClass}`}
              >
                {copy.roles.title}
              </h2>
            </div>
            <p className="max-w-lg text-base font-medium leading-8 text-black/58 lg:justify-self-end">{copy.roles.body}</p>
          </div>
          <div className="mt-16 grid gap-3 lg:grid-cols-3">
            {roles[locale].map(({ body, icon: Icon, label, title }) => (
              <article
                className="group relative overflow-hidden rounded-2xl border border-white/30 bg-[linear-gradient(145deg,rgba(255,255,255,0.28),rgba(255,255,255,0.08))] px-7 py-8 shadow-[0_24px_70px_rgba(7,30,3,0.16),inset_0_1px_0_rgba(255,255,255,0.42)] backdrop-blur-2xl transition duration-500 hover:-translate-y-1 hover:border-white/55 hover:shadow-[0_30px_90px_rgba(7,30,3,0.24),inset_0_1px_0_rgba(255,255,255,0.56)] lg:px-8"
                key={label}
              >
                <div className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full bg-white/24 blur-3xl transition duration-500 group-hover:bg-white/34" />
                <div className="flex items-center justify-between">
                  <p className="text-[0.58rem] font-black uppercase tracking-[0.18em]">{label}</p>
                  <Icon className="h-6 w-6 transition-transform duration-500 group-hover:rotate-12 group-hover:scale-110" />
                </div>
                <h3 className={`mt-16 text-3xl font-black leading-tight md:text-4xl ${isArabic ? 'font-ar-display' : ''}`}>{title}</h3>
                <p className="mt-5 text-sm font-medium leading-7 text-black/55">{body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="relative isolate min-h-[90vh] overflow-hidden px-5 py-24 md:px-8 md:py-36 lg:px-10 xl:px-14">
        <Image alt="Pro Gym strength area" className="absolute inset-0 -z-20 object-cover grayscale" fill sizes="100vw" src={images.dumbbellRoom} />
        <div className="absolute inset-0 -z-10 bg-black/78" />
        <div className="home-hero-grid absolute inset-0 -z-10 opacity-20" />
        <div className="mx-auto flex min-h-[65vh] max-w-[94rem] flex-col justify-between">
          <div data-home-reveal>
            <Eyebrow>Pro Gym / Next move</Eyebrow>
            <h2
              className={`mt-8 max-w-6xl font-black leading-[0.9] ${
                isArabic ? 'text-[clamp(2.65rem,4.4vw,5.2rem)]' : 'text-[clamp(3.2rem,7.5vw,8.5rem)]'
              } ${displayClass}`}
            >
              {copy.final.title}
            </h2>
          </div>
          <div className="mt-16 grid gap-8 border-t border-white/20 pt-6 lg:grid-cols-[1fr_auto]" data-home-reveal>
            <p className="max-w-xl text-base leading-8 text-white/55">{copy.final.body}</p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Link className="group flex min-h-14 items-center justify-between gap-10 bg-[#39ff14] px-6 text-xs font-black text-black transition hover:bg-white" href={`/${locale}/register`}>
                {copy.final.primary}
                <ArrowUpRight className="h-4 w-4" />
              </Link>
              <Link className="flex min-h-14 items-center justify-between gap-10 border border-white/25 bg-black/30 px-6 text-xs font-black backdrop-blur-md transition hover:border-white" href={`/${locale}/login`}>
                {copy.final.secondary}
                <ScanLine className="h-4 w-4 text-[#39ff14]" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
