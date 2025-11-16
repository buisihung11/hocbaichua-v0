import { createTRPCContext } from "@trpc/tanstack-react-query";
import type { AppRouter } from "@hocbaichua-v0/api/routers/index";

export const { TRPCProvider, useTRPC, useTRPCClient } =
	createTRPCContext<AppRouter>();
