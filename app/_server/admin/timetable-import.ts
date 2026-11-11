"use server";

import ExcelJS from "exceljs";
import { eq, inArray } from "drizzle-orm";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import * as z from "zod";
import type { AdminActionState } from "../../_lib/admin-types";
import { formatSlots } from "../../_lib/schedule";
import {
  matchTeacher,
  parseTimetable,
  TimetableFormatError,
} from "../../_lib/timetable-import";
import { getCurrentUser } from "../auth/dal";
import { syncCourseGroups } from "../courses/enrollment-sync";
import { getDb, schema } from "../db";

const { courses, users } = schema;

const MAX_FILE_BYTES = 3 * 1024 * 1024;
const MAX_COURSES = 300;

const dateSchema = z.iso.date({ error: "Огноогоо сонгоно уу." });

/** Ажлын хуудас бүрийг мөр × багана текст болгоно (нэгтгэсэн нүдийг дэлгэнэ). */
async function readWorkbook(buffer: ArrayBuffer) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  return workbook.worksheets.map((sheet) => {
    const rows: string[][] = [];
    for (let r = 1; r <= sheet.rowCount; r++) {
      const row: string[] = [];
      for (let c = 1; c <= sheet.columnCount; c++) {
        const cell = sheet.getCell(r, c);
        const source = cell.isMerged ? cell.master : cell;
        let text = "";
        try {
          text = source.text ?? "";
        } catch {
          text = String(source.value ?? "");
        }
        row.push(text);
      }
      rows.push(row);
    }
    return rows;
  });
}

/**
 * Хичээлийн хуваарийн Excel-ийг оруулна.
 * `intent=preview` — задлаад юу өөрчлөгдөхийг харуулна (хадгалахгүй).
 * `intent=apply` — кодоор нь хичээлүүдийг үүсгэж/шинэчилж, ангийн оюутнуудыг бүртгэнэ.
 * Хуваарьт байхгүй хуучин хичээлүүдэд хүрэхгүй.
 */
export async function importTimetable(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const user = await getCurrentUser();
  if (!user) redirect("/");
  if (user.role !== "admin") {
    return { error: "Энэ үйлдлийг зөвхөн админ хийнэ." };
  }

  const apply = formData.get("intent") === "apply";
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { importErrors: { file: "Excel файлаа сонгоно уу." } };
  }
  if (/\.xls$/i.test(file.name)) {
    return {
      importErrors: {
        file: "Хуучин .xls файл байна. Excel-ээс «Save As → .xlsx» хийгээд оруулна уу.",
      },
    };
  }
  if (file.size > MAX_FILE_BYTES) {
    return { importErrors: { file: "Файл 3MB-аас их байна." } };
  }

  const startDate = dateSchema.safeParse(
    String(formData.get("startDate") ?? ""),
  );
  const endDate = dateSchema.safeParse(String(formData.get("endDate") ?? ""));
  const dateErrors: NonNullable<AdminActionState>["importErrors"] = {};
  if (apply || formData.get("startDate") || formData.get("endDate")) {
    if (!startDate.success) dateErrors.startDate = "Эхлэх огноог сонгоно уу.";
    if (!endDate.success) dateErrors.endDate = "Дуусах огноог сонгоно уу.";
    else if (startDate.success && startDate.data > endDate.data) {
      dateErrors.endDate = "Дуусах огноо эхлэх огнооноос хойш байна.";
    }
  }
  const hasDateErrors = Object.keys(dateErrors).length > 0;

  let parsed;
  try {
    parsed = parseTimetable(await readWorkbook(await file.arrayBuffer()));
  } catch (error) {
    if (error instanceof TimetableFormatError) {
      return { importErrors: { file: error.message } };
    }
    console.warn("importTimetable: unreadable file", error);
    return {
      importErrors: {
        file: "Файлыг уншиж чадсангүй. Excel (.xlsx) файл эсэхийг шалгана уу.",
      },
    };
  }
  if (!parsed.courses.length) {
    return {
      importErrors: { file: "Файлаас хичээл олдсонгүй." },
      importPreview: { courses: [], warnings: parsed.warnings },
    };
  }
  if (parsed.courses.length > MAX_COURSES) {
    return { importErrors: { file: "Хичээл хэт олон байна." } };
  }

  try {
    const db = getDb();
    const [teachers, existing] = await Promise.all([
      db
        .select({ id: users.id, fullName: users.fullName })
        .from(users)
        .where(eq(users.role, "teacher")),
      db
        .select({
          id: courses.id,
          code: courses.code,
          classGroups: courses.classGroups,
        })
        .from(courses)
        .where(
          inArray(
            courses.code,
            parsed.courses.map((course) => course.code),
          ),
        ),
    ]);
    const existingByCode = new Map(existing.map((row) => [row.code, row]));
    const items = parsed.courses.map((course) => ({
      ...course,
      teacherId: matchTeacher(course.teacherName, teachers),
      existing: existingByCode.get(course.code) ?? null,
    }));

    if (!apply || hasDateErrors) {
      return {
        ...(hasDateErrors ? { importErrors: dateErrors } : {}),
        importPreview: {
          courses: items.map((item) => ({
            code: item.code,
            title: item.title,
            classGroups: item.classGroups,
            schedule: formatSlots(item.slots),
            teacherName: item.teacherName,
            teacherMatched: item.teacherId !== null,
            exists: item.existing !== null,
          })),
          warnings: parsed.warnings,
        },
      };
    }

    const dates = { startDate: startDate.data!, endDate: endDate.data! };
    await db.transaction(async (tx) => {
      for (const item of items) {
        const values = {
          title: item.title,
          classGroups: item.classGroups,
          slots: item.slots,
          ...dates,
        };
        if (item.existing) {
          await tx
            .update(courses)
            .set({
              ...values,
              // Багш танигдаагүй бол өмнөх багшийг хэвээр үлдээнэ.
              ...(item.teacherId ? { teacherId: item.teacherId } : {}),
            })
            .where(eq(courses.id, item.existing.id));
          await syncCourseGroups(
            tx,
            item.existing.id,
            item.existing.classGroups,
            item.classGroups,
          );
        } else {
          const [created] = await tx
            .insert(courses)
            .values({ ...values, code: item.code, teacherId: item.teacherId })
            .returning({ id: courses.id });
          await syncCourseGroups(tx, created.id, [], item.classGroups);
        }
      }
    });

    refresh();
    const added = items.filter((item) => !item.existing).length;
    const updated = items.length - added;
    return {
      ok: true,
      message: `Хуваарь шинэчлэгдлээ: ${added} шинэ, ${updated} шинэчилсэн хичээл.`,
    };
  } catch (error) {
    console.error("importTimetable failed", error);
    return { error: "Сервертэй холбогдож чадсангүй. Дахин оролдоно уу." };
  }
}
