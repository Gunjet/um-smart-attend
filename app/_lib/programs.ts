/** ШУТИС Өмнөговь аймаг дахь Технологийн сургуулийн хөтөлбөрүүд. */
export const PROGRAMS = [
  { code: "МТ", name: "Мэдээллийн технологи" },
  { code: "ЦИ", name: "Цахилгаан инженер" },
  { code: "УУАТ", name: "Уул уурхай ашиглалтын технологи" },
  { code: "ГТИ", name: "Газрын тосны инженерчлэл" },
] as const;

export const COURSE_YEARS = [1, 2, 3, 4] as const;

/** "МТ-1" … "ГТИ-4" — хөтөлбөр + курс. */
export const CLASS_GROUPS = PROGRAMS.flatMap((program) =>
  COURSE_YEARS.map((year) => `${program.code}-${year}`),
);

/** Хөтөлбөр, курсийн дарааллаар эрэмбэлнэ. */
export function sortClassGroups(groups: Iterable<string>) {
  const set = new Set(groups);
  return CLASS_GROUPS.filter((group) => set.has(group));
}

/**
 * ["МТ-1", "ЦИ-1", "УУАТ-1", "ГТИ-1", "МТ-2"] → "1-р курс бүгд, МТ-2".
 * Нэг курсийн бүх хөтөлбөр сонгогдсон бол товчилно.
 */
export function formatClassGroups(groups: string[]) {
  const set = new Set(groups);
  const parts: string[] = [];
  for (const year of COURSE_YEARS) {
    const codes = PROGRAMS.map((program) => `${program.code}-${year}`);
    const chosen = codes.filter((code) => set.has(code));
    if (chosen.length === codes.length) parts.push(`${year}-р курс бүгд`);
    else parts.push(...chosen);
  }
  return parts.join(", ");
}
