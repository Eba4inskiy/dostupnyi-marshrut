import { sqliteTable, text, real, integer, index, primaryKey } from "drizzle-orm/sqlite-core";
export const reports=sqliteTable("reports",{
 id:text("id").primaryKey(),kind:text("kind").notNull(),title:text("title").notNull(),description:text("description").notNull(),lat:real("lat").notNull(),lng:real("lng").notNull(),role:text("role").notNull(),actor:text("actor").notNull(),photoKey:text("photo_key"),createdAt:text("created_at").notNull(),
},t=>[index("idx_reports_created_at").on(t.createdAt),index("idx_reports_actor_created").on(t.actor,t.createdAt)]);
export const votes=sqliteTable("votes",{reportId:text("report_id").notNull().references(()=>reports.id,{onDelete:"cascade"}),actor:text("actor").notNull(),vote:text("vote").notNull(),createdAt:text("created_at").notNull()},t=>[primaryKey({columns:[t.reportId,t.actor]})]);
