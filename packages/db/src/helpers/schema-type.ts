import type {
  BuildQueryResult,
  DBQueryConfig,
  ExtractTablesWithRelations,
} from "drizzle-orm";
import type * as schema from "../schema";

type Schema = typeof schema;
type TSchema = ExtractTablesWithRelations<Schema>;

/**
 * Type for specifying relations to include in a query for a given table.
 * This extracts the "with" property from DBQueryConfig, allowing you to define
 * which related tables to include in the query result.
 * @template TableName - The name of the table in the schema.
 * @example
 * ```typescript
 * // Assuming 'users' table has a relation to 'posts'
 * type UserWithPosts = IncludeRelation<'users'>;
 * // Use it in a query config: { with: { posts: true } }
 * ```
 */
export type IncludeRelation<TableName extends keyof TSchema> = DBQueryConfig<
  "one" | "many",
  boolean,
  TSchema,
  TSchema[TableName]
>["with"];

/**
 * Infers the result type of a query for a given table, including specified relations.
 * This type helps in typing the return value of database queries that include relations.
 * @template TableName - The name of the table in the schema.
 * @template With - The relations to include, defaults to undefined (no relations).
 * @example
 * ```typescript
 * // Infer result type for 'users' table with 'posts' relation
 * type UserWithPostsResult = InferResultType<'users', { posts: true }>;
 * // Use it to type the result of a query
 * const result: UserWithPostsResult = await db.query.users.findMany({
 *   with: { posts: true }
 * });
 * ```
 */
export type InferResultType<
  TableName extends keyof TSchema,
  With extends IncludeRelation<TableName> | undefined = undefined,
> = BuildQueryResult<
  TSchema,
  TSchema[TableName],
  {
    with: With;
  }
>;
