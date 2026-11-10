CREATE TABLE "campus_location" (
	"id" smallint PRIMARY KEY DEFAULT 1 NOT NULL,
	"latitude" double precision NOT NULL,
	"longitude" double precision NOT NULL,
	"radius_m" integer DEFAULT 150 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "campus_location_singleton" CHECK ("campus_location"."id" = 1),
	CONSTRAINT "campus_location_radius" CHECK ("campus_location"."radius_m" between 20 and 5000)
);
--> statement-breakpoint
ALTER TABLE "attendance_records" ADD COLUMN "distance_m" integer;--> statement-breakpoint
ALTER TABLE "attendance_records" ADD COLUMN "location_ok" boolean;