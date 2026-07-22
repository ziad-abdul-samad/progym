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
const PAGE_MARGIN = 64;
const CONTENT_WIDTH = WIDTH - PAGE_MARGIN * 2;
const FONT_FAMILY = 'Tahoma, Arial, "Segoe UI", sans-serif';
const encoder = new TextEncoder();

const palette = {
  accent: '#39ff14',
  accentDark: '#188c08',
  background: '#f4f5f1',
  border: '#d9ddd5',
  card: '#ffffff',
  ink: '#101510',
  muted: '#667066',
  mutedBackground: '#e8ebe4',
  surfaceDark: '#080a08',
  white: '#ffffff',
};

function money(valueMinor: number) {
  return `$${(valueMinor / 100).toLocaleString('en-US', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  })}`;
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
          label: 'سعر الاشتراك الشهري',
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

function roundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const safeRadius = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + safeRadius, y);
  context.lineTo(x + width - safeRadius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + safeRadius);
  context.lineTo(x + width, y + height - safeRadius);
  context.quadraticCurveTo(x + width, y + height, x + width - safeRadius, y + height);
  context.lineTo(x + safeRadius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - safeRadius);
  context.lineTo(x, y + safeRadius);
  context.quadraticCurveTo(x, y, x + safeRadius, y);
  context.closePath();
}

type TextOptions = {
  align?: CanvasTextAlign;
  color?: string;
  direction?: 'ltr' | 'rtl';
  fontSize: number;
  fontWeight?: number;
  maxWidth?: number;
};

function drawText(
  context: CanvasRenderingContext2D,
  value: string | number,
  x: number,
  y: number,
  {
    align = 'right',
    color = palette.ink,
    direction = 'rtl',
    fontSize,
    fontWeight = 500,
    maxWidth,
  }: TextOptions,
) {
  context.save();
  context.direction = direction;
  context.textAlign = align;
  context.textBaseline = 'alphabetic';
  context.fillStyle = color;
  context.font = `${fontWeight} ${fontSize}px ${FONT_FAMILY}`;
  context.fillText(String(value), x, y, maxWidth);
  context.restore();
}

function wrappedLines(
  context: CanvasRenderingContext2D,
  value: string,
  maxWidth: number,
  maxLines: number,
) {
  const words = value.trim().split(/\s+/);
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (current && context.measureText(candidate).width > maxWidth) {
      lines.push(current);
      current = word;
      if (lines.length === maxLines - 1) break;
    } else {
      current = candidate;
    }
  }

  if (current && lines.length < maxLines) lines.push(current);
  return lines;
}

function drawWrappedText(
  context: CanvasRenderingContext2D,
  value: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  options: TextOptions,
  maxLines = 2,
) {
  context.save();
  context.font = `${options.fontWeight ?? 500} ${options.fontSize}px ${FONT_FAMILY}`;
  const lines = wrappedLines(context, value, maxWidth, maxLines);
  context.restore();
  lines.forEach((line, index) => drawText(context, line, x, y + index * lineHeight, options));
}

function drawLogo(context: CanvasRenderingContext2D, logo: ImageBitmap) {
  const frameX = 92;
  const frameY = 104;
  const frameSize = 150;
  roundedRect(context, frameX, frameY, frameSize, frameSize, 16);
  context.fillStyle = '#000000';
  context.fill();

  const innerSize = 126;
  const scale = Math.min(innerSize / logo.width, innerSize / logo.height);
  const logoWidth = logo.width * scale;
  const logoHeight = logo.height * scale;
  context.drawImage(
    logo,
    frameX + (frameSize - logoWidth) / 2,
    frameY + (frameSize - logoHeight) / 2,
    logoWidth,
    logoHeight,
  );
}

