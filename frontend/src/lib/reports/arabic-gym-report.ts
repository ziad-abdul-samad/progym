'use client';

export type ReportMetric =
  | 'members'
  | 'subscriptions'
  | 'revenue'
  | 'attendance'
  | 'coaches'
  | 'registrations';

export type GymReport = {
  attendance: {
    byDay: Array<{ date: string; value: number }>;
    uniqueMembers: number;
    visits: number;
  };
  coaches: { activeAssignments: number; total: number };
  generatedAt: string;
  members: { new: number; total: number };
  metrics: ReportMetric[];
  range: { from: string; to: string };
  registrations: { approved: number; pending: number; rejected: number; total: number };
  revenue: {
    byDay: Array<{ date: string; value: number }>;
    currency: string;
    monthlySubscriptionPriceMinor: number;
    paidPayments: number;
    totalMinor: number;
  };
  subscriptions: { active: number; renewed: number; started: number };
};

const WIDTH = 1240;
const HEIGHT = 1754;
const encoder = new TextEncoder();

function escapeHtml(value: string | number) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function money(valueMinor: number) {
  return `$${(valueMinor / 100).toLocaleString('en-US', { maximumFractionDigits: 2, minimumFractionDigits: 0 })}`;
}

type ReportCard = { label: string; note: string; value: string | number };
type ReportSection = { cards: ReportCard[]; title: string };

function reportSections(report: GymReport) {
  const chosen = new Set(report.metrics);
  const first: ReportSection[] = [];
  const second: ReportSection[] = [];

  if (chosen.has('revenue')) {
    first.push({
      cards: [
        {
          label: 'إجمالي الإيراد',
          note: `${report.revenue.paidPayments} دفعة مسجلة`,
          value: money(report.revenue.totalMinor),
        },
        {
          label: 'سعر الشهر',
          note: 'السعر المعتمد حالياً',
          value: money(report.revenue.monthlySubscriptionPriceMinor),
        },
        {
          label: 'متوسط الدفعة',
          note: 'ضمن الفترة المحددة',
          value: money(
            report.revenue.paidPayments
              ? Math.round(report.revenue.totalMinor / report.revenue.paidPayments)
              : 0,
          ),
        },
      ],
      title: 'الإيرادات والاشتراكات المالية',
    });
  }
  if (chosen.has('members')) {
    first.push({
      cards: [
        { label: 'إجمالي الأعضاء', note: 'كل الأعضاء المسجلين', value: report.members.total },
        { label: 'أعضاء جدد', note: 'انضموا خلال هذه الفترة', value: report.members.new },
        {
          label: 'نسبة النمو',
          note: 'من إجمالي الأعضاء',
          value: report.members.total
            ? `${Math.round((report.members.new / report.members.total) * 100)}%`
            : '0%',
        },
      ],
      title: 'الأعضاء',
    });
  }
  if (chosen.has('subscriptions')) {
    first.push({
      cards: [
        {
          label: 'اشتراكات فعالة',
          note: 'فعالة وقت إنشاء التقرير',
          value: report.subscriptions.active,
        },
        {
          label: 'اشتراكات بدأت',
          note: 'بدأت ضمن الفترة',
          value: report.subscriptions.started,
        },
        {
          label: 'عمليات تجديد',
          note: 'تمت ضمن الفترة',
          value: report.subscriptions.renewed,
        },
      ],
      title: 'الاشتراكات',
    });
  }
  if (chosen.has('attendance')) {
    second.push({
      cards: [
        {
          label: 'إجمالي الزيارات',
          note: 'كل عمليات الحضور الصحيحة',
          value: report.attendance.visits,
        },
        {
          label: 'أعضاء مختلفون',
          note: 'عدد اللاعبين الزائرين',
          value: report.attendance.uniqueMembers,
        },
        {
          label: 'متوسط يومي',
          note: 'زيارة في اليوم',
          value: (report.attendance.visits / Math.max(report.attendance.byDay.length, 1)).toFixed(
            1,
          ),
        },
      ],
      title: 'الحضور',
    });
  }
  if (chosen.has('coaches')) {
    second.push({
      cards: [
        { label: 'إجمالي المدربين', note: 'الحسابات المسجلة', value: report.coaches.total },
        {
          label: 'إسنادات فعالة',
          note: 'لاعبون مرتبطون بمدربين',
          value: report.coaches.activeAssignments,
        },
        {
          label: 'متوسط اللاعبين',
          note: 'لكل مدرب',
          value: report.coaches.total
            ? (report.coaches.activeAssignments / report.coaches.total).toFixed(1)
            : '0',
        },
      ],
      title: 'المدربون',
    });
  }
  if (chosen.has('registrations')) {
    second.push({
      cards: [
        { label: 'إجمالي الطلبات', note: 'ضمن الفترة', value: report.registrations.total },
        {
          label: 'طلبات مقبولة',
          note: `${report.registrations.pending} بانتظار المراجعة`,
          value: report.registrations.approved,
        },
        {
          label: 'طلبات مرفوضة',
          note: 'بعد مراجعة البيانات',
          value: report.registrations.rejected,
        },
      ],
      title: 'طلبات التسجيل',
    });
  }
  return { first, second };
}

