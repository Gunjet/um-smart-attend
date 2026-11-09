import { STATUS } from "./constants";
import { addMinutes, toDateKey } from "./date";
import type {
  AttendanceRecord,
  AttendanceStatus,
  Course,
  Student,
} from "./types";

/**
 * Demo өгөгдөл. Бодит системд эдгээр нь API / өгөгдлийн сангаас ирнэ.
 */

export type RosterEntry = Pick<Student, "id" | "name" | "initials">;

export const CURRENT_TEACHER = {
  name: "Б. Энхтөр",
  firstName: "Энхтөр",
  initials: "БЭ",
};

export const ACADEMIC_YEAR = "2025–2026 ОНЫ ХИЧЭЭЛИЙН ЖИЛ";

export const ROSTER: RosterEntry[] = [
  { id: "22B1NUM0142", name: "Б. Энхжин", initials: "ЭБ" },
  { id: "22B1NUM0087", name: "М. Тэмүүлэн", initials: "ТМ" },
  { id: "22B1NUM0215", name: "С. Номин", initials: "НС" },
  { id: "22B1NUM0119", name: "Д. Анужин", initials: "АД" },
  { id: "22B1NUM0063", name: "Г. Мөнх-Оргил", initials: "МГ" },
  { id: "22B1NUM0184", name: "Н. Билгүүн", initials: "БН" },
  { id: "22B1NUM0208", name: "Ц. Ариунзаяа", initials: "АЦ" },
  { id: "22B1NUM0131", name: "Э. Марал", initials: "МЭ" },
  { id: "22B1NUM0196", name: "Т. Бат-Оргил", initials: "БТ" },
  { id: "22B1NUM0224", name: "О. Саруул", initials: "СО" },
  { id: "22B1NUM0108", name: "Х. Анхбаяр", initials: "АХ" },
  { id: "22B1NUM0167", name: "П. Нандин", initials: "НП" },
  { id: "22B1NUM0230", name: "Ж. Төгөлдөр", initials: "ТЖ" },
  { id: "22B1NUM0095", name: "Л. Энэрэл", initials: "ЭЛ" },
  { id: "22B1NUM0173", name: "Б. Амарсанаа", initials: "АБ" },
  { id: "22B1NUM0241", name: "Д. Хулан", initials: "ХД" },
  { id: "22B1NUM0126", name: "Р. Мөнхжин", initials: "МР" },
  { id: "22B1NUM0189", name: "Ш. Энх-Үжин", initials: "ЭШ" },
  { id: "22B1NUM0203", name: "А. Тэмүүлэн", initials: "ТА" },
  { id: "22B1NUM0112", name: "М. Ариунболд", initials: "АМ" },
  { id: "22B1NUM0256", name: "С. Уянга", initials: "УС" },
  { id: "22B1NUM0158", name: "Н. Билгүүнтөгс", initials: "БН" },
  { id: "22B1NUM0262", name: "Ц. Мишээл", initials: "МЦ" },
  { id: "22B1NUM0079", name: "Г. Бат-Эрдэнэ", initials: "БГ" },
  { id: "22B1NUM0271", name: "З. Солонго", initials: "СЗ" },
  { id: "22B1NUM0284", name: "У. Ихбаяр", initials: "ИУ" },
  { id: "22B1NUM0290", name: "Ч. Номин-Эрдэнэ", initials: "НЧ" },
  { id: "22B1NUM0301", name: "В. Мөнхсайхан", initials: "МВ" },
  { id: "22B1NUM0312", name: "Ё. Ану", initials: "АЁ" },
  { id: "22B1NUM0323", name: "И. Хүслэн", initials: "ХИ" },
  { id: "22B1NUM0331", name: "Д. Ганзориг", initials: "ГД" },
  { id: "22B1NUM0340", name: "Б. Баянзул", initials: "ББ" },
];

