import {
  citation,
  conversation,
  db,
  type InferResultType,
  message,
} from "@hocbaichua-v0/db";
import { chatModel } from "@hocbaichua-v0/llm";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { TRPCError } from "@trpc/server";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { protectedProcedure, router } from "../index";
import { checkRateLimit } from "../lib/rate-limit";
import { vectorSearch } from "../lib/vector-search";

/**
 * Message router
 * Handles Q&A message operations with LangChain streaming
 */
export const messageRouter = router({
  /**
   * Ask a question with streaming AI response
   */
  ask: protectedProcedure
    .use(async ({ ctx, next }) => {
      const rateLimitResult = await checkRateLimit(ctx.session.user.id);
      if (!rateLimitResult.success) {
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: `Rate limit exceeded. Try again in ${Math.ceil((rateLimitResult.reset - Date.now()) / 1000)} seconds`,
        });
      }

      return next();
    })
    .input(
      z.object({
        spaceId: z.string(),
        conversationId: z.string().optional(),
        question: z.string().min(1).max(2000),
        includeContext: z.boolean().default(true),
        contextLimit: z.number().min(1).max(10).default(5),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const startTime = Date.now();
      const userId = ctx.session.user.id;

      // 1. Get or create conversation
      let conv:
        | InferResultType<"conversation", { space: true; messages: true }>
        | null
        | undefined = null;
      if (input.conversationId) {
        // Verify conversation access
        conv = await db.query.conversation.findFirst({
          where: and(
            eq(conversation.id, input.conversationId),
            eq(conversation.userId, userId)
          ),
          with: {
            space: true,
            messages: {
              orderBy: [desc(message.createdAt)],
              limit: input.contextLimit * 2,
            },
          },
        });

        if (!conv) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Conversation not found",
          });
        }
      } else {
        // Create new conversation
        const { nanoid } = await import("nanoid");
        const [newConv] = await db
          .insert(conversation)
          .values({
            id: nanoid(),
            spaceId: input.spaceId,
            userId,
            title: input.question.slice(0, 100), // Use first 100 chars of question as title
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          .returning();

        if (!newConv) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to create conversation",
          });
        }

        conv = await db.query.conversation.findFirst({
          where: eq(conversation.id, newConv.id),
          with: {
            space: true,
            messages: true,
          },
        });

        if (!conv) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to create conversation",
          });
        }
      }

      // 2. Create user message
      await db
        .insert(message)
        .values({
          conversationId: conv.id,
          role: "user",
          content: input.question,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      // 3. Vector search for relevant chunks
      const vectorSearchStart = Date.now();
      const relevantChunks = await vectorSearch(
        input.question,
        conv.spaceId,
        5,
        0.7
      );
      const vectorSearchTime = Date.now() - vectorSearchStart;

      if (relevantChunks.length === 0) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message:
            "I cannot find information about this in your uploaded sources.",
        });
      }

      // 4. Build context from chunks with source tracking
      const contextWithSources = relevantChunks
        .map(
          (chunk, idx) =>
            `[Source ${idx + 1} - ${chunk.documentTitle}]:\n${chunk.content}`
        )
        .join("\n\n");

      // 5. Build conversation history for LangChain
      const conversationHistory: ["human" | "ai", string][] =
        input.includeContext && conv.messages
          ? conv.messages
              .reverse()
              .slice(0, input.contextLimit * 2)
              .map(
                (
                  msg: typeof message.$inferSelect
                ): ["human" | "ai", string] => [
                  msg.role === "user" ? "human" : "ai",
                  msg.content,
                ]
              )
          : [];

      // 6. Create RAG prompt template
      const prompt = ChatPromptTemplate.fromMessages([
        [
          "system",
          `You are a helpful AI assistant. Answer the user's question based ONLY on the provided context.
If the context doesn't contain relevant information, say "I cannot find information about this in your uploaded sources."
When citing information, reference the source numbers like [1] or [2] in your answer.

Context from documents:
{context}`,
        ],
        ...conversationHistory,
        ["human", "{question}"],
      ]);

      // 7. Create LangChain chain
      const chain = prompt
        .pipe(chatModel.getModel())
        .pipe(new StringOutputParser());

      // 8. Create assistant message placeholder
      const [assistantMessage] = await db
        .insert(message)
        .values({
          conversationId: conv.id,
          role: "assistant",
          content: "", // Will be updated after invoke
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      if (!assistantMessage) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create assistant message",
        });
      }

      // 9. Invoke LangChain chain and collect full response
      let fullResponse: string;
      try {
        fullResponse = await chain.invoke({
          context: contextWithSources,
          question: input.question,
        });
      } catch (error) {
        // Clean up the placeholder message on LLM failure
        await db.delete(message).where(eq(message.id, assistantMessage.id));

        // Provide user-friendly error message
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `I'm having trouble generating a response right now. Please try again in a moment. (${errorMessage})`,
        });
      }

      // 10. Save final message and citations to database
      await db
        .update(message)
        .set({
          content: fullResponse,
          metadata: {
            model: "gemini-2.0-flash-exp",
            processingTimeMs: Date.now() - startTime,
            vectorSearchTimeMs: vectorSearchTime,
            chunksRetrieved: relevantChunks.length,
          },
        })
        .where(eq(message.id, assistantMessage.id));

      // 11. Save citations
      const citationsData: Omit<InferResultType<"citation">, "id">[] = [];
      for (let i = 0; i < relevantChunks.length; i++) {
        const chunk = relevantChunks[i];
        if (!chunk) continue;
        citationsData.push({
          messageId: assistantMessage.id,
          chunkId: chunk.chunkId,
          relevanceScore: chunk.similarity,
          excerpt: chunk.content.slice(0, 200),
          citationIndex: i + 1,
        });
      }

      if (citationsData.length > 0) {
        await db.insert(citation).values(citationsData);
      }

      // 12. Update conversation timestamp
      await db
        .update(conversation)
        .set({ updatedAt: new Date() })
        .where(eq(conversation.id, conv.id));

      // 13. Return complete response with citations
      return {
        answer: fullResponse,
        conversationId: conv.id,
        citations: relevantChunks.map((chunk, i) => ({
          chunkId: chunk.chunkId,
          documentTitle: chunk.documentTitle,
          excerpt: chunk.content.slice(0, 200),
          relevanceScore: chunk.similarity,
          citationIndex: i + 1,
        })),
        metadata: {
          model: "gemini-2.0-flash-exp",
          processingTimeMs: Date.now() - startTime,
          vectorSearchTimeMs: vectorSearchTime,
          chunksRetrieved: relevantChunks.length,
        },
      };
    }),

  /**
   * List messages for a conversation
   */
  list: protectedProcedure
    .input(
      z.object({
        conversationId: z.string(),
      })
    )
    .query(async ({ input, ctx }) => {
      const userId = ctx.session.user.id;

      // Verify access
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

      const messages = await db.query.message.findMany({
        where: eq(message.conversationId, input.conversationId),
        orderBy: [desc(message.createdAt)],
      });

      return messages;
    }),

  /**
   * Get a message with its citations
   */
  getWithCitations: protectedProcedure
    .input(
      z.object({
        messageId: z.number(),
      })
    )
    .query(async ({ input, ctx }) => {
      const userId = ctx.session.user.id;

      const msg = await db.query.message.findFirst({
        where: eq(message.id, input.messageId),
        with: {
          conversation: true,
          citations: {
            with: {
              chunk: {
                with: {
                  document: true,
                },
              },
            },
          },
        },
      });

      if (!msg) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Message not found",
        });
      }

      // Verify user owns the conversation
      if (msg.conversation.userId !== userId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Access denied",
        });
      }

      return msg;
    }),
});
