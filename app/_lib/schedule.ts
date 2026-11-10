/** Хичээлийн хуваарь: хугацаа (огноо) ба гариг бүрийн цаг. */

/** Нэг удаагийн хичээл: гариг (1 = Даваа … 7 = Ням, ISO) + "HH:MM" цаг. */
export type CourseSlot = { day: number; start: string; end: string };

export const WEEKDAY_OPTIONS = [
  { value: 1, short: "Да", label: "Даваа" },
  { value: 2, short: "Мя", label: "Мягмар" },
  { value: 3, short: "Лх", label: "Лхагва" },
  { value: 4, short: "Пү", label: "Пүрэв" },
  { value: 5, short: "Ба", label: "Баасан" },
  { value: 6, short: "Бя", label: "Бямба" },
  { value: 7, short: "Ня", label: "Ням" },
] as const;

const weekday = (day: number) =>
  WEEKDAY_OPTIONS.find((option) => option.value === day);

/** Гариг, дараа нь эхлэх цагаар эрэмбэлнэ. */
export function sortSlots(slots: CourseSlot[]) {
  return [...slots].sort(
    (a, b) => a.day - b.day || a.start.localeCompare(b.start),
  );
}

/** Сургуулийн хичээлийн парууд (90 минут). Цаг өөрчлөгдвөл зөвхөн энд засна. */
export const PERIODS = [
  { number: 1, start: "08:00", end: "09:30" },
  { number: 2, start: "09:40", end: "11:10" },
  { number: 3, start: "11:20", end: "12:50" },
  { number: 4, start: "13:20", end: "14:50" },
  { number: 5, start: "15:00", end: "16:30" },
  { number: 6, start: "16:40", end: "18:10" },
  { number: 7, start: "18:20", end: "19:50" },
  { number: 8, start: "20:00", end: "21:30" },
] as const;

export type Period = (typeof PERIODS)[number];

export const periodByNumber = (number: number) =>
  PERIODS.find((period) => period.number === number);

/**
 * Цагийн хүрээнд багтах парууд (11:20–14:50 → 3, 4-р пар).
 * Пар таарахгүй бол эхлэх цагт хамгийн ойр парыг буцаана.
 */
export function slotPeriods(slot: Pick<CourseSlot, "start" | "end">) {
  const inside = PERIODS.filter(
    (period) => period.start >= slot.start && period.end <= slot.end,
  );
  if (inside.length) return inside;
  const nearest = PERIODS.find((period) => period.end > slot.start);
  return [nearest ?? PERIODS[PERIODS.length - 1]];
}

/** Нэг гарагийн дараалсан парууд нэгтгэгдсэн хуваарь. */
export type MergedSlot = CourseSlot & { from: number; to: number };

/** Нэг гарагт дараалсан паруудыг нэгтгэнэ (3-р + 4-р → 3–4-р пар). */
export function mergeSlots(slots: CourseSlot[]): MergedSlot[] {
  const merged: MergedSlot[] = [];
  for (const slot of sortSlots(slots)) {
    const periods = slotPeriods(slot);
    const from = periods[0].number;
    const to = periods[periods.length - 1].number;
    const last = merged.at(-1);
    if (last && last.day === slot.day && from === last.to + 1) {
      last.to = to;
      last.end = slot.end;
    } else {
      merged.push({ ...slot, from, to });
    }
  }
  return merged;
}

/** "09:00 — 10:30" */
export const formatSlotTime = (slot: Pick<CourseSlot, "start" | "end">) =>
  `${slot.start} — ${slot.end}`;

const periodLabel = (slot: MergedSlot) =>
  slot.from === slot.to
    ? `${slot.from}-р пар`
    : `${slot.from}–${slot.to}-р пар`;

/** "Мягмар 3–4-р пар · 11:20–14:50" */
export function formatSlot(slot: MergedSlot) {
  return `${weekday(slot.day)?.label ?? ""} ${periodLabel(slot)} · ${slot.start}–${slot.end}`;
}

/** "Мя 3–4-р пар, Ба 1-р пар" */
export function formatSlots(slots: CourseSlot[]) {
  return mergeSlots(slots)
    .map((slot) => `${weekday(slot.day)?.short ?? ""} ${periodLabel(slot)}`)
    .join(", ");
}

/** "2026-09-01" → "2026.09.01". */
const dotted = (dateKey: string) => dateKey.replaceAll("-", ".");

/** "2026.09.01 – 2026.12.25" */
export function formatDateRange(startDate: string, endDate: string) {
  return `${dotted(startDate)} – ${dotted(endDate)}`;
}

/** Тухайн гарагт орох парын дугаарууд (эрэмбэлсэн, давхардалгүй). */
export function periodsForDay(slots: CourseSlot[], day: number) {
  const numbers = new Set<number>();
  for (const slot of slots) {
    if (slot.day !== day) continue;
    for (const period of slotPeriods(slot)) numbers.add(period.number);
  }
  return [...numbers].sort((a, b) => a - b);
}

/** Ирц авах боломжтой хугацаа: пар эхлэхээс өмнө ба дууссаны дараа (минут). */
export const ATTENDANCE_WINDOW_MIN = 10;

const toMinutes = (time: string) => {
  const [hour, minute] = time.split(":").map(Number);
  return hour * 60 + minute;
};

const pad2 = (value: number) => String(value).padStart(2, "0");
export const formatMinutes = (minutes: number) =>
  `${pad2(Math.floor(minutes / 60))}:${pad2(minutes % 60)}`;

/** Парын ирц авах цонх [эхлэх−10, дуусах+10] (өдрийн минутаар). */
export function periodWindow(number: number) {
  const period = periodByNumber(number);
  if (!period) return null;
  return {
    from: toMinutes(period.start) - ATTENDANCE_WINDOW_MIN,
    to: toMinutes(period.end) + ATTENDANCE_WINDOW_MIN,
  };
}

export function isWithinPeriodWindow(number: number, nowMinutes: number) {
  const window = periodWindow(number);
  return Boolean(
    window && nowMinutes >= window.from && nowMinutes <= window.to,
  );
}

/**
 * Өнөөдрийн парууд дундаас ирц нь аваагүй, одоо нээж болох пар ба
 * дараа нь нээгдэх пар.
 */
export function periodAvailability(
  todayPeriods: number[],
  takenPeriods: number[],
  nowMinutes: number,
) {
  const untaken = todayPeriods.filter(
    (period) => !takenPeriods.includes(period),
  );
  const openable =
    untaken.find((period) => isWithinPeriodWindow(period, nowMinutes)) ?? null;
  const upcoming =
    untaken.find((period) => (periodWindow(period)?.from ?? 0) > nowMinutes) ??
    null;
  return { openable, upcoming, untaken };
}

/** Улаанбаатарын цагаар одоогийн өдрийн минут (серверт). */
export function ulaanbaatarMinutes(date = new Date()) {
  const [hour, minute] = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Ulaanbaatar",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  })
    .format(date)
    .split(":")
    .map(Number);
  return hour * 60 + minute;
}
