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

function card(label: string, value: string | number, note: string) {
  return `<div class="card"><p>${escapeHtml(label)}</p><strong>${escapeHtml(value)}</strong><span>${escapeHtml(note)}</span></div>`;
}

function section(title: string, cards: string) {
  return `<section><h2>${escapeHtml(title)}</h2><div class="cards">${cards}</div></section>`;
}

function pageShell(body: string, report: GymReport, page: number, logo: string) {
  const created = new Intl.DateTimeFormat('ar-SY', {
    dateStyle: 'long',
    timeStyle: 'short',
  }).format(new Date(report.generatedAt));
  return `
    <div xmlns="http://www.w3.org/1999/xhtml" class="page" dir="rtl">
      <style>
        *{box-sizing:border-box} .page{width:${WIDTH}px;height:${HEIGHT}px;background:#f5f6f2;color:#0b0d0b;font-family:Arial,"Segoe UI",sans-serif;padding:74px 76px 58px;position:relative;overflow:hidden}
        header{height:245px;background:#080a08;color:white;padding:42px 48px;display:flex;align-items:center;justify-content:space-between;border-bottom:12px solid #39ff14}
        header img{width:118px;height:118px;object-fit:cover;background:#000} header .title{text-align:right} header .eyebrow{color:#39ff14;font-size:20px;font-weight:800;letter-spacing:1px;margin:0 0 12px} h1{font-size:54px;line-height:1.35;margin:0;font-weight:900} header .range{margin-top:12px;color:#bec4be;font-size:22px}
        main{padding-top:42px} section{margin-bottom:34px} h2{font-size:29px;margin:0 0 17px;border-right:8px solid #39ff14;padding-right:16px;line-height:1.45}.cards{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}.card{background:#fff;border:2px solid #dfe3dc;padding:24px 22px;min-height:155px}.card p{font-size:19px;color:#5d655d;margin:0 0 14px;font-weight:700}.card strong{display:block;font-size:43px;line-height:1;color:#101510;direction:ltr;text-align:right}.card span{display:block;font-size:16px;color:#7d847d;margin-top:16px;line-height:1.5}
        .note{padding:24px 28px;background:#e9ece6;border-right:9px solid #111;font-size:20px;line-height:1.8}.price{color:#188c08;font-weight:900}.table{width:100%;border-collapse:collapse;background:white}.table th,.table td{padding:16px 18px;border-bottom:2px solid #e8ebe5;text-align:right;font-size:18px}.table th{background:#111;color:#39ff14}.barrow{display:grid;grid-template-columns:130px 1fr 90px;align-items:center;gap:18px;margin:13px 0;font-size:17px}.track{height:19px;background:#dfe3dc;position:relative}.fill{position:absolute;inset-block:0;right:0;background:#39ff14;border-left:4px solid #111}
        footer{position:absolute;bottom:44px;left:76px;right:76px;border-top:2px solid #cdd2ca;padding-top:16px;display:flex;justify-content:space-between;color:#727972;font-size:16px;direction:rtl}.page-no{direction:ltr}.decor{position:absolute;width:250px;height:250px;border:35px solid rgba(57,255,20,.12);border-radius:50%;left:-90px;top:145px}
      </style>
      <div class="decor"></div>
      <header>
        <div class="title"><p class="eyebrow">PRO GYM / تقرير الإدارة</p><h1>تقرير أداء النادي</h1><p class="range">من ${escapeHtml(report.range.from)} إلى ${escapeHtml(report.range.to)}</p></div>
        <img src="${logo}" alt="Pro Gym" />
      </header>
      <main>${body}</main>
      <footer><span>تم الإنشاء: ${escapeHtml(created)}</span><span class="page-no">PRO GYM — ${page}</span></footer>
    </div>`;
}

