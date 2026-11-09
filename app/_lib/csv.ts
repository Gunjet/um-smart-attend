import type { CourseAttendanceReport } from "./attendance";
import { formatMonthKey } from "./date";

function cell(value: string | number) {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

const row = (values: (string | number)[]) => values.map(cell).join(",");

export function reportsToCsv(
  reports: CourseAttendanceReport[],
  monthKey: string,
) {
  const lines: string[] = [];
  for (const report of reports) {
    lines.push(
      row([report.course.title, report.course.code, formatMonthKey(monthKey)]),
      row(["Оюутан", "Оюутны код", ...report.dates]),
      ...report.rows.map((item) =>
        row([
          item.student.name,
          item.student.id,
          ...report.dates.map((date) => item.statusByDate[date] ?? ""),
        ]),
      ),
      "",
    );
  }
  return lines.join("\n");
}

/** UTF-8 BOM-той тул Excel кирилл үсгийг зөв уншина. */
export function downloadCsv(content: string, fileName: string) {
  const blob = new Blob(["﻿" + content], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}
