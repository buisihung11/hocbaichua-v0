import { headers } from "next/headers";
import { auth } from "./auth";

export async function createContext() {
  const headersData = await headers();

  const session = await auth.api.getSession({
    headers: headersData,
  });

  return {
    session,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
