import { conversation, db, message } from "@hocbaichua-v0/db";
import { TRPCError } from "@trpc/server";
import { and, desc, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";
import { protectedProcedure, router } from "../index";

/**
 * Conversation router
 * Handles CRUD operations for Q&A conversations
 */
export const conversationRouter = router({
  /**
   * Create a new conversation within a space
   */
  create: protectedProcedure
    .input(
      z.object({
        spaceId: z.string(),
        title: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.session.user.id;

      // Verify user has access to the space
      const space = await db.query.space.findFirst({
        where: (space, { eq, and }) =>
          and(eq(space.id, input.spaceId), eq(space.userId, userId)),
      });

      if (!space) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Space not found or access denied",
        });
      }

      // Create conversation
      const [newConversation] = await db
        .insert(conversation)
        .values({
          id: nanoid(),
          spaceId: input.spaceId,
          userId,
          title: input.title ?? null,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      return newConversation;
    }),

  /**
   * List conversations for the current user
   * Optionally filter by space
   */
  list: protectedProcedure
    .input(
      z.object({
        spaceId: z.string().optional(),
        limit: z.number().min(1).max(100).default(20),
        cursor: z.string().optional(), // Conversation ID for pagination
      })
    )
    .query(async ({ input, ctx }) => {
      const userId = ctx.session.user.id;

      const conditions = [eq(conversation.userId, userId)];

      if (input.spaceId) {
        conditions.push(eq(conversation.spaceId, input.spaceId));
      }

      const conversations = await db.query.conversation.findMany({
        where: and(...conditions),
        orderBy: [desc(conversation.updatedAt)],
        limit: input.limit + 1, // Fetch one extra to determine if there are more
        with: {
          messages: {
            orderBy: [desc(message.createdAt)],
            limit: 1, // Just get the latest message for preview
          },
        },
      });

      let nextCursor: string | undefined;
      if (conversations.length > input.limit) {
        const nextItem = conversations.pop();
        nextCursor = nextItem?.id;
      }

      return {
        conversations,
        nextCursor,
      };
    }),

  /**
   * Get a single conversation with all messages
   */
  get: protectedProcedure
    .input(
      z.object({
        conversationId: z.string(),
      })
    )
    .query(async ({ input, ctx }) => {
      const userId = ctx.session.user.id;

      const conv = await db.query.conversation.findFirst({
        where: and(
          eq(conversation.id, input.conversationId),
          eq(conversation.userId, userId)
        ),
        with: {
          space: true,
          messages: {
            orderBy: [desc(message.createdAt)],
          },
        },
      });

      if (!conv) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Conversation not found",
        });
      }

      return conv;
    }),

  /**
   * Delete a conversation and all its messages
   */
  delete: protectedProcedure
    .input(
      z.object({
        conversationId: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.session.user.id;

      // Verify ownership
      const conv = await db.query.conversation.findFirst({
        where: and(
          eq(conversation.id, input.conversationId),
          eq(conversation.userId, userId)
        ),
      });

      if (!conv) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Conversation not found",
        });
      }

      // Delete conversation (cascade will handle messages and citations)
      await db
        .delete(conversation)
        .where(eq(conversation.id, input.conversationId));

      return {
        success: true,
        deletedId: input.conversationId,
      };
    }),
});
