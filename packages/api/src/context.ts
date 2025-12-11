import { auth } from "@hocbaichua-v0/auth";
import type { Context as HonoContext } from "hono";

export type CreateContextOptions = {
  context: HonoContext;
};

export async function createContext({ context }: CreateContextOptions) {
  const session = await auth.api.getSession({
    headers: context.req.raw.headers,
  });
  return {
    session,
    // Helper utilities for easier user access
    user: session?.user ?? null,
    userId: session?.user?.id ?? null,
    isAuthenticated: !!session,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
