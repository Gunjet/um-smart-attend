import "server-only";
import { eq } from "drizzle-orm";
import type { CampusSettings } from "../../_lib/geo";
import { getDb, schema } from "../db";

/** Сургуулийн байршил. Тохируулаагүй бол null (байршил шалгахгүй). */
export async function getCampusLocation(): Promise<CampusSettings | null> {
  const [row] = await getDb()
    .select({
      latitude: schema.campusLocation.latitude,
      longitude: schema.campusLocation.longitude,
      radiusM: schema.campusLocation.radiusM,
    })
    .from(schema.campusLocation)
    .where(eq(schema.campusLocation.id, 1))
    .limit(1);
  return row ?? null;
}
