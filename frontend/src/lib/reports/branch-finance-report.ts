import type { FinanceReport } from '@/features/admin/branch-finance-pages';
import { canvasAsJpeg, createPdf, loadLogo } from './arabic-gym-report';

type Row = { title: string; lines: string[] };
type ReportIcon = 'income' | 'expense' | 'balance' | 'plans' | 'people' | 'receipt';
type Section = { title: string; hint: string; icon: ReportIcon; rows: Row[] };

// Canvas paths stay crisp in the PDF and do not depend on emoji fonts.
function drawIcon(
  ctx: CanvasRenderingContext2D,
  icon: ReportIcon,
  x: number,
  y: number,
  color: string,
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(1.5, 1.5);
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.8;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  if (icon === 'income' || icon === 'expense') {
    ctx.rect(2, 10, 20, 12);
    ctx.moveTo(2, 15);
    ctx.lineTo(22, 15);
    ctx.moveTo(12, 1);
    ctx.lineTo(12, 11);
    const end = icon === 'income' ? 11 : 1,
      shoulder = icon === 'income' ? 7 : 5;
    ctx.moveTo(8, shoulder);
    ctx.lineTo(12, end);
    ctx.lineTo(16, shoulder);
  } else if (icon === 'people') {
    ctx.arc(12, 6, 4, 0, Math.PI * 2);
    ctx.moveTo(4, 22);
    ctx.lineTo(4, 19);
    ctx.quadraticCurveTo(4, 13, 12, 13);
    ctx.quadraticCurveTo(20, 13, 20, 19);
    ctx.lineTo(20, 22);
  } else if (icon === 'balance') {
    ctx.roundRect(1, 5, 22, 17, 3);
    ctx.moveTo(2, 5);
    ctx.lineTo(18, 1);
    ctx.lineTo(18, 5);
    ctx.moveTo(23, 11);
    ctx.lineTo(16, 11);
    ctx.lineTo(16, 17);
    ctx.lineTo(23, 17);
  } else {
    ctx.roundRect(3, 1, 18, 22, 2);
    ctx.moveTo(7, 7);
    ctx.lineTo(17, 7);
    ctx.moveTo(7, 12);
    ctx.lineTo(17, 12);
    ctx.moveTo(7, 17);
    ctx.lineTo(icon === 'plans' ? 13 : 17, 17);
  }
  ctx.stroke();
  ctx.restore();
}
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
  const sections: Section[] =
    kind === 'financial'
      ? [
          {
            title: 'من أين جاءت المقبوضات؟',
            hint: 'كل بطاقة تجمع الاشتراكات ذات الباقة والسعر نفسيهما وقت الدفع.',
            icon: 'plans',
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
            title: 'من استلم المبالغ؟',
            hint: 'المبالغ المسجّلة باسم كل مراقب، مع عدد الدفعات التي استلمها.',
            icon: 'people',
            rows: report.receivers.map((r) => ({
              title: r.name,
              lines: [
                'عدد الدفعات: ' + r.count + '  |  المستلم: ' + money(r.totalMinor, r.currency),
              ],
            })),
          },
          {
            title: 'على ماذا صُرفت الأموال؟',
            hint: 'اسم المصروف، قيمته، يوم الدفع ومن سجّله. القيود الملغاة لا تدخل في الحساب.',
            icon: 'expense',
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
            hint: 'كل بطاقة هي دفعة اشتراك واحدة؛ قد يتكرر اسم اللاعب عند التجديد.',
            icon: 'people',
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
  const panel = (x: number, top: number, width: number, height: number, color = '#ffffff') => {
    ctx.beginPath();
    ctx.roundRect(x, top, width, height, 18);
    ctx.fillStyle = color;
    ctx.fill();
  };
  const sectionHeader = (section: Section, index: number, continuation = false) => {
    panel(64, y, 1112, 108, '#e7eee4');
    drawIcon(ctx, section.icon, 1120, y + 22, '#256d3d');
    text(
      `${String(index + 1).padStart(2, '0')}  ${section.title}${continuation ? ' — تابع' : ''}`,
      1100,
      y + 40,
      29,
      true,
    );
    text(section.hint, 1100, y + 79, 20, false, '#51634f');
    y += 130;
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
    if (kind === 'financial') {
      text('حركة الصندوق في نظرة واحدة', 1170, y + 32, 34, true);
      text(
        'المقبوضات − المصروفات = صافي الحركة خلال الفترة المحددة',
        1170,
        y + 78,
        24,
        false,
        '#51634f',
      );
      y += 110;
      if (!report.totals.length) {
        text('لا توجد حركة مالية ضمن هذه الفترة.', 1170, y + 35);
        y += 90;
      }
      for (const total of report.totals) {
        if (y > 1250) {
          await finish();
          begin();
        }
        text(
          total.currency === 'USD'
            ? 'الدولار الأمريكي'
            : total.currency === 'SYP_NEW'
              ? 'الليرة السورية الجديدة'
              : `عملة السجل: ${total.currency}`,
          1170,
          y + 25,
          26,
          true,
        );
        y += 48;
        const cards: {
          label: string;
          hint: string;
          amount: number;
          icon: ReportIcon;
          color: string;
          bg: string;
        }[] = [
          {
            label: 'المقبوضات',
            hint: 'ما استُلم من الاشتراكات',
            amount: total.incomeMinor,
            icon: 'income',
            color: '#17643a',
            bg: '#e5f3e9',
          },
          {
            label: 'المصروفات',
            hint: 'ما دُفع لتكاليف النادي',
            amount: total.expenseMinor,
            icon: 'expense',
            color: '#a23a26',
            bg: '#fff0e9',
          },
          {
            label: 'صافي الحركة',
            hint: 'المقبوضات ناقص المصروفات',
            amount: total.netMinor,
            icon: 'balance',
            color: '#235d91',
            bg: '#e9f1fc',
          },
        ];
        cards.forEach((card, i) => {
          const x = 64 + (2 - i) * 376;
          panel(x, y, 360, 176, card.bg);
          drawIcon(ctx, card.icon, x + 303, y + 20, card.color);
          text(card.label, x + 286, y + 46, 27, true, card.color);
          ctx.font = '700 37px Tahoma, Arial, sans-serif';
          const value = (card.amount / 100).toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          });
          const size = Math.min(37, (37 * 312) / Math.max(1, ctx.measureText(value).width));
          text(value, x + 334, y + 105, size, true, card.color);
          text(card.hint, x + 334, y + 147, 20, false, card.color);
        });
        y += 209;
      }
      if (y > 1240) {
        await finish();
        begin();
      }
      panel(64, y + 12, 1112, 288, '#ffffff');
      text('كيف تقرأ هذا التقرير؟', 1145, y + 55, 28, true);
      [
        '١  المقبوضات: دفعات الاشتراكات المسجّلة خلال هذه الفترة، وليس عدد اللاعبين الحالي.',
        '٢  المصروفات: المبالغ المدفوعة حسب يوم المصروف، باستثناء القيود الملغاة.',
        '٣  صافي الحركة ليس رصيد الصندوق الكلي؛ لا يشمل رصيداً سابقاً أو تكاليف غير مسجّلة.',
        '٤  كل عملة مستقلة. الأسعار المعروضة هي أسعار الدفع الأصلية ولا تتغير بأثر رجعي.',
        'في الصفحات التالية: الباقات ← المراقبون ← تفاصيل المصاريف.',
      ].forEach((line, i) => text(line, 1145, y + 103 + i * 39, 21, false, '#51634f'));
      await finish();
      begin();
    } else {
      panel(64, y, 1112, 108, '#e5f3e9');
      drawIcon(ctx, 'receipt', 1115, y + 25, '#17643a');
      text(
        `${report.receiptCount} عملية اشتراك مدفوعة خلال الفترة`,
        1090,
        y + 43,
        30,
        true,
        '#17643a',
      );
      text('العدد يمثل عمليات الدفع، وليس عدد لاعبين فريداً.', 1090, y + 80, 21, false, '#51634f');
      y += 130;
    }
    for (const [index, section] of sections.entries()) {
      if (y > 1330) {
        await finish();
        begin();
      }
      sectionHeader(section, index);
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
            sectionHeader(section, index, true);
            continue;
          }
          const part = lines.slice(offset, offset + available),
            height = part.length * 38 + 32;
          panel(64, y, 1112, height);
          ctx.fillStyle = '#36ac29';
          ctx.fillRect(1170, y, 6, height);
          part.forEach((line, i) => {
            const isIdentifier =
              line.value.startsWith('رقم القيد:') || line.value.startsWith('رقم الدفعة:');
            text(
              line.value,
              1145,
              y + 36 + i * 38,
              line.bold ? 26 : isIdentifier ? 18 : 23,
              line.bold,
              isIdentifier ? '#6e7e70' : '#233129',
            );
          });
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
