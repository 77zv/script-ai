CREATE TABLE "video_script" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"script" text,
	"user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "video_script" ADD CONSTRAINT "video_script_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "video_script_userId_idx" ON "video_script" USING btree ("user_id");