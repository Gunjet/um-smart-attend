import "server-only";
import { and, arrayContains, eq, inArray, not } from "drizzle-orm";
import { getDb, schema } from "../db";

const { courses, enrollments, users } = schema;

type Tx = Parameters<Parameters<ReturnType<typeof getDb>["transaction"]>[0]>[0];

/**
 * Хичээлийн ангиуд өөрчлөгдөхөд:
 * - шинээр нэмэгдсэн ангийн оюутнуудыг хичээлд бүртгэнэ;
 * - хасагдсан ангийн оюутнуудыг хичээлээс хасна.
 * Өөрчлөгдөөгүй ангиудад админы гараар хийсэн нэмэх/хасах хэвээр үлдэнэ.
 */
export async function syncCourseGroups(
  tx: Tx,
  courseId: string,
  before: string[],
  after: string[],
) {
  const added = after.filter((group) => !before.includes(group));
  const removed = before.filter((group) => !after.includes(group));

  if (removed.length) {
    await tx
      .delete(enrollments)
      .where(
        and(
          eq(enrollments.courseId, courseId),
          inArray(
            enrollments.studentId,
            tx
              .select({ id: users.id })
              .from(users)
              .where(inArray(users.classGroup, removed)),
          ),
        ),
      );
  }

  if (added.length) {
    const students = await tx
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.role, "student"), inArray(users.classGroup, added)));
    if (students.length) {
      await tx
        .insert(enrollments)
        .values(students.map(({ id }) => ({ courseId, studentId: id })))
        .onConflictDoNothing();
    }
  }
}

/**
 * Оюутны анги өөрчлөгдөхөд хуучин ангийн хичээлүүдээс хасаж,
 * шинэ ангийн хичээлүүдэд бүртгэнэ.
 */
export async function syncStudentGroup(
  tx: Tx,
  studentId: string,
  before: string | null,
  after: string | null,
) {
  if (before === after) return;

  if (before) {
    const stale = tx
      .select({ id: courses.id })
      .from(courses)
      .where(
        and(
          arrayContains(courses.classGroups, [before]),
          after ? not(arrayContains(courses.classGroups, [after])) : undefined,
        ),
      );
    await tx
      .delete(enrollments)
      .where(
        and(
          eq(enrollments.studentId, studentId),
          inArray(enrollments.courseId, stale),
        ),
      );
  }

  if (after) {
    const target = await tx
      .select({ id: courses.id })
      .from(courses)
      .where(and(arrayContains(courses.classGroups, [after])));
    if (target.length) {
      await tx
        .insert(enrollments)
        .values(target.map(({ id }) => ({ courseId: id, studentId })))
        .onConflictDoNothing();
    }
  }
}