function sectionSvg(section: ReportSection, y: number) {
  const cardWidth = 341;
  const cardGap = 20;
  const cards = section.cards
    .map((card, index) => {
      const x = 823 - index * (cardWidth + cardGap);
      return `
        <rect x="${x}" y="${y + 54}" width="${cardWidth}" height="165" fill="#ffffff" stroke="#dfe3dc" stroke-width="2" />
        <text x="${x + cardWidth - 22}" y="${y + 91}" text-anchor="end" direction="rtl" font-size="19" font-weight="700" fill="#5d655d">${escapeHtml(card.label)}</text>
        <text x="${x + cardWidth - 22}" y="${y + 145}" text-anchor="end" direction="ltr" font-size="40" font-weight="900" fill="#101510">${escapeHtml(card.value)}</text>
        <text x="${x + cardWidth - 22}" y="${y + 194}" text-anchor="end" direction="rtl" font-size="16" fill="#7d847d">${escapeHtml(card.note)}</text>`;
    })
    .join('');
  return `
    <rect x="1080" y="${y}" width="8" height="35" fill="#39ff14" />
    <text x="1062" y="${y + 27}" text-anchor="end" direction="rtl" font-size="29" font-weight="900" fill="#0b0d0b">${escapeHtml(section.title)}</text>
    ${cards}`;
}

