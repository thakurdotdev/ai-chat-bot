import { NextFunction, Request, Response, Router } from "express";
import { validateBody } from "../middleware/validate.middleware";
import {
  chatRequestSchema,
  ChatRequest,
  ChatResponse,
  ErrorResponse,
} from "../types/chat";
import { chatService } from "../services/chat.service";
import { rateLimiter } from "../services/cache.service";

const router = Router();

/**
 * Extract client IP from request, handling proxy headers.
 */
function getClientIp(req: Request): string | undefined {
  return (
    (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.ip
  );
}

/**
 * POST /chat/message
 * Send a message and receive an AI reply.
 *
 * Request body:
 *   { message: string, sessionId?: string }
 *
 * Response:
 *   Success: { reply: string, sessionId: string }
 *   Error: { error: string }
 */
router.post(
  "/message",
  validateBody(chatRequestSchema),
  async (
    req: Request<
      Record<string, string>,
      ChatResponse | ErrorResponse,
      ChatRequest
    >,
    res: Response<ChatResponse | ErrorResponse>,
    next: NextFunction,
  ) => {
    try {
      const { message, sessionId } = req.body;
      const clientIp = getClientIp(req);

      const result = await chatService.handleMessage(
        message,
        sessionId,
        clientIp,
      );

      res.json(result);
    } catch (error) {
      next(error);
    }
  },
);

/**
 * GET /chat/history/:sessionId
 * Retrieve conversation history for a session.
 */
router.get(
  "/history/:sessionId",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { sessionId } = req.params;

      // Validate sessionId format (basic UUID check)
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(sessionId)) {
        res.status(400).json({ error: "Invalid session ID format" });
        return;
      }

      // Rate limiting for history requests
      const clientIp = getClientIp(req);
      const rateCheck = await rateLimiter.checkLimit(`history:${clientIp}`);

      if (!rateCheck.allowed) {
        res.status(429).json({
          error: `Too many requests. Please wait ${
            rateCheck.retryAfter || 60
          } seconds.`,
        });
        return;
      }

      const history = await chatService.getHistory(sessionId);

      if (!history) {
        res.status(404).json({ error: "Conversation not found" });
        return;
      }

      res.json(history);
    } catch (error) {
      next(error);
    }
  },
);

export default router;
