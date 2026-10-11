import { BadRequestException } from '@nestjs/common';

export function businessRange(from: string, to: string) {
  const date = (s: string) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) throw new BadRequestException('Invalid date');
    const utc = new Date(s + 'T00:00:00Z');
    if (Number.isNaN(utc.getTime()) || utc.toISOString().slice(0, 10) !== s)
      throw new BadRequestException('Invalid date');
    return new Date(s + 'T00:00:00+03:00');
  };
  const gte = date(from),
    lt = new Date(date(to).getTime() + 86400000);
  if (lt <= gte || lt.getTime() - gte.getTime() > 366 * 86400000)
    throw new BadRequestException('اختر فترة صحيحة لا تتجاوز سنة');
  return { gte, lt };
}
