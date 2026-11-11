CREATE TYPE "public"."post_audience" AS ENUM('all', 'students', 'teachers');--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "audience" "post_audience" DEFAULT 'all' NOT NULL;