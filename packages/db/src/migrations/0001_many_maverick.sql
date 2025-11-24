CREATE TYPE "public"."document_type" AS ENUM('EXTENSION', 'CRAWLED_URL', 'FILE', 'YOUTUBE_VIDEO');--> statement-breakpoint
CREATE TABLE "document" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"document_type" "document_type" NOT NULL,
	"document_metadata" jsonb,
	"content" text NOT NULL,
	"content_hash" text NOT NULL,
	"unique_identifier_hash" text NOT NULL,
	"space_id" text NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"deleted_at" timestamp,
	CONSTRAINT "document_content_hash_unique" UNIQUE("content_hash"),
	CONSTRAINT "document_unique_identifier_hash_unique" UNIQUE("unique_identifier_hash")
);
--> statement-breakpoint
CREATE TABLE "space" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"deleted_at" timestamp,
	"user_id" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "document" ADD CONSTRAINT "document_space_id_space_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."space"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "space" ADD CONSTRAINT "space_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "document_title_idx" ON "document" USING btree ("title");--> statement-breakpoint
CREATE INDEX "document_space_id_idx" ON "document" USING btree ("space_id");--> statement-breakpoint
CREATE INDEX "document_type_idx" ON "document" USING btree ("document_type");