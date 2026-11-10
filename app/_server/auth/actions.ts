"use server";

import { and, eq, inArray } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import * as z from "zod";
import { detectInAppBrowser } from "../../_lib/in-app-browser";
import { getDb, schema } from "../db";
import { getDeviceIdHash } from "./device";
import { verifyPasswordOrDummy } from "./password";
import { createSession, deleteSession } from "./session";

export type LoginState = {
  error?: string;
  fieldErrors?: { identifier?: string; password?: string };
} | null;

const LoginSchema = z.object({
  role: z.enum(["teacher", "student"]),
  identifier: z.string().trim().min(1, { error: "Нэвтрэх нэрээ оруулна уу." }),
  password: z.string().min(1, { error: "Нууц үгээ оруулна уу." }),
});

const INVALID_CREDENTIALS = "Нэвтрэх нэр эсвэл нууц үг буруу байна.";

export async function login(
  _previous: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const parsed = LoginSchema.safeParse({
    role: formData.get("role"),
    identifier: formData.get("identifier"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    const fields = z.flattenError(parsed.error).fieldErrors;
    return {
      fieldErrors: {
        identifier: fields.identifier?.[0],
        password: fields.password?.[0],
      },
    };
  }

  try {
    const error = await authenticate(parsed.data);
    if (error) return { error };
  } catch (cause) {
    console.error("Login failed", cause);
    return {
      error: "Сервертэй холбогдож чадсангүй. Түр хүлээгээд дахин оролдоно уу.",
    };
  }
  // redirect() алдаа шиддэг тул try-ийн гадна дуудна.
  redirect("/");
}

/** Амжилттай бол session үүсгээд undefined, үгүй бол алдааны мессеж буцаана. */
async function authenticate({
  role,
  identifier,
  password,
}: z.infer<typeof LoginSchema>): Promise<string | undefined> {
  const db = getDb();
  const [user] = await db
    .select()
    .from(schema.users)
    .where(
      role === "student"
        ? and(
            eq(schema.users.role, "student"),
            eq(schema.users.studentCode, identifier.toUpperCase()),
          )
        : and(
            inArray(schema.users.role, ["teacher", "admin"]),
            eq(schema.users.email, identifier.toLowerCase()),
          ),
    )
    .limit(1);

  const passwordOk = await verifyPasswordOrDummy(password, user?.passwordHash);
  if (!user || !passwordOk) return INVALID_CREDENTIALS;

  // Оюутан зөвхөн анх нэвтэрсэн төхөөрөмжөөсөө нэвтэрнэ.
  if (user.role === "student") {
    // Апп доторх хөтөч cookie-г мартдаг тул бүртгэлийг тэнд холбохгүй.
    const app = detectInAppBrowser((await headers()).get("user-agent") ?? "");
    if (app) {
      return `${app} доторх хөтчөөс нэвтрэх боломжгүй. Линкийг Safari эсвэл Chrome-оор нээнэ үү.`;
    }
    const deviceHash = await getDeviceIdHash();
    if (user.deviceIdHash && user.deviceIdHash !== deviceHash) {
      return "Энэ бүртгэл өөр төхөөрөмжид холбогдсон байна. Утсаа сольсон бол багш эсвэл админд хандана уу.";
    }
    if (!user.deviceIdHash) {
      await db
        .update(schema.users)
        .set({
          deviceIdHash: deviceHash,
          deviceBoundAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(schema.users.id, user.id));
    }
  }

  await createSession(user.id);
}

export async function logout() {
  await deleteSession();
  redirect("/");
}
