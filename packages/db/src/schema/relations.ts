import { relations } from "drizzle-orm/relations";
import { account, session, user } from "./auth";
import { citation } from "./citation";
import { conversation } from "./conversation";
import { message } from "./message";
import { document, documentChunk, space } from "./space";

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}));

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
  spaces: many(space),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}));

export const spaceRelations = relations(space, ({ one, many }) => ({
  user: one(user, {
    fields: [space.userId],
    references: [user.id],
  }),
  documents: many(document),
}));

export const documentRelations = relations(document, ({ one, many }) => ({
  space: one(space, {
    fields: [document.spaceId],
    references: [space.id],
  }),
  chunks: many(documentChunk),
}));

export const documentChunkRelations = relations(
  documentChunk,
  ({ one, many }) => ({
    document: one(document, {
      fields: [documentChunk.documentId],
      references: [document.id],
    }),
    citations: many(citation),
  })
);

export const conversationRelations = relations(
  conversation,
  ({ one, many }) => ({
    space: one(space, {
      fields: [conversation.spaceId],
      references: [space.id],
    }),
    user: one(user, {
      fields: [conversation.userId],
      references: [user.id],
    }),
    messages: many(message),
  })
);

export const messageRelations = relations(message, ({ one, many }) => ({
  conversation: one(conversation, {
    fields: [message.conversationId],
    references: [conversation.id],
  }),
  citations: many(citation),
}));

export const citationRelations = relations(citation, ({ one }) => ({
  message: one(message, {
    fields: [citation.messageId],
    references: [message.id],
  }),
  chunk: one(documentChunk, {
    fields: [citation.chunkId],
    references: [documentChunk.id],
  }),
}));
