CREATE TYPE "public"."message_role" AS ENUM('user', 'assistant');--> statement-breakpoint
CREATE TABLE "citation" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "citation_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"message_id" integer NOT NULL,
	"chunk_id" integer NOT NULL,
	"relevance_score" real NOT NULL,
	"excerpt" text NOT NULL,
	"citation_index" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "conversation" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text,
	"space_id" text NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "message" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "message_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"conversation_id" text NOT NULL,
	"role" "message_role" NOT NULL,
	"content" text NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "citation" ADD CONSTRAINT "citation_message_id_message_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."message"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "citation" ADD CONSTRAINT "citation_chunk_id_document_chunk_id_fk" FOREIGN KEY ("chunk_id") REFERENCES "public"."document_chunk"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation" ADD CONSTRAINT "conversation_space_id_space_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."space"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation" ADD CONSTRAINT "conversation_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message" ADD CONSTRAINT "message_conversation_id_conversation_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversation"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "citation_message_id_idx" ON "citation" USING btree ("message_id");--> statement-breakpoint
CREATE INDEX "citation_chunk_id_idx" ON "citation" USING btree ("chunk_id");--> statement-breakpoint
CREATE INDEX "conversation_space_id_idx" ON "conversation" USING btree ("space_id");--> statement-breakpoint
CREATE INDEX "conversation_user_id_idx" ON "conversation" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "conversation_updated_at_idx" ON "conversation" USING btree ("updated_at");--> statement-breakpoint
CREATE INDEX "message_conversation_id_idx" ON "message" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "message_created_at_idx" ON "message" USING btree ("created_at");