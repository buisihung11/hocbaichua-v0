import { db } from "@hocbaichua-v0/db";
import { document, space } from "@hocbaichua-v0/db/schema/space";
import { TRPCError } from "@trpc/server";
import { and, count, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";
import { protectedProcedure, router } from "../index";

const createSpaceSchema = z.object({
  name: z.string().min(1, "Space name is required"),
  description: z.string().optional(),
});

const updateSpaceSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Space name is required").optional(),
  description: z.string().optional(),
});

const spaceIdSchema = z.object({
  id: z.string(),
});

export const spaceRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    const spaces = await db
      .select({
        id: space.id,
        name: space.name,
        description: space.description,
        isActive: space.isActive,
        createdAt: space.createdAt,
        updatedAt: space.updatedAt,
        documentCount: count(document.id),
      })
      .from(space)
      .leftJoin(document, eq(space.id, document.spaceId))
      .where(and(eq(space.userId, userId), eq(space.isActive, true)))
      .groupBy(space.id)
      .orderBy(space.updatedAt);

    return spaces;
  }),

  getById: protectedProcedure
    .input(spaceIdSchema)
    .query(async ({ input, ctx }) => {
      const userId = ctx.session.user.id;

      const spaceData = await db
        .select()
        .from(space)
        .where(
          and(
            eq(space.id, input.id),
            eq(space.userId, userId),
            eq(space.isActive, true)
          )
        )
        .limit(1);

      if (spaceData.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Space not found",
        });
      }

      return spaceData[0];
    }),

  create: protectedProcedure
    .input(createSpaceSchema)
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.session.user.id;

      const newSpace = await db
        .insert(space)
        .values({
          id: nanoid(),
          name: input.name,
          description: input.description,
          userId,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      if (newSpace.length === 0) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create space",
        });
      }

      return newSpace[0];
    }),

  update: protectedProcedure
    .input(updateSpaceSchema)
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.session.user.id;

      // Verify ownership
      const existing = await db
        .select()
        .from(space)
        .where(
          and(
            eq(space.id, input.id),
            eq(space.userId, userId),
            eq(space.isActive, true)
          )
        )
        .limit(1);

      if (existing.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Space not found",
        });
      }

      const updateData: Record<string, unknown> = {
        updatedAt: new Date(),
      };

      if (input.name !== undefined) {
        updateData.name = input.name;
      }

      if (input.description !== undefined) {
        updateData.description = input.description;
      }

      const updated = await db
        .update(space)
        .set(updateData)
        .where(eq(space.id, input.id))
        .returning();

      return updated[0];
    }),

  delete: protectedProcedure
    .input(spaceIdSchema)
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.session.user.id;

      // Verify ownership
      const existing = await db
        .select()
        .from(space)
        .where(
          and(
            eq(space.id, input.id),
            eq(space.userId, userId),
            eq(space.isActive, true)
          )
        )
        .limit(1);

      if (existing.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Space not found",
        });
      }

      // Soft delete
      await db
        .update(space)
        .set({
          isActive: false,
          deletedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(space.id, input.id));

      return { success: true };
    }),
});
