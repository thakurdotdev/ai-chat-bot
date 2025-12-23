import { Request, Response, NextFunction, RequestHandler } from "express";
import { z } from "zod";

/**
 * Creates a validation middleware for request body using Zod schema.
 * Returns 400 with user-friendly error message on validation failure.
 */
export function validateBody<T>(schema: z.ZodType<T>): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const message = error.issues
          .map((e) => `${e.path.join(".")}: ${e.message}`)
          .join(", ");
        res.status(400).json({ error: message || "Invalid request data" });
        return;
      }
      next(error);
    }
  };
}
