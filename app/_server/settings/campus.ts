import "server-only";
import { asc } from "drizzle-orm";
import type { CampusSite } from "../../_lib/geo";
import { getDb, schema } from "../db";

/** Сургуулийн байрууд. Хоосон бол байршил шалгахгүй. */
export async function getCampusSites(): Promise<CampusSite[]> {
  return getDb()
    .select({
      id: schema.campusSites.id,
      name: schema.campusSites.name,
      latitude: schema.campusSites.latitude,
      longitude: schema.campusSites.longitude,
      radiusM: schema.campusSites.radiusM,
    })
    .from(schema.campusSites)
    .orderBy(asc(schema.campusSites.createdAt));
}
