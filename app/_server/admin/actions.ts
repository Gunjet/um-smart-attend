"use server";

import { randomInt } from "node:crypto";
import { eq } from "drizzle-orm";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import * as z from "zod";
import type { AdminActionState } from "../../_lib/admin-types";
import { getCurrentUser } from "../auth/dal";
import { hashPassword } from "../auth/password";
import { getDb, schema } from "../db";

/** Нууц үгийн хамгийн бага урт. */
const MIN_PASSWORD_LENGTH = 6;

const FORBIDDEN: AdminActionState = {
  error: "Энэ үйлдлийг зөвхөн админ хийнэ.",
};
const SERVER_ERROR: AdminActionState = {
  error: "Сервертэй холбогдож чадсангүй. Дахин оролдоно уу.",
};

const fullNameSchema = z
  .string()
  .trim()
  .min(2, { error: "Овог нэрээ бүтэн оруулна уу." })
  .max(100, { error: "Нэр хэт урт байна." });
const emailSchema = z
  .email({ error: "Имэйл хаяг буруу байна." })
  .trim()
  .toLowerCase();
const studentCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z0-9][A-Z0-9-]{2,19}$/, {
    error: "Оюутны код зөвхөн латин үсэг, тоо, зураасаас бүрдэнэ.",
  });
const optionalPasswordSchema = z
  .string()
  .max(128, { error: "Нууц үг хэт урт байна." })
  .refine((value) => value === "" || value.length >= MIN_PASSWORD_LENGTH, {
    error: `Нууц үг дор хаяж ${MIN_PASSWORD_LENGTH} тэмдэгт байна.`,
  });

/**
 * Session байхгүй (дууссан/устсан) бол нэвтрэх хуудас руу буцаана,
 * админ биш бол алдаа, админ бол хэрэглэгчийг буцаана.
 */
async function authorizeAdmin() {
  const user = await getCurrentUser();
  if (!user) redirect("/");
  return user.role === "admin" ? user : null;
}

/** Андуурагдах тэмдэгтгүй (0/O, 1/l/I) санамсаргүй нууц үг. */
function generatePassword(length = 10) {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  return Array.from(
    { length },
    () => alphabet[randomInt(alphabet.length)],
  ).join("");
}

function isUniqueViolation(error: unknown) {
  const cause = (error as { cause?: { code?: string } })?.cause;
  return (
    cause?.code === "23505" || (error as { code?: string })?.code === "23505"
  );
}

const field = (formData: FormData, name: string) =>
  String(formData.get(name) ?? "");

/* ----------------------------- Хэрэглэгч нэмэх ----------------------------- */

const CreateSchema = z.object({
  role: z.enum(["admin", "teacher", "student"]),
  fullName: fullNameSchema,
  identifier: z.string(),
  password: optionalPasswordSchema,
});

export async function createUser(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  if (!(await authorizeAdmin())) return FORBIDDEN;

  const parsed = CreateSchema.safeParse({
    role: field(formData, "role"),
    fullName: field(formData, "fullName"),
    identifier: field(formData, "identifier"),
    password: field(formData, "password"),
  });
  if (!parsed.success) return fieldErrorsOf(parsed.error);

  const { role, fullName, password } = parsed.data;
  const identifier = (
    role === "student" ? studentCodeSchema : emailSchema
  ).safeParse(parsed.data.identifier);
  if (!identifier.success) {
    return { fieldErrors: { identifier: identifier.error.issues[0]?.message } };
  }

  const finalPassword = password || generatePassword();
  try {
    await getDb()
      .insert(schema.users)
      .values({
        role,
        fullName,
        email: role === "student" ? null : identifier.data,
        studentCode: role === "student" ? identifier.data : null,
        passwordHash: await hashPassword(finalPassword),
      });
  } catch (error) {
    if (isUniqueViolation(error)) {
      return {
        fieldErrors: {
          identifier:
            role === "student"
              ? "Энэ оюутны код бүртгэлтэй байна."
              : "Энэ имэйл бүртгэлтэй байна.",
        },
      };
    }
    console.error("createUser failed", error);
    return SERVER_ERROR;
  }

  refresh();
  return {
    ok: true,
    message: `${fullName} бүртгэгдлээ.`,
    generatedPassword: password ? undefined : finalPassword,
  };
}

