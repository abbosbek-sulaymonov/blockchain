import cors from "@fastify/cors";
import Fastify, { type FastifyError, type FastifyInstance } from "fastify";

import type { AppConfig } from "./config.js";
import type { MilestoneIndexer } from "./indexer.js";
import { registerRoutes } from "./routes/index.js";
import type { EventStore } from "./store.js";

export interface BuildServerOptions {
  config: AppConfig;
  store: EventStore;
  indexer?: MilestoneIndexer | null;
}

export async function buildServer({
  config,
  store,
  indexer = null,
}: BuildServerOptions): Promise<FastifyInstance> {
  const app = Fastify({
    logger:
      config.NODE_ENV === "test"
        ? false
        : {
            level: config.NODE_ENV === "production" ? "info" : "debug",
            transport:
              config.NODE_ENV === "development"
                ? {
                    target: "pino-pretty",
                    options: { translateTime: "HH:MM:ss", ignore: "pid,hostname" },
                  }
                : undefined,
          },
  });

  // BigInt has no JSON representation. Every block number and token amount crossing
  // this boundary is serialized as a decimal string; the frontend parses it back.
  app.setSerializerCompiler(() => (data) => JSON.stringify(data, bigintReplacer));

  await app.register(cors, {
    origin: config.CORS_ORIGIN === "*" ? true : config.CORS_ORIGIN.split(","),
  });

  app.setErrorHandler((error: FastifyError, request, reply) => {
    request.log.error(error);
    const status = error.statusCode ?? 500;
    return reply.status(status).send({
      error: error.name || "InternalServerError",
      message: status >= 500 ? "Something went wrong." : error.message,
    });
  });

  app.setNotFoundHandler((request, reply) =>
    reply.status(404).send({
      error: "NotFound",
      message: `No route for ${request.method} ${request.url}`,
    }),
  );

  await registerRoutes(app, { store, config, indexer, startedAt: new Date() });

  return app;
}

function bigintReplacer(_key: string, value: unknown): unknown {
  return typeof value === "bigint" ? value.toString() : value;
}
