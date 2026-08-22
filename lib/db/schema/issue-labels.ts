import { index, pgTable, primaryKey, uuid } from "drizzle-orm/pg-core";
import { issues } from "./issues";
import { labels } from "./labels";

export const issueLabels = pgTable(
  "issue_labels",
  {
    issueId: uuid("issue_id")
      .notNull()
      .references(() => issues.id, { onDelete: "cascade" }),
    labelId: uuid("label_id")
      .notNull()
      .references(() => labels.id, { onDelete: "restrict" }),
  },
  (table) => [
    primaryKey({ columns: [table.issueId, table.labelId] }),
    index("issue_labels_label_idx").on(table.labelId),
  ],
);