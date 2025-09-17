import { OpenAPIGenerator } from "@orpc/openapi";
import { ZodToJsonSchemaConverter } from "@orpc/zod";
import { NextResponse } from "next/server";
import { appRouter } from "@/routers";

const openAPIGenerator = new OpenAPIGenerator({
  schemaConverters: [new ZodToJsonSchemaConverter()],
});

export async function GET() {
  const spec = await openAPIGenerator.generate(appRouter, {
    info: {
      title: "HocBaiChua API",
      version: "1.0.0",
    },
    servers: [{ url: "/rpc" }],
    security: [{ bearerAuth: [] }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
        },
      },
    },
  });

  return NextResponse.json(spec);
}
