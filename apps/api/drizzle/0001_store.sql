ALTER TYPE "public"."quote_kind" ADD VALUE 'ORDER';--> statement-breakpoint
CREATE TABLE "order_items" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "quote_id" uuid NOT NULL,
  "product_id" uuid,
  "name" text NOT NULL,
  "sku" text,
  "unit_price" integer,
  "quantity" integer DEFAULT 1 NOT NULL,
  "subtotal" integer,
  "sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "store_categories" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "slug" text NOT NULL,
  "name" text NOT NULL,
  "tagline" text,
  "description" text,
  "cover_id" uuid,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "store_categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "store_products" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "slug" text NOT NULL,
  "name" text NOT NULL,
  "category_id" uuid NOT NULL,
  "subcategory" text,
  "brand" text,
  "sku" text,
  "description" text,
  "price" integer,
  "reference_price" integer,
  "unit" text DEFAULT 'unidad' NOT NULL,
  "in_stock" boolean DEFAULT true NOT NULL,
  "featured" boolean DEFAULT false NOT NULL,
  "active" boolean DEFAULT true NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "views" integer DEFAULT 0 NOT NULL,
  "ordered" integer DEFAULT 0 NOT NULL,
  "image_id" uuid,
  "source" text DEFAULT 'manual' NOT NULL,
  "source_id" text,
  "synced_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "store_products_slug_unique" UNIQUE("slug"),
  CONSTRAINT "store_products_source_id_unique" UNIQUE("source_id")
);
--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_quote_id_quotes_id_fk" FOREIGN KEY ("quote_id") REFERENCES "public"."quotes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_product_id_store_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."store_products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "store_categories" ADD CONSTRAINT "store_categories_cover_id_media_id_fk" FOREIGN KEY ("cover_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "store_products" ADD CONSTRAINT "store_products_category_id_store_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."store_categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "store_products" ADD CONSTRAINT "store_products_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "order_items_quote_idx" ON "order_items" USING btree ("quote_id");--> statement-breakpoint
CREATE INDEX "store_products_category_idx" ON "store_products" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "store_products_active_idx" ON "store_products" USING btree ("active","sort_order");