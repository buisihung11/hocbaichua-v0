import { protectedProcedure, publicProcedure, router } from "../index";
import { chatRouter } from "./chat";
import { spaceRouter } from "./space";
import { todoRouter } from "./todo";
import { uploadRouter } from "./upload";

export const appRouter = router({
  healthCheck: publicProcedure.query(() => "OK"),
  privateData: protectedProcedure.query(({ ctx }) => ({
    message: "This is private",
    user: ctx.session.user,
  })),
  todo: todoRouter,
  upload: uploadRouter,
  space: spaceRouter,
  chat: chatRouter,
});
export type AppRouter = typeof appRouter;