/* ------------------------------- Мэдээлэл засах ------------------------------ */

export async function updateUser(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  if (!(await authorizeAdmin())) return FORBIDDEN;

  const id = field(formData, "id");
  const fullName = fullNameSchema.safeParse(field(formData, "fullName"));
  if (!fullName.success) {
    return { fieldErrors: { fullName: fullName.error.issues[0]?.message } };
  }

  try {
    const db = getDb();
    const [user] = await db
      .select({ role: schema.users.role })
      .from(schema.users)
      .where(eq(schema.users.id, id))
      .limit(1);
    if (!user) return { error: "Хэрэглэгч олдсонгүй." };

    const identifier = (
      user.role === "student" ? studentCodeSchema : emailSchema
    ).safeParse(field(formData, "identifier"));
    if (!identifier.success) {
      return {
        fieldErrors: { identifier: identifier.error.issues[0]?.message },
      };
    }

    await db
      .update(schema.users)
      .set({
        fullName: fullName.data,
        ...(user.role === "student"
          ? { studentCode: identifier.data }
          : { email: identifier.data }),
        updatedAt: new Date(),
      })
      .where(eq(schema.users.id, id));
  } catch (error) {
    if (isUniqueViolation(error)) {
      return {
        fieldErrors: {
          identifier: "Энэ нэвтрэх нэр өөр хэрэглэгчид бүртгэлтэй.",
        },
      };
    }
    console.error("updateUser failed", error);
    return SERVER_ERROR;
  }

  refresh();
  return { ok: true, message: "Мэдээлэл хадгалагдлаа." };
}

/* ------------------------------- Нууц үг шинэчлэх ----------------------------- */

export async function resetPassword(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  if (!(await authorizeAdmin())) return FORBIDDEN;

  const id = field(formData, "id");
  const password = optionalPasswordSchema.safeParse(
    field(formData, "password"),
  );
  if (!password.success) {
    return { fieldErrors: { password: password.error.issues[0]?.message } };
  }
  const finalPassword = password.data || generatePassword();

  try {
    const db = getDb();
    const updated = await db
      .update(schema.users)
      .set({
        passwordHash: await hashPassword(finalPassword),
        updatedAt: new Date(),
      })
      .where(eq(schema.users.id, id))
      .returning({ id: schema.users.id });
    if (!updated.length) return { error: "Хэрэглэгч олдсонгүй." };
    // Хуучин нууц үгээр нэвтэрсэн бүх session-ийг хаана.
    await db.delete(schema.sessions).where(eq(schema.sessions.userId, id));
  } catch (error) {
    console.error("resetPassword failed", error);
    return SERVER_ERROR;
  }

  refresh();
  return {
    ok: true,
    message: "Нууц үг шинэчлэгдлээ.",
    generatedPassword: password.data ? undefined : finalPassword,
  };
}

/* --------------------------- Төхөөрөмж чөлөөлөх ---------------------------- */

export async function releaseDevice(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  if (!(await authorizeAdmin())) return FORBIDDEN;
  const id = field(formData, "id");
  try {
    const db = getDb();
    await db
      .update(schema.users)
      .set({ deviceIdHash: null, deviceBoundAt: null, updatedAt: new Date() })
      .where(eq(schema.users.id, id));
    await db.delete(schema.sessions).where(eq(schema.sessions.userId, id));
  } catch (error) {
    console.error("releaseDevice failed", error);
    return SERVER_ERROR;
  }
  refresh();
  return {
    ok: true,
    message:
      "Төхөөрөмж чөлөөлөгдлөө. Оюутан шинэ төхөөрөмжөөсөө нэвтэрч болно.",
  };
}

