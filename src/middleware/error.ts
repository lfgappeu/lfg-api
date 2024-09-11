import type { Middleware } from "koa";

import { logError } from "@/services/sentry";
import { UNEXPECTED_ERROR } from "@/errors/index.errors";
import { ValidationError } from "@/exceptions";

export default function (): Middleware {
  return async (ctx, next) => {
    try {
      await next();
    } catch (error) {
      if (error instanceof ValidationError) {
        ctx.status = error.statusCode;
        ctx.body = error;
        return;
      }

      logError(error);
      ctx.status = 500;
      ctx.body = UNEXPECTED_ERROR;
    }
  };
}