function drawHeader(context: CanvasRenderingContext2D, report: GymReport, logo: ImageBitmap) {
  roundedRect(context, PAGE_MARGIN, 64, CONTENT_WIDTH, 270, 22);
  context.fillStyle = palette.surfaceDark;
  context.fill();

  context.fillStyle = palette.accent;
  context.fillRect(PAGE_MARGIN, 318, CONTENT_WIDTH, 16);
  drawLogo(context, logo);

  drawText(context, 'تقرير الإدارة', WIDTH - 104, 126, {
    color: palette.accent,
    fontSize: 23,
    fontWeight: 800,
  });
  drawText(context, 'تقرير أداء النادي', WIDTH - 104, 212, {
    color: palette.white,
    fontSize: 55,
    fontWeight: 900,
    maxWidth: 760,
  });
  drawText(context, `الفترة من ${report.range.from} إلى ${report.range.to}`, WIDTH - 104, 277, {
    color: '#c6ccc5',
    fontSize: 24,
    fontWeight: 600,
    maxWidth: 760,
  });

  drawText(context, 'PRO GYM', 260, 292, {
    align: 'left',
    color: palette.white,
    direction: 'ltr',
    fontSize: 19,
    fontWeight: 900,
  });
}

function drawCard(
  context: CanvasRenderingContext2D,
  card: ReportCard,
  x: number,
  y: number,
  width: number,
) {
  roundedRect(context, x, y, width, 196, 16);
  context.fillStyle = palette.card;
  context.fill();
  context.strokeStyle = palette.border;
  context.lineWidth = 2;
  context.stroke();

  context.fillStyle = palette.accent;
  context.fillRect(x + width - 8, y + 22, 8, 46);
  const textRight = x + width - 25;
  const textWidth = width - 50;

  drawWrappedText(context, card.label, textRight, y + 46, textWidth, 27, {
    color: palette.muted,
    fontSize: 20,
    fontWeight: 800,
  });
  drawText(context, card.value, textRight, y + 124, {
    color: palette.ink,
    direction: 'ltr',
    fontSize: 44,
    fontWeight: 900,
    maxWidth: textWidth,
  });
  drawWrappedText(context, card.note, textRight, y + 166, textWidth, 22, {
    color: '#7b837a',
    fontSize: 16,
    fontWeight: 600,
  });
}

function drawSection(
  context: CanvasRenderingContext2D,
  section: ReportSection,
  y: number,
  sectionNumber: number,
) {
  drawText(context, String(sectionNumber).padStart(2, '0'), PAGE_MARGIN, y + 27, {
    align: 'left',
    color: '#9da49b',
    direction: 'ltr',
    fontSize: 18,
    fontWeight: 800,
  });
  context.fillStyle = palette.accent;
  context.fillRect(WIDTH - PAGE_MARGIN - 9, y, 9, 39);
  drawText(context, section.title, WIDTH - PAGE_MARGIN - 27, y + 30, {
    fontSize: 29,
    fontWeight: 900,
    maxWidth: 900,
  });

  const gap = 18;
  const cardWidth = (CONTENT_WIDTH - gap * 2) / 3;
  section.cards.forEach((card, index) => {
    const x = PAGE_MARGIN + (2 - index) * (cardWidth + gap);
    drawCard(context, card, x, y + 58, cardWidth);
  });
}

function drawInsight(context: CanvasRenderingContext2D, report: GymReport, page: number) {
  const y = 1355;
  roundedRect(context, PAGE_MARGIN, y, CONTENT_WIDTH, 150, 18);
  context.fillStyle = palette.mutedBackground;
  context.fill();
  context.fillStyle = page === 1 ? palette.ink : palette.accentDark;
  context.fillRect(WIDTH - PAGE_MARGIN - 10, y, 10, 150);

  if (page === 1) {
    drawText(context, 'ملاحظة الإيرادات', WIDTH - PAGE_MARGIN - 35, y + 43, {
      fontSize: 21,
      fontWeight: 900,
    });
    drawText(
      context,
      `سعر الاشتراك الشهري المعتمد هو ${money(report.revenue.monthlySubscriptionPriceMinor)}`,
      WIDTH - PAGE_MARGIN - 35,
      y + 87,
      { color: palette.muted, fontSize: 20, fontWeight: 700, maxWidth: 950 },
    );
    drawText(
      context,
      `اشتراك شهرين يُحتسب تلقائياً بقيمة ${money(report.revenue.monthlySubscriptionPriceMinor * 2)}`,
      WIDTH - PAGE_MARGIN - 35,
      y + 124,
      { color: palette.muted, fontSize: 20, fontWeight: 700, maxWidth: 950 },
    );
  } else {
    drawText(context, 'ملخص تشغيلي', WIDTH - PAGE_MARGIN - 35, y + 43, {
      fontSize: 21,
      fontWeight: 900,
    });
    drawText(
      context,
      `سجّل النادي ${report.attendance.visits} زيارة من ${report.attendance.uniqueMembers} لاعباً مختلفاً خلال الفترة المحددة.`,
      WIDTH - PAGE_MARGIN - 35,
      y + 91,
      { color: palette.muted, fontSize: 21, fontWeight: 700, maxWidth: 980 },
    );
  }
}

