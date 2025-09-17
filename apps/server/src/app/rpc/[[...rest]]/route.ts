import { OpenAPIHandler } from "@orpc/openapi/fetch";
import { RPCHandler } from "@orpc/server/fetch";
import type { NextRequest } from "next/server";
import { createContext } from "@/lib/context";
import { appRouter } from "@/routers";

const rpcHandler = new RPCHandler(appRouter);

const openAPIHandler = new OpenAPIHandler(appRouter, {
  plugins: [],
});

async function handleRequest(request: NextRequest) {
  // Try OpenAPI handler first
  const openAPIResult = await openAPIHandler.handle(request, {
    prefix: "/rpc",
    context: await createContext(),
  });

  if (openAPIResult.matched) {
    return openAPIResult.response;
  }

  // Fall back to RPC handler
  const { response } = await rpcHandler.handle(request, {
    prefix: "/rpc",
    context: await createContext(),
  });
  return response ?? new Response("Not found", { status: 404 });
}

export const HEAD = handleRequest;
export const GET = handleRequest;
export const POST = handleRequest;
export const PUT = handleRequest;
export const PATCH = handleRequest;
export const DELETE = handleRequest;
