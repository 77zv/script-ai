import { relations } from "drizzle-orm";
import { pgTable, text, timestamp, index } from "drizzle-orm/pg-core";
import { user } from "./auth-schema";

export const videoScript = pgTable(
  "video_script",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    script: text("script"), // Original transcript
    repurposedScript: text("repurposed_script"), // Repurposed script based on backboard.io profile
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("video_script_userId_idx").on(table.userId)]
);

export const videoScriptRelations = relations(videoScript, ({ one }) => ({
  user: one(user, {
    fields: [videoScript.userId],
    references: [user.id],
  }),
}));
