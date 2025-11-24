import { timestamp } from "drizzle-orm/pg-core";
export const timestampColumns = {
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
  deletedAt: timestamp("deleted_at"),
};
