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

// biome-ignore lint/performance/noBarrelFile: Re-exports are intentional for this shared db package
export {
  documentChunkRelations,
  documentRelations,
  spaceRelations,
} from "./schema/relations";
export {
  document,
  documentChunk,
  documentStatusEnum,
  documentTypeEnum,
  space,
} from "./schema/space";
