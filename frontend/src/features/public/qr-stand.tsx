'use client';

import Image from 'next/image';
import { QRCodeSVG } from 'qrcode.react';
import { useEffect, useState } from 'react';
import type { PublicLocale } from '@progym/shared';

import { siteUrl } from '@/lib/public/content';

export function QrStand({ locale }: { locale: PublicLocale }) {
  const [origin, setOrigin] = useState(siteUrl);
  useEffect(() => setOrigin(window.location.origin), []);
  const url = `${origin}/${locale}/entry`;
  const ar = locale === 'ar';

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#050605] p-5 text-white">
      <div className="home-hero-grid absolute inset-0 opacity-20" />
      <div className="relative w-full max-w-3xl border border-white/10 bg-[#080a08] p-7 text-center shadow-[0_0_90px_rgba(57,255,20,0.08)] md:p-14">
        <Image alt="Pro Gym" className="mx-auto h-auto w-28 object-contain" height={160} priority src="/images/gym/log_bw.jpeg" width={130} />
        <p className="mt-7 text-[0.65rem] font-black uppercase tracking-[0.28em] text-[#39ff14]">Pro Gym / Smart Entry</p>
        <h1 className={`mt-5 font-black ${ar ? 'font-ar-display text-4xl leading-[1.45] md:text-6xl' : 'text-5xl uppercase leading-[0.94] tracking-[-0.05em] md:text-7xl'}`}>
          {ar ? 'امسح الرمز للدخول' : 'Scan to enter'}
        </h1>
        <div className="mx-auto mt-9 w-fit border-[10px] border-white bg-white p-4 shadow-[0_0_45px_rgba(57,255,20,0.2)]">
          <QRCodeSVG bgColor="#ffffff" fgColor="#050605" level="H" marginSize={1} size={280} value={url} />
        </div>
        <p className="mx-auto mt-8 max-w-xl text-sm leading-7 text-white/45">
          {ar ? 'للاعب الحالي: تسجيل الحضور وعرض الاشتراك. للاعب الجديد: إنشاء الحساب وإرساله إلى المراقب للاعتماد.' : 'Existing members can record entry and check membership. New members can submit an account for staff approval.'}
        </p>
      </div>
    </main>
  );
}
