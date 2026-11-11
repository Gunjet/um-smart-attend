import { CLASS_GROUPS, PROGRAMS, sortClassGroups } from "./programs";
import { type CourseSlot, PERIODS, sortSlots } from "./schedule";

/**
 * Сургуулийн хичээлийн хуваарийн Excel-ийг (хүснэгт хэлбэрээр) задлана.
 *
 * Хүлээгдэж буй хэлбэр:
 * - нэг мөрөнд гаригийн нэрс (ДАВАА, МЯГМАР, …) — пар бүрийн баганыг хамарсан;
 * - доор нь парын дугаар (I, II, … эсвэл 1, 2, …);
 * - зүүн талд «Код», «Нэр», «Багшийн нэр», «…анги» баганууд;
 * - хичээл бүр нэг (эсвэл хоёр багштай бол хэд хэдэн) мөр — пар дээрх
 *   хоосон биш нүд (лк, сем, лаб …) нь тухайн цагт хичээл орно гэсэн үг.
 * Кодгүй мөрүүдийг (тусгаарлагч, гарчиг) алгасна.
 */

export type ParsedCourse = {
  code: string;
  title: string;
  /** Хуваарь дээрх багшийн нэр (эхнийх). */
  teacherName: string;
  classGroups: string[];
  slots: CourseSlot[];
};

export type ParsedTimetable = {
  courses: ParsedCourse[];
  warnings: string[];
};

export class TimetableFormatError extends Error {}

const DAY_NAMES: [RegExp, number][] = [
  [/^ДАВАА/, 1],
  [/^МЯГМАР/, 2],
  [/^ЛХАГВА/, 3],
  [/^ПҮРЭВ/, 4],
  [/^БААСАН/, 5],
  [/^БЯМБА/, 6],
  [/^НЯМ/, 7],
];

const ROMAN: Record<string, number> = {
  I: 1,
  II: 2,
  III: 3,
  IV: 4,
  V: 5,
  VI: 6,
  VII: 7,
  VIII: 8,
};

const clean = (value: string | undefined) =>
  (value ?? "").replace(/\s+/g, " ").trim();

function dayOf(value: string) {
  const text = clean(value).toUpperCase();
  return DAY_NAMES.find(([pattern]) => pattern.test(text))?.[1] ?? null;
}

/** "I", "II", "1", "1-р пар", "IV пар" → парын дугаар. */
function periodOf(value: string) {
  const text = clean(value)
    .toUpperCase()
    // Кирилл "І" (Украйн), латин lookalike-ийг энгийн I болгоно.
    .replace(/[ІӀ]/g, "I")
    .replace(/[ХX]/g, "X");
  const roman = text.match(/^([IVX]+)\b/);
  if (roman) return ROMAN[roman[1]] ?? null;
  const digit = text.match(/^([1-8])(?!\d)/);
  return digit ? Number(digit[1]) : null;
}

/** Латин үсэгтэй адилхан кирилл үсгийг латин болгоно (кодонд). */
const CYR_TO_LAT: Record<string, string> = {
  А: "A",
  В: "B",
  С: "C",
  Е: "E",
  Н: "H",
  К: "K",
  М: "M",
  О: "O",
  Р: "P",
  Т: "T",
  Х: "X",
  У: "Y",
};

/** Хичээлийн код: "S.IT101", "MT 201" гэх мэт — тоо агуулсан латин код. */
export function normalizeCode(value: string) {
  // Жижиг кирилл үсэгтэй бол код биш ("1-р курс", "5-8-р долоо хоног").
  if (/[а-яөү]/.test(value)) return null;
  const text = clean(value)
    .toUpperCase()
    .replace(/[АВСЕНКМОРТХУ]/g, (char) => CYR_TO_LAT[char] ?? char)
    .replace(/\s*\.\s*/g, ".")
    .replace(/\s+/g, " ");
  if (
    !/^[A-Z0-9][A-Z0-9 .\-]{1,29}$/.test(text) ||
    !/\d/.test(text) ||
    !/[A-Z]/.test(text)
  ) {
    return null;
  }
  return text;
}

/** Латин lookalike-ийг кирилл болгоно (ангийн текстэд: "MT-1" → "МТ-1"). */
const LAT_TO_CYR: Record<string, string> = {
  A: "А",
  B: "В",
  C: "С",
  E: "Е",
  H: "Н",
  K: "К",
  M: "М",
  O: "О",
  P: "Р",
  T: "Т",
  X: "Х",
  Y: "У",
};

const PROGRAM_PATTERN = PROGRAMS.map((program) => program.code)
  .sort((a, b) => b.length - a.length)
  .join("|");

