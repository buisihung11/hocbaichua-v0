import { ORPCError, os } from "@orpc/server";
import type { Context } from "./context";

export const o = os.$context<Context>();

export const router = o.router;

export const publicProcedure = o;

export const protectedProcedure = o.use(({ context, next }) => {
  if (!context.session) {
    throw new ORPCError("UNAUTHORIZED", {
      message: "Authentication required",
      cause: "No session",
    });
  }
  return next({
    context: {
      ...context,
      session: context.session,
    },
  });
});
