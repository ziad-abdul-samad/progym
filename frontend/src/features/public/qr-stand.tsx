'use client';

import Image from 'next/image';
import { QRCodeSVG } from 'qrcode.react';
import { useEffect, useState } from 'react';
import type { PublicLocale } from '@progym/shared';

import { siteUrl } from '@/lib/public/content';

const branchNames: Record<string, { ar: string; en: string }> = {
  b1: { ar: 'الإنشاءات مقابل الفرن الآلي', en: 'Al-Inshaat, opposite Al-Furn Al-Ali' },
  b2: { ar: 'جورة الشياح مقابل المشفى الوطني', en: 'Jouret Al-Shayah, opposite National Hospital' },
  b3: { ar: 'بروجيم 8 آذار', en: 'Pro Gym 8 March' },
};

export function QrStand({
  branchCode = 'b1',
  locale,
}: {
  branchCode?: string;
  locale: PublicLocale;
}) {
  const [origin, setOrigin] = useState(siteUrl);
  useEffect(() => setOrigin(window.location.origin), []);
  const url = `${origin}/${locale}/entry/${branchCode}`;
  const ar = locale === 'ar';
  const branchName = branchNames[branchCode]?.[locale] ?? branchNames.b1![locale];

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#050605] p-5 text-white">
      <div className="home-hero-grid absolute inset-0 opacity-20" />
      <div className="relative w-full max-w-3xl border border-white/10 bg-[#080a08] p-5 text-center shadow-[0_0_90px_rgba(57,255,20,0.08)] sm:p-8 lg:p-10">
        <Image
          alt="Pro Gym"
          className="mx-auto h-auto w-20 object-contain sm:w-24"
          height={160}
          priority
          src="/images/gym/log_bw.jpeg"
          width={130}
        />
        <p className="mt-5 text-[0.6rem] font-black uppercase tracking-[0.26em] text-[#39ff14]">
          Pro Gym / Smart Entry
        </p>
        <p className="mx-auto mt-2 w-fit border border-white/15 bg-white/[0.04] px-3 py-1.5 text-xs font-black text-white/80 sm:text-sm">
          {branchName}
        </p>
        <h1
          className={`mt-4 font-black ${ar ? 'font-ar-display text-3xl leading-[1.4] sm:text-5xl' : 'text-4xl uppercase leading-[0.94] tracking-[-0.05em] sm:text-6xl'}`}
        >
          {ar ? 'امسح الرمز للدخول' : 'Scan to enter'}
        </h1>
        <div className="mx-auto mt-6 w-fit border-[7px] border-white bg-white p-2.5 shadow-[0_0_45px_rgba(57,255,20,0.2)] sm:border-[9px] sm:p-3">
          <QRCodeSVG
            bgColor="#ffffff"
            className="h-auto w-[min(64vw,280px)]"
            fgColor="#050605"
            level="H"
            marginSize={1}
            size={280}
            value={url}
          />
        </div>
        <p className="mx-auto mt-5 max-w-xl text-xs leading-6 text-white/45 sm:text-sm sm:leading-7">
          {ar
            ? 'للاعب الحالي: تسجيل الحضور وعرض الاشتراك. للاعب الجديد: إنشاء الحساب وإرساله إلى المراقب للاعتماد.'
            : 'Existing members can record entry and check membership. New members can submit an account for staff approval.'}
        </p>
      </div>
    </main>
  );
}
