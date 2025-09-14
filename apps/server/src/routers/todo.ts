import { ORPCError } from "@orpc/server";
import { eq } from "drizzle-orm";
import z from "zod";
import { db } from "../db";
import { todo } from "../db/schema/todo";
import { publicProcedure } from "../lib/orpc";

// Test constants for error simulation
const TEST_ERROR_TEXT = "AAA";
const TEST_ERROR_ID = 999;

export const todoRouter = {
  getAll: publicProcedure.handler(async () => {
    return await db.select().from(todo);
  }),

  create: publicProcedure
    .input(z.object({ text: z.string().min(1) }))
    .handler(async ({ input }) => {
      // Test error handling: return 400 if text is "AAA"
      if (input.text === TEST_ERROR_TEXT) {
        throw new ORPCError("BAD_REQUEST", {
          message: `Cannot create todo with text '${TEST_ERROR_TEXT}' - this is a test error`,
          status: 400,
        });
      }

      return await db.insert(todo).values({
        text: input.text,
      });
    }),

  toggle: publicProcedure
    .input(z.object({ id: z.number(), completed: z.boolean() }))
    .handler(async ({ input }) => {
      // Test error handling: return 400 if trying to mark as completed and id is TEST_ERROR_ID
      if (input.completed) {
        throw new ORPCError("BAD_REQUEST", {
          message: `Cannot complete todo with id ${TEST_ERROR_ID} - this is a test error`,
          status: 400,
        });
      }

      return await db
        .update(todo)
        .set({ completed: input.completed })
        .where(eq(todo.id, input.id));
    }),

  delete: publicProcedure
    .input(z.object({ id: z.number() }))
    .handler(async ({ input }) => {
      return await db.delete(todo).where(eq(todo.id, input.id));
    }),
};
