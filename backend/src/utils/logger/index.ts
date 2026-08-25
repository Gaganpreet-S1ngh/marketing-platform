import { pinoHttp } from "pino-http";
import pino from "pino";

const isDev = process.env.NODE_ENV !== "production";

export const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  base: {
    service: "marketing-platform",
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  transport: isDev
    ? {
      target: "pino-pretty",
      options: {
        colorize: true,
      },
    }
    : undefined,
});

export const httpLogger = pinoHttp({
  logger,
  autoLogging: false
});