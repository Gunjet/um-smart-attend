"use server";

import { and, eq, inArray, notInArray } from "drizzle-orm";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import * as z from "zod";
import type { AdminActionState } from "../../_lib/admin-types";
import { CLASS_GROUPS, sortClassGroups } from "../../_lib/programs";
import { PERIODS, sortSlots } from "../../_lib/schedule";
import { getCurrentUser } from "../auth/dal";
import { syncCourseGroups } from "../courses/enrollment-sync";
import { getDb, schema } from "../db";

const { courses, enrollments, users } = schema;

const FORBIDDEN: AdminActionState = {
  error: "Энэ үйлдлийг зөвхөн админ хийнэ.",
};
const SERVER_ERROR: AdminActionState = {
  error: "Сервертэй холбогдож чадсангүй. Дахин оролдоно уу.",
};

async function authorizeAdmin() {
  const user = await getCurrentUser();
  if (!user) redirect("/");
  return user.role === "admin" ? user : null;
}

const field = (formData: FormData, name: string) =>
  String(formData.get(name) ?? "").trim();

const timeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, {
  error: "Цагийг ЦЦ:ММ хэлбэрээр оруулна уу.",
});

const dateSchema = z.iso.date({ error: "Огноогоо сонгоно уу." });

const slotSchema = z
  .object({
    day: z.coerce
      .number()
      .int()
      .min(1, { error: "Гаригаа сонгоно уу." })
      .max(7, { error: "Гаригаа сонгоно уу." }),
    start: timeSchema,
    end: timeSchema,
  })
  .refine(
    (slot) =>
      PERIODS.some(
        (period) => period.start === slot.start && period.end === slot.end,
      ),
    { error: "Параа сонгоно уу." },
  );

const slotsSchema = z
  .array(slotSchema)
  .min(1, { error: "Хичээл орох параа нэмнэ үү." })
  .max(21, { error: "Цаг хэт олон байна." })
  .transform(sortSlots)
  .refine(
    (slots) =>
      slots.every(
        (slot, index) =>
          index === 0 ||
          slots[index - 1].day !== slot.day ||
          slots[index - 1].end <= slot.start,
      ),
    { error: "Нэг гарагт ижил пар давхардсан байна." },
  );

const CourseSchema = z
  .object({
    title: z
      .string()
      .min(2, { error: "Хичээлийн нэрээ оруулна уу." })
      .max(120, { error: "Нэр хэт урт байна." }),
    code: z
      .string()
      .toUpperCase()
      .regex(/^[A-Z0-9][A-Z0-9 .\-]{1,29}$/, {
        error: "Код латин үсэг, тоо, зай, зураасаас бүрдэнэ.",
      }),
    /** Ангиуд: хөтөлбөр + курс, жишээ нь ["МТ-1", "ЦИ-1"]. */
    classGroups: z
      .array(z.enum(CLASS_GROUPS as [string, ...string[]]))
      .min(1, { error: "Ангиа сонгоно уу." }),
    startDate: dateSchema,
    endDate: dateSchema,
    slots: slotsSchema,
    teacherId: z.union([z.literal(""), z.uuid()]),
  })
  .refine((data) => data.startDate <= data.endDate, {
    path: ["endDate"],
    error: "Дуусах огноо эхлэх огнооноос хойш байна.",
  });

type CourseField =
  | "title"
  | "code"
  | "classGroups"
  | "startDate"
  | "endDate"
  | "slots"
  | "teacherId";

function courseFieldErrors(error: z.ZodError): AdminActionState {
  const fields = z.flattenError(error).fieldErrors as Partial<
    Record<CourseField, string[]>
  >;
  return {
    courseErrors: Object.fromEntries(
      Object.entries(fields).map(([key, messages]) => [key, messages?.[0]]),
    ),
  };
}

class CourseNotFound extends Error {}

function isUniqueViolation(error: unknown) {
  const cause = (error as { cause?: { code?: string } })?.cause;
  return cause?.code === "23505";
}

async function assertTeacher(teacherId: string) {
  if (!teacherId) return true;
  const [row] = await getDb()
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.id, teacherId), eq(users.role, "teacher")))
    .limit(1);
  return Boolean(row);
}

/** slotDay / slotStart / slotEnd талбаруудыг мөр мөрөөр нь нийлүүлнэ. */
function readSlots(formData: FormData) {
  const days = formData.getAll("slotDay").map(String);
  const starts = formData.getAll("slotStart").map(String);
  const ends = formData.getAll("slotEnd").map(String);
  return days.map((day, index) => ({
    day,
    start: starts[index] ?? "",
    end: ends[index] ?? "",
  }));
}