/**
 * Ангийн текстийг задлана:
 * "МТ-1, УУАТ-1" → [МТ-1, УУАТ-1]; "ГТИ-1,2" → [ГТИ-1, ГТИ-2];
 * "МТ-3,МТ-4"; "4-ЦИ" → [ЦИ-4]; "Ко-2-МТ" → [МТ-2].
 * Танигдаагүй хэсгийг `unknown`-д буцаана.
 */
export function parseClassGroups(value: string) {
  const text = clean(value)
    .toUpperCase()
    .replace(/[ABCEHKMOPTXY]/g, (char) => LAT_TO_CYR[char] ?? char)
    .replace(/[–—]/g, "-");
  const found = new Set<string>();
  const unknown: string[] = [];
  let lastProgram: string | null = null;

  const programYears = new RegExp(
    `(${PROGRAM_PATTERN})\\s*-?\\s*([1-4](?:\\s*[,.]\\s*[1-4](?!\\d))*)(?!\\d)`,
    "g",
  );
  const yearProgram = new RegExp(`([1-4])\\s*-\\s*(${PROGRAM_PATTERN})`, "g");

  for (const part of text.split(/[;,/]|\s+БА\s+/)) {
    const piece = part.trim();
    if (!piece) continue;
    // "ГТИ-1,2" — таслалын дараах ганц тоо өмнөх хөтөлбөрт хамаарна.
    if (/^[1-4]$/.test(piece)) {
      if (lastProgram) found.add(`${lastProgram}-${piece}`);
      else unknown.push(piece);
      continue;
    }
    let matched = false;
    for (const match of piece.matchAll(yearProgram)) {
      found.add(`${match[2]}-${match[1]}`);
      lastProgram = match[2];
      matched = true;
    }
    if (!matched) {
      for (const match of piece.matchAll(programYears)) {
        for (const year of match[2].match(/[1-4]/g) ?? []) {
          found.add(`${match[1]}-${year}`);
        }
        lastProgram = match[1];
        matched = true;
      }
    }
    if (!matched) {
      unknown.push(piece);
      lastProgram = null;
    }
  }
  return {
    groups: sortClassGroups([...found].filter((g) => CLASS_GROUPS.includes(g))),
    unknown,
  };
}

type Columns = {
  code: number;
  title: number;
  teacher: number;
  classGroups: number;
  /** багана → { гариг, пар } */
  grid: Map<number, { day: number; period: number }>;
  /** Өгөгдөл эхлэх мөр. */
  firstRow: number;
};

/** Гаригийн мөр, парын мөр, зүүн талын баганыг олно. */
function findColumns(rows: string[][]): Columns | null {
  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    const dayCells = row
      .map((cell, c) => ({ c, day: dayOf(cell) }))
      .filter((item) => item.day !== null);
    if (new Set(dayCells.map((item) => item.day)).size < 2) continue;

    // Парын дугаартай мөр — гаригийн мөрийн доор 1–3 мөрийн дотор.
    for (let p = r + 1; p <= Math.min(r + 3, rows.length - 1); p++) {
      const periodRow = rows[p];
      const grid = new Map<number, { day: number; period: number }>();
      const firstDayCol = dayCells[0].c;
      let currentDay: number | null = null;
      const width = Math.max(row.length, periodRow.length);
      for (let c = firstDayCol; c < width; c++) {
        // Нэгтгэсэн нүдгүй файлд гаригийн нэр зөвхөн эхний баганад байна.
        const day = dayOf(row[c] ?? "");
        if (day !== null) currentDay = day;
        const period = periodOf(periodRow[c] ?? "");
        if (currentDay !== null && period !== null) {
          grid.set(c, { day: currentDay, period });
        }
      }
      if (grid.size < 3) continue;

      // Толгойн текст: эхлээд гаригийн болон парын мөр, олдохгүй бол дээрх мөр
      // (дээр нь бүх өргөнийг хамарсан гарчиг байж болох тул сүүлд шалгана).
      const headerOf = (c: number, withAbove: boolean) =>
        [withAbove ? rows[r - 1]?.[c] : "", row[c], periodRow[c]]
          .map((value) => clean(value).toLowerCase())
          .join(" ");
      const left = Array.from({ length: firstDayCol }, (_, c) => c);
      const pick = (test: (header: string) => boolean) =>
        left.find((c) => test(headerOf(c, false))) ??
        left.find((c) => test(headerOf(c, true))) ??
        -1;

      const code = pick((h) => /код/.test(h) && !/багш/.test(h));
      const title = pick(
        (h) => /нэр/.test(h) && !/багш/.test(h) && !/код/.test(h),
      );
      const teacher = pick((h) => /багш/.test(h) && /нэр/.test(h));
      const classGroups = pick((h) => /анги|мэрг/.test(h));
      if (code < 0) {
        throw new TimetableFormatError(
          "«Код» гэсэн толгойтой багана олдсонгүй.",
        );
      }
      return {
        code,
        title,
        teacher: teacher >= 0 ? teacher : pick((h) => /багш/.test(h)),
        classGroups,
        grid,
        firstRow: p + 1,
      };
    }
  }
  return null;
}

