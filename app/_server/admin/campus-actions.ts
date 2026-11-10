"use server";

import { eq } from "drizzle-orm";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import * as z from "zod";
import type { AdminActionState } from "../../_lib/admin-types";
import { getCurrentUser } from "../auth/dal";
import { getDb, schema } from "../db";

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

const SiteSchema = z.object({
  name: z
    .string()
    .min(2, { error: "Байрны нэрээ оруулна уу." })
    .max(60, { error: "Нэр хэт урт байна." }),
  latitude: z.coerce
    .number({ error: "Өргөрөг тоо байна." })
    .min(-90, { error: "Өргөрөг −90…90 хооронд байна." })
    .max(90, { error: "Өргөрөг −90…90 хооронд байна." }),
  longitude: z.coerce
    .number({ error: "Уртраг тоо байна." })
    .min(-180, { error: "Уртраг −180…180 хооронд байна." })
    .max(180, { error: "Уртраг −180…180 хооронд байна." }),
  radiusM: z.coerce
    .number({ error: "Радиус тоо байна." })
    .int({ error: "Радиус бүхэл тоо байна." })
    .min(20, { error: "Радиус хамгийн багадаа 20 м." })
    .max(5000, { error: "Радиус хамгийн ихдээ 5000 м." }),
});

const field = (formData: FormData, name: string) =>
  String(formData.get(name) ?? "").trim();

/** Сургуулийн байр нэмэх. */
export async function addCampusSite(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  if (!(await authorizeAdmin())) return FORBIDDEN;

  const raw = {
    name: field(formData, "name"),
    latitude: field(formData, "latitude"),
    longitude: field(formData, "longitude"),
    radiusM: field(formData, "radiusM"),
  };
  if (!raw.latitude || !raw.longitude) {
    return { campusErrors: { latitude: "Байршлаа оруулна уу." } };
  }
  const parsed = SiteSchema.safeParse(raw);
  if (!parsed.success) {
    const fields = z.flattenError(parsed.error).fieldErrors;
    return {
      campusErrors: {
        name: fields.name?.[0],
        latitude: fields.latitude?.[0],
        longitude: fields.longitude?.[0],
        radiusM: fields.radiusM?.[0],
      },
    };
  }

  try {
    await getDb().insert(schema.campusSites).values(parsed.data);
  } catch (error) {
    console.error("addCampusSite failed", error);
    return SERVER_ERROR;
  }
  refresh();
  return { ok: true, message: `«${parsed.data.name}» нэмэгдлээ.` };
}

/** Сургуулийн байр хасах. Бүгдийг хасвал байршил шалгахгүй. */
export async function deleteCampusSite(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  if (!(await authorizeAdmin())) return FORBIDDEN;
  try {
    await getDb()
      .delete(schema.campusSites)
      .where(eq(schema.campusSites.id, field(formData, "id")));
  } catch (error) {
    console.error("deleteCampusSite failed", error);
    return SERVER_ERROR;
  }
  refresh();
  return { ok: true, message: "Байр хасагдлаа." };
}
