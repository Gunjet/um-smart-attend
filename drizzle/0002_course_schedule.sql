-- Байгаа хичээлүүдэд түр хугацаа өгөөд default-ыг хасна.
ALTER TABLE "courses" ADD COLUMN "start_date" date NOT NULL DEFAULT current_date;--> statement-breakpoint
ALTER TABLE "courses" ADD COLUMN "end_date" date NOT NULL DEFAULT (current_date + 120);--> statement-breakpoint
ALTER TABLE "courses" ALTER COLUMN "start_date" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "courses" ALTER COLUMN "end_date" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "courses" ADD COLUMN "weekdays" smallint[] DEFAULT '{1,2,3,4,5}'::smallint[] NOT NULL;--> statement-breakpoint
ALTER TABLE "courses" ADD CONSTRAINT "courses_date_range" CHECK ("end_date" >= "start_date");