function pageSvg(report: GymReport, page: number, sections: ReportSection[]) {
  const created = new Intl.DateTimeFormat('ar-SY', {
    dateStyle: 'long',
    timeStyle: 'short',
  }).format(new Date(report.generatedAt));
  const sectionMarkup = sections.length
    ? sections.map((section, index) => sectionSvg(section, 345 + index * 260)).join('')
    : '<text x="620" y="650" text-anchor="middle" direction="rtl" font-size="30" font-weight="700" fill="#727972">لا توجد إحصاءات مختارة لهذه الصفحة</text>';
  const note =
    page === 1
      ? `<rect x="76" y="1175" width="1088" height="110" fill="#e9ece6" /><rect x="1155" y="1175" width="9" height="110" fill="#111111" /><text x="1128" y="1220" text-anchor="end" direction="rtl" font-size="20" font-weight="700" fill="#252a25">يعتمد حساب الإيرادات على سعر شهري قدره ${escapeHtml(money(report.revenue.monthlySubscriptionPriceMinor))}</text><text x="1128" y="1257" text-anchor="end" direction="rtl" font-size="20" fill="#4f574f">قيمة اشتراك شهرين: ${escapeHtml(money(report.revenue.monthlySubscriptionPriceMinor * 2))}</text>`
      : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
    <rect width="${WIDTH}" height="${HEIGHT}" fill="#f5f6f2" />
    <circle cx="35" cy="250" r="150" fill="none" stroke="#39ff14" stroke-opacity="0.13" stroke-width="35" />
    <rect x="76" y="74" width="1088" height="235" fill="#080a08" />
    <rect x="76" y="297" width="1088" height="12" fill="#39ff14" />
    <text x="1115" y="128" text-anchor="end" direction="rtl" font-family="Arial, Segoe UI, sans-serif" font-size="20" font-weight="800" fill="#39ff14">PRO GYM / تقرير الإدارة</text>
    <text x="1115" y="200" text-anchor="end" direction="rtl" font-family="Arial, Segoe UI, sans-serif" font-size="54" font-weight="900" fill="#ffffff">تقرير أداء النادي</text>
    <text x="1115" y="250" text-anchor="end" direction="rtl" font-family="Arial, Segoe UI, sans-serif" font-size="22" fill="#bec4be">من ${escapeHtml(report.range.from)} إلى ${escapeHtml(report.range.to)}</text>
    <g font-family="Arial, Segoe UI, sans-serif">${sectionMarkup}${note}</g>
    <line x1="76" y1="1644" x2="1164" y2="1644" stroke="#cdd2ca" stroke-width="2" />
    <text x="1164" y="1682" text-anchor="end" direction="rtl" font-family="Arial, Segoe UI, sans-serif" font-size="16" fill="#727972">تم الإنشاء: ${escapeHtml(created)}</text>
    <text x="76" y="1682" text-anchor="start" direction="ltr" font-family="Arial, Segoe UI, sans-serif" font-size="16" fill="#727972">PRO GYM — ${page}</text>
  </svg>`;
}

function reportPages(report: GymReport) {
  const sections = reportSections(report);
  return [pageSvg(report, 1, sections.first), pageSvg(report, 2, sections.second)];
}

async function loadLogo(url: string) {
  const response = await fetch(url);
  if (!response.ok) throw new Error('تعذر تحميل شعار النادي');
  const blob = await response.blob();
  return createImageBitmap(blob);
}

async function renderPage(svg: string, logo: ImageBitmap) {
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }));
  try {
    const image = new Image();
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error('تعذر رسم صفحة التقرير'));
      image.src = url;
    });
    const canvas = document.createElement('canvas');
    canvas.width = WIDTH;
    canvas.height = HEIGHT;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('المتصفح لا يدعم تجهيز ملف التقرير');
    context.drawImage(image, 0, 0);
    const logoSize = 128;
    const scale = Math.min(logoSize / logo.width, logoSize / logo.height);
    const logoWidth = logo.width * scale;
    const logoHeight = logo.height * scale;
    context.drawImage(
      logo,
      104 + (logoSize - logoWidth) / 2,
      119 + (logoSize - logoHeight) / 2,
      logoWidth,
      logoHeight,
    );
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (value) => (value ? resolve(value) : reject(new Error('تعذر تجهيز صفحة التقرير'))),
        'image/jpeg',
        0.9,
      ),
    );
    return new Uint8Array(await blob.arrayBuffer());
  } finally {
    URL.revokeObjectURL(url);
  }
}

function concat(parts: Uint8Array[]) {
  const result = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
  let offset = 0;
  for (const part of parts) {
    result.set(part, offset);
    offset += part.length;
  }
  return result;
}

function createPdf(images: Uint8Array[]) {
  const objectCount = 2 + images.length * 3;
  const objects = new Map<number, Uint8Array>();
  const pageIds = images.map((_, index) => 3 + index * 3);
  objects.set(1, encoder.encode('<< /Type /Catalog /Pages 2 0 R >>'));
  objects.set(
    2,
    encoder.encode(
      `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${images.length} >>`,
    ),
  );
  images.forEach((jpeg, index) => {
    const pageId = 3 + index * 3;
    const imageId = pageId + 1;
    const contentId = pageId + 2;
    const content = encoder.encode(`q\n595 0 0 842 0 0 cm\n/Im${index} Do\nQ`);
    objects.set(
      pageId,
      encoder.encode(
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /XObject << /Im${index} ${imageId} 0 R >> >> /Contents ${contentId} 0 R >>`,
      ),
    );
    objects.set(
      imageId,
      concat([
        encoder.encode(
          `<< /Type /XObject /Subtype /Image /Width ${WIDTH} /Height ${HEIGHT} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`,
        ),
        jpeg,
        encoder.encode('\nendstream'),
      ]),
    );
    objects.set(
      contentId,
      concat([
        encoder.encode(`<< /Length ${content.length} >>\nstream\n`),
        content,
        encoder.encode('\nendstream'),
      ]),
    );
  });

  const parts: Uint8Array[] = [encoder.encode('%PDF-1.4\n%âãÏÓ\n')];
  const offsets = [0];
  let length = parts[0]!.length;
  for (let id = 1; id <= objectCount; id += 1) {
    offsets[id] = length;
    const part = concat([
      encoder.encode(`${id} 0 obj\n`),
      objects.get(id)!,
      encoder.encode('\nendobj\n'),
    ]);
    parts.push(part);
    length += part.length;
  }
  const xrefOffset = length;
  const xref = `xref\n0 ${objectCount + 1}\n0000000000 65535 f \n${offsets
    .slice(1)
    .map((offset) => `${String(offset).padStart(10, '0')} 00000 n `)
    .join(
      '\n',
    )}\ntrailer\n<< /Size ${objectCount + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  parts.push(encoder.encode(xref));
  return new Blob(
    parts.map((part) => part.slice().buffer),
    { type: 'application/pdf' },
  );
}

export async function downloadArabicGymReport(report: GymReport) {
  await document.fonts.ready;
  const logo = await loadLogo('/images/gym/log_bw.jpeg');
  const pages = reportPages(report);
  let images: Uint8Array[];
  try {
    images = await Promise.all(pages.map((page) => renderPage(page, logo)));
  } finally {
    logo.close();
  }
  const url = URL.createObjectURL(createPdf(images));
  const link = document.createElement('a');
  link.href = url;
  link.download = `progym-report-${report.range.from}-${report.range.to}.pdf`;
  link.style.display = 'none';
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