export const COURSES: Course[] = [
  {
    title: "Хиймэл оюун ухааны үндэс",
    code: "CS304 · Лекц 02",
    room: "ШУТИС, Е-604",
    time: "09:00 — 10:30",
    enrolled: 24,
  },
  {
    title: "Өгөгдлийн бүтэц",
    code: "CS202 · Лекц 01",
    room: "ШУТИС, Е-502",
    time: "11:00 — 12:30",
    enrolled: 32,
  },
  {
    title: "Програм хангамжийн инженерчлэл",
    code: "CS305 · Семинар 03",
    room: "ШУТИС, Е-411",
    time: "14:00 — 15:30",
    enrolled: 28,
  },
];

/** Хичээл бүрийн хичээллэх гараг (0 = Ням), COURSES-ийн дарааллаар. */
const COURSE_WEEKDAYS = [[1, 3], [2, 4], [5]];

/** Оюутны "Миний ирц" хэсгийн demo үзүүлэлт, COURSES-ийн дарааллаар. */
export const STUDENT_COURSE_HISTORY = [
  { teacher: "Багш Б. Бат-Эрдэнэ", meetings: 14, late: 2, absent: 1 },
  { teacher: "Багш Д. Саруул", meetings: 12, late: 1, absent: 0 },
  { teacher: "Багш О. Тэмүүлэн", meetings: 9, late: 1, absent: 2 },
];

export type StudentProfile = {
  code: string;
  name: string;
  firstName: string;
  initials: string;
};

/** Оюутны кодоор профайл олно. Жагсаалтад байхгүй бол кодыг нь нэр болгоно. */
export function findStudentProfile(code: string): StudentProfile {
  const entry = ROSTER.find((item) => item.id === code);
  if (!entry) {
    return { code, name: code, firstName: code, initials: code.slice(-2) };
  }
  // "Б. Энхжин" → "Энхжин"
  const firstName = entry.name.split(". ").pop() ?? entry.name;
  return { code, name: entry.name, firstName, initials: entry.initials };
}

export function getCourseRoster(course: Course): Student[] {
  return ROSTER.slice(0, course.enrolled).map((entry) => ({
    ...entry,
    time: "—",
    status: STATUS.pending,
  }));
}

export const courseStartTime = (course: Course) =>
  course.time.split("—")[0].trim();

/** Тогтмол (deterministic) псевдо-санамсаргүй тоо, [0, 1). */
function seededRandom(seed: string) {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return ((hash >>> 0) % 10_000) / 10_000;
}

const HISTORY_DAYS = 60;

/** Өнөөдрөөс өмнөх {HISTORY_DAYS} хоногийн demo ирцийн түүх. */
export function buildDemoHistory(today: number): AttendanceRecord[] {
  const records: AttendanceRecord[] = [];
  const base = new Date(today);
  base.setHours(12, 0, 0, 0);

  for (let offset = HISTORY_DAYS; offset >= 1; offset -= 1) {
    const day = new Date(base);
    day.setDate(base.getDate() - offset);
    const date = toDateKey(day.getTime());

    COURSES.forEach((course, courseIndex) => {
      if (!COURSE_WEEKDAYS[courseIndex]?.includes(day.getDay())) return;
      const startTime = courseStartTime(course);

      records.push({
        date,
        courseCode: course.code,
        courseTitle: course.title,
        students: getCourseRoster(course).map((student, studentIndex) => {
          const roll = seededRandom(`${course.code}|${student.id}|${date}`);
          // Зарим оюутан илүү тасалдаг байхаар тохируулна.
          const extraRisk = studentIndex % 9 === 5 ? 0.2 : 0;
          const status: AttendanceStatus =
            roll < 0.05 + extraRisk
              ? STATUS.absent
              : roll < 0.13 + extraRisk
                ? STATUS.late
                : STATUS.present;
          const jitter = Math.floor(roll * 1000);
          const delay =
            status === STATUS.late ? 10 + (jitter % 20) : jitter % 6;
          return {
            ...student,
            status,
            time: status === STATUS.absent ? "—" : addMinutes(startTime, delay),
          };
        }),
      });
    });
  }
  return records;
}
