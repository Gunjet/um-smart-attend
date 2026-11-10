CREATE TABLE "campus_sites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"latitude" double precision NOT NULL,
	"longitude" double precision NOT NULL,
	"radius_m" integer DEFAULT 150 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "campus_sites_radius" CHECK ("campus_sites"."radius_m" between 20 and 5000)
);
--> statement-breakpoint
-- Хуучин ганц байршлыг шинэ хүснэгт рүү шилжүүлнэ.
INSERT INTO "campus_sites" ("name", "latitude", "longitude", "radius_m")
SELECT 'Үндсэн байр', "latitude", "longitude", "radius_m" FROM "campus_location";