function drawFooter(context: CanvasRenderingContext2D, report: GymReport, page: number) {
  const created = new Intl.DateTimeFormat('ar-SY', {
    dateStyle: 'long',
    timeStyle: 'short',
  }).format(new Date(report.generatedAt));
  context.strokeStyle = '#cbd0c8';
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(PAGE_MARGIN, 1635);
  context.lineTo(WIDTH - PAGE_MARGIN, 1635);
  context.stroke();

  drawText(context, `تم إنشاء التقرير: ${created}`, WIDTH - PAGE_MARGIN, 1681, {
    color: palette.muted,
    fontSize: 16,
    fontWeight: 600,
  });
  drawText(context, `PRO GYM  —  ${page} / 2`, PAGE_MARGIN, 1681, {
    align: 'left',
    color: palette.muted,
    direction: 'ltr',
    fontSize: 16,
    fontWeight: 700,
  });
}

function drawReportPage(
  report: GymReport,
  logo: ImageBitmap,
  sections: ReportSection[],
  page: number,
) {
  const canvas = document.createElement('canvas');
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('المتصفح لا يدعم تجهيز ملف التقرير');

  context.fillStyle = palette.background;
  context.fillRect(0, 0, WIDTH, HEIGHT);
  context.save();
  context.globalAlpha = 0.12;
  context.strokeStyle = palette.accent;
  context.lineWidth = 34;
  context.beginPath();
  context.arc(24, 225, 150, 0, Math.PI * 2);
  context.stroke();
  context.restore();

  drawHeader(context, report, logo);
  drawText(
    context,
    page === 1 ? 'الملخص المالي والعضويات' : 'الحضور والتشغيل',
    WIDTH - PAGE_MARGIN,
    390,
    {
      color: palette.muted,
      fontSize: 18,
      fontWeight: 800,
    },
  );

  if (sections.length) {
    sections.forEach((section, index) =>
      drawSection(context, section, 430 + index * 292, index + 1),
    );
  } else {
    drawText(context, 'لا توجد إحصاءات مختارة لهذه الصفحة', WIDTH / 2, 760, {
      align: 'center',
      color: palette.muted,
      fontSize: 30,
      fontWeight: 800,
    });
  }

  drawInsight(context, report, page);
  drawFooter(context, report, page);
  return canvas;
}

async function loadLogo(url: string) {
  const response = await fetch(url);
  if (!response.ok) throw new Error('تعذر تحميل شعار النادي');
  return createImageBitmap(await response.blob());
}

async function canvasAsJpeg(canvas: HTMLCanvasElement) {
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (value) => (value ? resolve(value) : reject(new Error('تعذر تجهيز صفحة التقرير'))),
      'image/jpeg',
      0.94,
    ),
  );
  return new Uint8Array(await blob.arrayBuffer());
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

  const parts: Uint8Array[] = [encoder.encode('%PDF-1.4\n%PROGYM\n')];
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
  const sections = reportSections(report);
  let images: Uint8Array[];

  try {
    images = await Promise.all([
      canvasAsJpeg(drawReportPage(report, logo, sections.first, 1)),
      canvasAsJpeg(drawReportPage(report, logo, sections.second, 2)),
    ]);
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
