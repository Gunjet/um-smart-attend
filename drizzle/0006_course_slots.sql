ALTER TABLE "courses" ADD COLUMN "slots" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
-- Хуучин гариг + нэг цагийг гариг бүрийн цаг болгон шилжүүлнэ.
UPDATE "courses" SET "slots" = (
  SELECT coalesce(jsonb_agg(jsonb_build_object('day', d, 'start', "start_time", 'end', "end_time") ORDER BY d), '[]'::jsonb)
  FROM unnest("weekdays") AS d
);