/** Хичээл нэмэх (id байхгүй) эсвэл засах (id байгаа). */
export async function saveCourse(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  if (!(await authorizeAdmin())) return FORBIDDEN;

  const parsed = CourseSchema.safeParse({
    title: field(formData, "title"),
    code: field(formData, "code"),
    classGroups: formData.getAll("classGroups").map(String),
    startDate: field(formData, "startDate"),
    endDate: field(formData, "endDate"),
    slots: readSlots(formData),
    teacherId: field(formData, "teacherId"),
  });
  if (!parsed.success) return courseFieldErrors(parsed.error);

  const id = field(formData, "id");
  const { teacherId, ...values } = parsed.data;
  try {
    if (!(await assertTeacher(teacherId))) {
      return { courseErrors: { teacherId: "Багш олдсонгүй." } };
    }
    const row = {
      ...values,
      classGroups: sortClassGroups(values.classGroups),
      teacherId: teacherId || null,
    };
    await getDb().transaction(async (tx) => {
      if (id) {
        const [previous] = await tx
          .select({ classGroups: courses.classGroups })
          .from(courses)
          .where(eq(courses.id, id))
          .for("update");
        if (!previous) throw new CourseNotFound();
        await tx.update(courses).set(row).where(eq(courses.id, id));
        await syncCourseGroups(tx, id, previous.classGroups, row.classGroups);
      } else {
        const [created] = await tx
          .insert(courses)
          .values(row)
          .returning({ id: courses.id });
        await syncCourseGroups(tx, created.id, [], row.classGroups);
      }
    });
  } catch (error) {
    if (error instanceof CourseNotFound) {
      // Өөр газраас устгагдсан бол жагсаалтыг шинэчилнэ.
      refresh();
      return {
        error: "Энэ хичээл устгагдсан байна. Жагсаалт шинэчлэгдлээ.",
      };
    }
    if (isUniqueViolation(error)) {
      return { courseErrors: { code: "Энэ кодтой хичээл бүртгэлтэй байна." } };
    }
    console.error("saveCourse failed", error);
    return SERVER_ERROR;
  }
  refresh();
  return {
    ok: true,
    message: id ? "Хичээл хадгалагдлаа." : `${values.title} хичээл нэмэгдлээ.`,
  };
}

/** Хичээлийг бүрмөсөн устгана (ирцийн түүх, бүртгэл, чөлөөний хүсэлт хамт устна). */
export async function deleteCourse(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  if (!(await authorizeAdmin())) return FORBIDDEN;
  try {
    await getDb()
      .delete(courses)
      .where(eq(courses.id, field(formData, "id")));
  } catch (error) {
    console.error("deleteCourse failed", error);
    return SERVER_ERROR;
  }
  refresh();
  return { ok: true, message: "Хичээл устгагдлаа." };
}

/** Хичээлийн оюутнуудын жагсаалтыг сонгосон оюутнуудаар солино. */
export async function setEnrollments(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  if (!(await authorizeAdmin())) return FORBIDDEN;

  const courseId = field(formData, "courseId");
  const requested = [
    ...new Set(formData.getAll("studentIds").map(String)),
  ].filter((value) => z.uuid().safeParse(value).success);

  try {
    const db = getDb();
    // Зөвхөн жинхэнэ оюутнуудыг бүртгэнэ.
    const studentIds = requested.length
      ? (
          await db
            .select({ id: users.id })
            .from(users)
            .where(and(inArray(users.id, requested), eq(users.role, "student")))
        ).map((row) => row.id)
      : [];

    await db.transaction(async (tx) => {
      await tx
        .delete(enrollments)
        .where(
          studentIds.length
            ? and(
                eq(enrollments.courseId, courseId),
                notInArray(enrollments.studentId, studentIds),
              )
            : eq(enrollments.courseId, courseId),
        );
      if (studentIds.length) {
        await tx
          .insert(enrollments)
          .values(studentIds.map((studentId) => ({ courseId, studentId })))
          .onConflictDoNothing();
      }
    });

    refresh();
    return {
      ok: true,
      message: `${studentIds.length} оюутан хичээлд бүртгэгдлээ.`,
    };
  } catch (error) {
    console.error("setEnrollments failed", error);
    return SERVER_ERROR;
  }
}
