const MONTHS = Array.from({ length: 12 }, (_, index) => `${index + 1}-р сар`);
const WEEKDAYS = [
  "Ням",
  "Даваа",
  "Мягмар",
  "Лхагва",
  "Пүрэв",
  "Баасан",
  "Бямба",
];

const pad = (value: number) => String(value).padStart(2, "0");

/** YYYY-MM-DD, локал цагаар. */
export function toDateKey(timestamp: number) {
  const date = new Date(timestamp);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** YYYY-MM, локал цагаар. */
export function toMonthKey(timestamp: number) {
  return toDateKey(timestamp).slice(0, 7);
}

export function parseDateKey(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function formatMonthKey(monthKey: string) {
  const [year, month] = monthKey.split("-").map(Number);
  return `${year} оны ${month}-р сар`;
}

/** "11-р сар 9, Даваа" эсвэл "2026 оны 11-р сар 9, Даваа гараг". */
export function formatMongolianDate(timestamp: number, withYear = false) {
  const date = new Date(timestamp);
  const dateText = `${MONTHS[date.getMonth()]} ${date.getDate()}`;
  const weekday = WEEKDAYS[date.getDay()];
  return withYear
    ? `${date.getFullYear()} оны ${dateText}, ${weekday} гараг`
    : `${dateText}, ${weekday}`;
}

export function formatShortDate(dateKey: string) {
  const date = parseDateKey(dateKey);
  return {
    day: `${date.getMonth() + 1}/${date.getDate()}`,
    weekday: WEEKDAYS[date.getDay()],
  };
}

export function formatClock(timestamp: number) {
  const date = new Date(timestamp);
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** "09:00" + 15 → "09:15". */
export function addMinutes(time: string, minutes: number) {
  const [hour, minute] = time.split(":").map(Number);
  const total = hour * 60 + minute + minutes;
  return `${pad(Math.floor(total / 60) % 24)}:${pad(total % 60)}`;
}

/** "09:30" → 570 (өдрийн эхнээс хойшхи минут). */
export function parseClock(time: string) {
  const [hour, minute] = time.trim().split(":").map(Number);
  return hour * 60 + minute;
}

export function minutesOfDay(timestamp: number) {
  const date = new Date(timestamp);
  return date.getHours() * 60 + date.getMinutes();
}