/**
 * Нүдний утгуудаас (нэгтгэсэн нүднүүдийг дэлгэсэн) хуваарийг задлана.
 * Олон хуудас бол хуудас бүрийн мөрүүдийг тусад нь өгнө.
 */
export function parseTimetable(sheets: string[][][]): ParsedTimetable {
  const byCode = new Map<
    string,
    ParsedCourse & { slotKeys: Set<string>; unknownGroups: Set<string> }
  >();
  const warnings: string[] = [];
  let foundSheet = false;

  for (const rows of sheets) {
    const columns = findColumns(rows);
    if (!columns) continue;
    foundSheet = true;

    for (let r = columns.firstRow; r < rows.length; r++) {
      const row = rows[r];
      const code = normalizeCode(row[columns.code] ?? "");
      if (!code) continue;
      // Бүх өргөнийг хамарсан нэгтгэсэн мөр (гарчиг, тусгаарлагч) — алгасна.
      if (columns.title >= 0 && row[columns.title] === row[columns.code]) {
        continue;
      }

      const course = byCode.get(code) ?? {
        code,
        title: "",
        teacherName: "",
        classGroups: [],
        slots: [],
        slotKeys: new Set<string>(),
        unknownGroups: new Set<string>(),
      };
      byCode.set(code, course);

      if (!course.title && columns.title >= 0) {
        course.title = clean(row[columns.title]).slice(0, 120);
      }
      if (!course.teacherName && columns.teacher >= 0) {
        course.teacherName = clean(row[columns.teacher]);
      }
      if (columns.classGroups >= 0) {
        const { groups, unknown } = parseClassGroups(
          row[columns.classGroups] ?? "",
        );
        course.classGroups = sortClassGroups([
          ...course.classGroups,
          ...groups,
        ]);
        for (const item of unknown) course.unknownGroups.add(item);
      }
      for (const [c, { day, period }] of columns.grid) {
        if (!clean(row[c])) continue;
        course.slotKeys.add(`${day}|${period}`);
      }
    }
  }

  if (!foundSheet) {
    throw new TimetableFormatError(
      "Хуваарийн хүснэгт олдсонгүй. Гаригийн нэрс (Даваа, Мягмар …) болон парын дугаар (I, II …) бүхий толгой мөр байх ёстой.",
    );
  }

  const parsed: ParsedCourse[] = [];
  for (const course of byCode.values()) {
    const slots = sortSlots(
      [...course.slotKeys].map((key) => {
        const [day, number] = key.split("|").map(Number);
        const period = PERIODS[number - 1];
        return { day, start: period.start, end: period.end };
      }),
    );
    if (!course.title) course.title = course.code;
    if (course.unknownGroups.size) {
      warnings.push(
        `${course.code}: «${[...course.unknownGroups].join(", ")}» ангийг танисангүй.`,
      );
    }
    if (!course.classGroups.length) {
      warnings.push(`${course.code}: анги тодорхойгүй тул алгаслаа.`);
      continue;
    }
    if (!slots.length) {
      warnings.push(`${course.code}: хуваарьт цаг алга тул алгаслаа.`);
      continue;
    }
    parsed.push({
      code: course.code,
      title: course.title,
      teacherName: course.teacherName,
      classGroups: course.classGroups,
      slots,
    });
  }
  parsed.sort((a, b) => a.code.localeCompare(b.code));
  return { courses: parsed, warnings };
}

/* ------------------------------ Багш таних ------------------------------ */

const nameTokens = (value: string) =>
  value
    .toLowerCase()
    .replace(/[ё]/g, "е")
    .split(/[\s.,]+/)
    .filter(Boolean);

/**
 * Хуваарийн багшийн нэрийг ("Б.Батболд", "Батболд Б", "Батболд") бүртгэлтэй
 * багшийн бүтэн нэртэй тулгана. Ганц тохирол байвал id-г буцаана.
 */
export function matchTeacher(
  name: string,
  teachers: { id: string; fullName: string }[],
) {
  const wanted = nameTokens(name);
  if (!wanted.length) return null;
  const words = wanted.filter((token) => token.length > 1);
  const initials = wanted.filter((token) => token.length === 1);
  if (!words.length) return null;

  const exact = teachers.filter(
    (teacher) => nameTokens(teacher.fullName).join(" ") === wanted.join(" "),
  );
  if (exact.length === 1) return exact[0].id;

  const candidates = teachers.filter((teacher) => {
    const tokens = nameTokens(teacher.fullName);
    return (
      words.every((word) => tokens.includes(word)) &&
      initials.every((initial) =>
        tokens.some(
          (token) => token.startsWith(initial) && !words.includes(token),
        ),
      )
    );
  });
  return candidates.length === 1 ? candidates[0].id : null;
}
