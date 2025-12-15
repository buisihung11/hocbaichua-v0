// biome-ignore-all lint/performance/noBarrelFile: This is an intentional barrel export for the db schema
export { account, session, user } from "./auth";
export {
  accountRelations,
  documentChunkRelations,
  documentRelations,
  sessionRelations,
  spaceRelations,
  userRelations,
} from "./relations";
export {
  document,
  documentChunk,
  documentStatusEnum,
  documentTypeEnum,
  space,
} from "./space";
