export function businessDate(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Damascus',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}
export function financialTime(value: string) {
  return new Intl.DateTimeFormat('ar-SY', {
    timeZone: 'Asia/Damascus',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(value));
}
export function salaryMonthLabel(month: string) {
  return new Intl.DateTimeFormat('ar-SY', {
    year: 'numeric',
    month: 'long',
    timeZone: 'Asia/Damascus',
  }).format(new Date(month + '-01T12:00:00+03:00'));
}
