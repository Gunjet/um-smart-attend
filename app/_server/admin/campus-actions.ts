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

const CampusSchema = z.object({
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

export async function saveCampusLocation(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  if (!(await authorizeAdmin())) return FORBIDDEN;

  const raw = {
    latitude: field(formData, "latitude"),
    longitude: field(formData, "longitude"),
    radiusM: field(formData, "radiusM"),
  };
  if (!raw.latitude || !raw.longitude) {
    return {
      campusErrors: { latitude: "Сургуулийн байршлаа оруулна уу." },
    };
  }
  const parsed = CampusSchema.safeParse(raw);
  if (!parsed.success) {
    const fields = z.flattenError(parsed.error).fieldErrors;
    return {
      campusErrors: {
        latitude: fields.latitude?.[0],
        longitude: fields.longitude?.[0],
        radiusM: fields.radiusM?.[0],
      },
    };
  }

  try {
    await getDb()
      .insert(schema.campusLocation)
      .values({ id: 1, ...parsed.data })
      .onConflictDoUpdate({
        target: schema.campusLocation.id,
        set: { ...parsed.data, updatedAt: new Date() },
      });
  } catch (error) {
    console.error("saveCampusLocation failed", error);
    return SERVER_ERROR;
  }
  refresh();
  return { ok: true, message: "Сургуулийн байршил хадгалагдлаа." };
}

/** Байршлын шалгалтыг унтраана (тохиргоог устгана). */
export async function clearCampusLocation(): Promise<AdminActionState> {
  if (!(await authorizeAdmin())) return FORBIDDEN;
  try {
    await getDb()
      .delete(schema.campusLocation)
      .where(eq(schema.campusLocation.id, 1));
  } catch (error) {
    console.error("clearCampusLocation failed", error);
    return SERVER_ERROR;
  }
  refresh();
  return { ok: true, message: "Байршлын шалгалт унтарлаа." };
}
