const dayFormatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' });
const timeFormatter = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
export function parisDay(value: string): string { return dayFormatter.format(new Date(value)); }
export function parisHour(value: string): number {
  const [hours, minutes] = timeFormatter.format(new Date(value)).split(':').map(Number);
  return hours + minutes / 60;
}
export function overlapsHour(start: string, end: string, date: string, hour: number): boolean {
  const startDay = parisDay(start), endDay = parisDay(end);
  if (startDay > date || endDay < date) return false;
  const from = startDay < date ? 0 : parisHour(start);
  const to = endDay > date ? 24 : parisHour(end);
  return from < hour + 1 && to > hour;
}