/* --------------------------------- Устгах ---------------------------------- */

export async function deleteUser(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const admin = await authorizeAdmin();
  if (!admin) return FORBIDDEN;
  const id = field(formData, "id");
  if (id === admin.id) return { error: "Өөрийн бүртгэлийг устгах боломжгүй." };
  try {
    await getDb().delete(schema.users).where(eq(schema.users.id, id));
  } catch (error) {
    console.error("deleteUser failed", error);
    return SERVER_ERROR;
  }
  refresh();
  return { ok: true, message: "Хэрэглэгч устгагдлаа." };
}

/* -------------------------- Оюутныг CSV-ээр оруулах -------------------------- */

const MAX_IMPORT_ROWS = 2000;

export async function importStudents(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  if (!(await authorizeAdmin())) return FORBIDDEN;

  const password = z
    .string()
    .min(MIN_PASSWORD_LENGTH, {
      error: `Анхны нууц үг дор хаяж ${MIN_PASSWORD_LENGTH} тэмдэгт байна.`,
    })
    .max(128)
    .safeParse(field(formData, "password"));
  if (!password.success) {
    return { fieldErrors: { password: password.error.issues[0]?.message } };
  }

  const lines = field(formData, "csv")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (!lines.length)
    return { fieldErrors: { csv: "Оюутны жагсаалт хоосон байна." } };
  if (lines.length > MAX_IMPORT_ROWS) {
    return {
      fieldErrors: {
        csv: `Нэг удаад ${MAX_IMPORT_ROWS}-аас ихгүй мөр оруулна.`,
      },
    };
  }

  const rows: { studentCode: string; fullName: string }[] = [];
  const invalidLines: number[] = [];
  const seen = new Set<string>();
  lines.forEach((line, index) => {
    const [rawCode = "", ...nameParts] = line
      .split(/[,;\t]/)
      .map((cell) => cell.trim());
    const code = studentCodeSchema.safeParse(rawCode.replace(/^"|"$/g, ""));
    const name = fullNameSchema.safeParse(
      nameParts.join(" ").replace(/^"|"$/g, ""),
    );
    // Эхний мөр гарчиг байж болно ("код,нэр").
    if (index === 0 && !code.success) return;
    if (!code.success || !name.success) {
      invalidLines.push(index + 1);
      return;
    }
    if (seen.has(code.data)) return;
    seen.add(code.data);
    rows.push({ studentCode: code.data, fullName: name.data });
  });

  if (!rows.length) {
    return {
      fieldErrors: {
        csv: "Зөв мөр олдсонгүй. Мөр бүр «оюутны код, овог нэр» хэлбэртэй байна.",
      },
    };
  }

  let added = 0;
  try {
    const passwordHash = await hashPassword(password.data);
    const inserted = await getDb()
      .insert(schema.users)
      .values(
        rows.map((row) => ({ role: "student" as const, passwordHash, ...row })),
      )
      .onConflictDoNothing()
      .returning({ id: schema.users.id });
    added = inserted.length;
  } catch (error) {
    console.error("importStudents failed", error);
    return SERVER_ERROR;
  }

  refresh();
  const skipped = rows.length - added;
  const parts = [`${added} оюутан нэмэгдлээ.`];
  if (skipped) parts.push(`${skipped} нь өмнө бүртгэлтэй байсан тул алгаслаа.`);
  if (invalidLines.length) {
    parts.push(
      `Буруу хэлбэртэй мөр: ${invalidLines.slice(0, 10).join(", ")}${invalidLines.length > 10 ? "…" : ""}.`,
    );
  }
  return { ok: true, message: parts.join(" ") };
}

function fieldErrorsOf(error: z.ZodError): AdminActionState {
  const fields = z.flattenError(error).fieldErrors as Record<
    string,
    string[] | undefined
  >;
  return {
    fieldErrors: {
      fullName: fields.fullName?.[0],
      identifier: fields.identifier?.[0],
      password: fields.password?.[0],
    },
  };
}
