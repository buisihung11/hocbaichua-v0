import "dotenv/config";

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not defined");
}

const client = postgres(connectionString, { prepare: false });
export const db = drizzle(client, {
  schema,
});

export type { IncludeRelation, InferResultType } from "./helpers/schema-type";
export { citation } from "./schema/citation";
export { conversation } from "./schema/conversation";
export { message, messageRoleEnum } from "./schema/message";
export {
  citationRelations,
  conversationRelations,
  documentChunkRelations,
  documentRelations,
  messageRelations,
  spaceRelations,
} from "./schema/relations";
export {
  document,
  documentChunk,
  documentStatusEnum,
  documentTypeEnum,
  space,
} from "./schema/space";
