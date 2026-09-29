import type { FinanceReport } from '@/features/admin/branch-finance-pages';
import { canvasAsJpeg, createPdf, loadLogo } from './arabic-gym-report';

type Row = { title: string; lines: string[] };
function money(value: number, currency: string) {
  return (
    (value / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) +
    ' ' +
    (currency === 'USD'
      ? 'دولار'
      : currency === 'SYP_NEW'
        ? 'ليرة سورية جديدة'
        : currency === 'SYP'
          ? 'ليرة سورية — سجل سابق'
          : currency)
  );
}
function time(value: string) {
  return new Intl.DateTimeFormat('ar-SY', {
    timeZone: 'Asia/Damascus',
    dateStyle: 'medium',
    timeStyle: 'short',
    hour12: true,
  }).format(new Date(value));
}
export async function downloadFinanceReport(report: FinanceReport, kind: 'financial' | 'members') {
  await document.fonts.ready;
  const logo = await loadLogo('/images/gym/log_bw.jpeg');
  const title = kind === 'financial' ? 'التقرير المالي للفرع' : 'تقرير اشتراكات اللاعبين';
  const sections: { title: string; rows: Row[] }[] =
    kind === 'financial'
      ? [
          {
            title: 'الملخص المالي — كل عملة مستقلة',
            rows: report.totals.map((t) => ({
              title: 'صافي الحركة: ' + money(t.netMinor, t.currency),
              lines: [
                'الإيرادات: ' + money(t.incomeMinor, t.currency),
                'المصاريف: ' + money(t.expenseMinor, t.currency),
              ],
            })),
          },
          {
            title: 'الاشتراكات حسب الباقة والسعر الأصلي',
            rows: report.plans.map((p) => ({
              title: p.name,
              lines: [
                'المدة: ' +
                  (p.durationDays ?? 'غير محفوظة') +
                  ' يوم  |  سعر الدفعة: ' +
                  money(p.unitPriceMinor, p.currency),
                'عدد اللاعبين: ' +
                  p.players +
                  '  |  عمليات الدفع: ' +
                  p.count +
                  '  |  الإجمالي: ' +
                  money(p.totalMinor, p.currency),
              ],
            })),
          },
          {
            title: 'الدفعات المستلمة حسب المراقب',
            rows: report.receivers.map((r) => ({
              title: r.name,
              lines: [
                'عدد الدفعات: ' + r.count + '  |  المستلم: ' + money(r.totalMinor, r.currency),
              ],
            })),
          },
          {
            title: 'المصاريف بالتفصيل',
            rows: report.expenses.map((e) => ({
              title: e.title + (e.voidedAt ? ' — ملغى / غير محتسب' : ''),
              lines: [
                'المبلغ: ' +
                  money(e.amountMinor, e.currency) +
                  '  |  تاريخ الدفع: ' +
                  new Intl.DateTimeFormat('ar-SY', { timeZone: 'Asia/Damascus' }).format(
                    new Date(e.spentAt),
                  ),
                'سجّله: ' + e.createdByName + '  |  وقت التسجيل: ' + time(e.createdAt),
                ...(e.notes ? ['التفاصيل: ' + e.notes] : []),
                ...(e.voidReason ? ['سبب الإلغاء: ' + e.voidReason] : []),
                'رقم القيد: ' + e.id,
              ],
            })),
          },
        ]
      : [
          {
            title: 'اللاعبون والباقات وتواريخ الدفع',
            rows: report.receipts.map((r) => ({
              title: r.memberNameSnapshot ?? r.subscription.member.user.fullName,
              lines: [
                'الباقة: ' +
                  (r.planNameSnapshot ?? 'اشتراك سابق — غير محفوظة') +
                  '  |  المدة: ' +
                  (r.durationDaysSnapshot ?? '—') +
                  ' يوم',
                'الدفعة: ' + money(r.amountMinor, r.currency) + '  |  التاريخ: ' + time(r.paidAt),
                'المراقب: ' + (r.observerNameSnapshot ?? r.receiverNameSnapshot ?? 'سجل سابق'),
                'رقم الدفعة: ' + r.id,
              ],
            })),
          },
        ];
  const images: Uint8Array[] = [];
  let canvas!: HTMLCanvasElement,
    ctx!: CanvasRenderingContext2D,
    y = 0,
    page = 0;
  const text = (
    value: string,
    x: number,
    baseline: number,
    size = 23,
    bold = false,
    color = '#233129',
  ) => {
    ctx.font = `${bold ? 700 : 400} ${size}px Tahoma, Arial, sans-serif`;
    ctx.textAlign = 'right';
    ctx.direction = 'rtl';
    ctx.fillStyle = color;
    ctx.fillText(value, x, baseline);
  };
  const wrap = (value: string, size = 23, bold = false) => {
    ctx.font = `${bold ? 700 : 400} ${size}px Tahoma, Arial, sans-serif`;
    const lines: string[] = [];
    let line = '';
    for (const paragraph of value.split(/\r?\n/)) {
      const words = paragraph.split(/\s+/).flatMap((word) => {
        if (ctx.measureText(word).width <= 1010) return [word];
        const pieces: string[] = [];
        let piece = '';
        for (const { segment } of new Intl.Segmenter('ar', { granularity: 'grapheme' }).segment(
          word,
        )) {
          if (ctx.measureText(piece + segment).width > 1010) {
            pieces.push(piece);
            piece = '';
          }
          piece += segment;
        }
        if (piece) pieces.push(piece);
        return pieces;
      });
      for (const word of words) {
        const next = line ? line + ' ' + word : word;
        if (ctx.measureText(next).width > 1010 && line) {
          lines.push(line);
          line = word;
        } else line = next;
      }
      lines.push(line);
      line = '';
    }
    return lines;
  };
  const begin = () => {
    page++;
    canvas = document.createElement('canvas');
    canvas.width = 1240;
    canvas.height = 1754;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('تعذر تجهيز PDF');
    ctx = context;
    ctx.fillStyle = '#f6f8f5';
    ctx.fillRect(0, 0, 1240, 1754);
    ctx.fillStyle = '#111a14';
    ctx.fillRect(0, 0, 1240, 240);
    ctx.fillStyle = '#39ff14';
    ctx.fillRect(0, 240, 1240, 7);
    const ratio = Math.min(140 / logo.width, 140 / logo.height);
    ctx.drawImage(logo, 70, 48, logo.width * ratio, logo.height * ratio);
    text(title, 1170, 85, 37, true, '#ffffff');
    text(report.branch.nameAr, 1170, 140, 27, false, '#d9e4d7');
    text(
      report.range.from + '  —  ' + report.range.to + '  |  توقيت دمشق',
      1170,
      195,
      22,
      false,
      '#b6c7b6',
    );
    y = 295;
  };
  const finish = async () => {
    ctx.fillStyle = '#dce3d9';
    ctx.fillRect(64, 1665, 1112, 1);
    text('PRO GYM  •  ' + title + '  •  صفحة ' + page, 1176, 1708, 18);
    text('أُنشئ: ' + time(report.generatedAt), 590, 1708, 17);
    images.push(await canvasAsJpeg(canvas));
    canvas.width = 0;
    canvas.height = 0;
  };
  try {
    begin();
    for (const section of sections) {
      if (y > 1450) {
        await finish();
        begin();
      }
      text(section.title, 1170, y + 30, 29, true);
      y += 70;
      if (!section.rows.length) {
        text('لا توجد سجلات ضمن الفترة المحددة', 1144, y + 30, 22);
        y += 80;
      }
      for (const row of section.rows) {
        const lines = [
          ...wrap(row.title, 25, true).map((value) => ({ value, bold: true })),
          ...row.lines.flatMap((l) => wrap(l).map((value) => ({ value, bold: false }))),
        ];
        // Split very long notes across pages without cropping the record.
        let offset = 0;
        while (offset < lines.length) {
          const available = Math.floor((1600 - y - 35) / 38);
          if (available < 2) {
            await finish();
            begin();
            text(section.title + ' — تابع', 1170, y + 30, 29, true);
            y += 70;
            continue;
          }
          const part = lines.slice(offset, offset + available),
            height = part.length * 38 + 32;
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(64, y, 1112, height);
          ctx.fillStyle = '#36ac29';
          ctx.fillRect(1170, y, 6, height);
          part.forEach((line, i) =>
            text(line.value, 1145, y + 36 + i * 38, line.bold ? 25 : 23, line.bold),
          );
          y += height + 15;
          offset += part.length;
        }
      }
      y += 20;
    }
    await finish();
  } finally {
    logo.close();
  }
  const url = URL.createObjectURL(createPdf(images));
  const a = document.createElement('a');
  a.href = url;
  a.download = `progym-${report.branch.code}-${kind}-${report.range.from}-${report.range.to}.pdf`;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
