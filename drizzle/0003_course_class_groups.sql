ALTER TABLE "courses" ADD COLUMN "class_groups" text[] DEFAULT '{}'::text[] NOT NULL;--> statement-breakpoint
-- Хуучин "room" нь шинэ ангийн жагсаалтын нэг байвал шилжүүлнэ.
UPDATE "courses" SET "class_groups" = ARRAY["room"]
WHERE "room" ~ '^(МТ|ЦИ|УУАТ|ГТИ)-[1-4]$';