function reportPages(report: GymReport, logo: string) {
  const chosen = new Set(report.metrics);
  const first: string[] = [];
  if (chosen.has('revenue'))
    first.push(
      section(
        'الإيرادات والاشتراكات المالية',
        [
          card(
            'إجمالي الإيراد',
            money(report.revenue.totalMinor),
            `${report.revenue.paidPayments} دفعة مسجلة`,
          ),
          card(
            'سعر الشهر',
            money(report.revenue.monthlySubscriptionPriceMinor),
            'السعر المعتمد حالياً',
          ),
          card(
            'متوسط الدفعة',
            money(
              report.revenue.paidPayments
                ? Math.round(report.revenue.totalMinor / report.revenue.paidPayments)
                : 0,
            ),
            'ضمن الفترة المحددة',
          ),
        ].join(''),
      ),
    );
  if (chosen.has('members'))
    first.push(
      section(
        'الأعضاء',
        [
          card('إجمالي الأعضاء', report.members.total, 'كل الأعضاء المسجلين'),
          card('أعضاء جدد', report.members.new, 'انضموا خلال هذه الفترة'),
          card(
            'نسبة النمو',
            report.members.total
              ? `${Math.round((report.members.new / report.members.total) * 100)}%`
              : '0%',
            'من إجمالي الأعضاء',
          ),
        ].join(''),
      ),
    );
  if (chosen.has('subscriptions'))
    first.push(
      section(
        'الاشتراكات',
        [
          card('اشتراكات فعالة', report.subscriptions.active, 'فعالة وقت إنشاء التقرير'),
          card('اشتراكات بدأت', report.subscriptions.started, 'بدأت ضمن الفترة'),
          card('عمليات تجديد', report.subscriptions.renewed, 'تمت ضمن الفترة'),
        ].join(''),
      ),
    );
  first.push(
    `<div class="note">تُحسب الإيرادات تلقائياً على أساس سعر شهري قدره <span class="price">${money(report.revenue.monthlySubscriptionPriceMinor)}</span>. لذلك يُسجّل اشتراك الشهرين بقيمة <span class="price">${money(report.revenue.monthlySubscriptionPriceMinor * 2)}</span> تلقائياً.</div>`,
  );

  const second: string[] = [];
  if (chosen.has('attendance'))
    second.push(
      section(
        'الحضور',
        [
          card('إجمالي الزيارات', report.attendance.visits, 'كل عمليات الحضور الصحيحة'),
          card('أعضاء مختلفون', report.attendance.uniqueMembers, 'عدد اللاعبين الزائرين'),
          card(
            'متوسط يومي',
            (report.attendance.visits / Math.max(report.attendance.byDay.length, 1)).toFixed(1),
            'زيارة في اليوم',
          ),
        ].join(''),
      ),
    );
  if (chosen.has('coaches'))
    second.push(
      section(
        'المدربون',
        [
          card('إجمالي المدربين', report.coaches.total, 'الحسابات المسجلة'),
          card('إسنادات فعالة', report.coaches.activeAssignments, 'لاعبون مرتبطون بمدربين'),
          card(
            'متوسط اللاعبين',
            report.coaches.total
              ? (report.coaches.activeAssignments / report.coaches.total).toFixed(1)
              : '0',
            'لكل مدرب',
          ),
        ].join(''),
      ),
    );
  if (chosen.has('registrations'))
    second.push(
      section(
        'طلبات التسجيل',
        [
          card('إجمالي الطلبات', report.registrations.total, 'ضمن الفترة'),
          card(
            'طلبات مقبولة',
            report.registrations.approved,
            `${report.registrations.pending} بانتظار المراجعة`,
          ),
          card('طلبات مرفوضة', report.registrations.rejected, 'بعد مراجعة البيانات'),
        ].join(''),
      ),
    );

  const values = report.attendance.byDay;
  if (chosen.has('attendance') && values.length) {
    const max = Math.max(1, ...values.map((item) => item.value));
    const sample =
      values.length > 12
        ? values.filter((_, index) => index % Math.ceil(values.length / 12) === 0).slice(-12)
        : values;
    second.push(
      `<section><h2>حركة الحضور اليومية</h2>${sample.map((item) => `<div class="barrow"><span>${escapeHtml(item.date)}</span><div class="track"><div class="fill" style="width:${Math.round((item.value / max) * 100)}%"></div></div><strong>${item.value}</strong></div>`).join('')}</section>`,
    );
  }
  if (!second.length)
    second.push('<div class="note">لم يتم اختيار إحصاءات إضافية لهذه الصفحة.</div>');
  return [pageShell(first.join(''), report, 1, logo), pageShell(second.join(''), report, 2, logo)];
}

async function fileAsDataUrl(url: string) {
  const response = await fetch(url);
  if (!response.ok) throw new Error('تعذر تحميل شعار النادي');
  const blob = await response.blob();
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error('تعذر قراءة شعار النادي'));
    reader.onload = () => {
      if (typeof reader.result === 'string') resolve(reader.result);
      else reject(new Error('تنسيق شعار النادي غير مدعوم'));
    };
    reader.readAsDataURL(blob);
  });
}

async function renderPage(html: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}"><foreignObject width="100%" height="100%">${html}</foreignObject></svg>`;
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }));
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = WIDTH;
    canvas.height = HEIGHT;
    canvas.getContext('2d')?.drawImage(image, 0, 0);
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
  const logo = await fileAsDataUrl('/images/gym/log_bw.jpeg');
  const pages = reportPages(report, logo);
  const images = await Promise.all(pages.map(renderPage));
  const url = URL.createObjectURL(createPdf(images));
  const link = document.createElement('a');
  link.href = url;
  link.download = `progym-report-${report.range.from}-${report.range.to}.pdf`;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
