CREATE TABLE "community_devotionals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"publish_date" date NOT NULL,
	"title" text NOT NULL,
	"subtitle" text,
	"passage_reference" text NOT NULL,
	"passage_context" text,
	"study_notes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"reflection_q1" text NOT NULL,
	"reflection_q2" text NOT NULL,
	"prayer_prompt" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"created_by_user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "community_devotionals_publish_date_unique" UNIQUE("publish_date")
);
--> statement-breakpoint
CREATE TABLE "community_reactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"response_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"reaction_type" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "community_reactions_unique" UNIQUE("response_id","user_id","reaction_type")
);
--> statement-breakpoint
CREATE TABLE "community_responses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"community_devotional_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"response1" text,
	"response2" text,
	"prayer" text,
	"q1_private" boolean DEFAULT false NOT NULL,
	"q2_private" boolean DEFAULT false NOT NULL,
	"prayer_private" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "community_responses_unique" UNIQUE("community_devotional_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "devotional_days" ADD COLUMN "passage_context" text;--> statement-breakpoint
ALTER TABLE "community_reactions" ADD CONSTRAINT "community_reactions_response_id_community_responses_id_fk" FOREIGN KEY ("response_id") REFERENCES "public"."community_responses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_responses" ADD CONSTRAINT "community_responses_community_devotional_id_community_devotionals_id_fk" FOREIGN KEY ("community_devotional_id") REFERENCES "public"."community_devotionals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_community_devotionals_status_date" ON "community_devotionals" USING btree ("status","publish_date");--> statement-breakpoint
CREATE INDEX "idx_community_reactions_response" ON "community_reactions" USING btree ("response_id");--> statement-breakpoint
CREATE INDEX "idx_community_responses_devotional" ON "community_responses" USING btree ("community_devotional_id");