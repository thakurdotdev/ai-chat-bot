import { z } from "zod";

// Maximum message length (10KB)
const MAX_MESSAGE_LENGTH = 10240;

/**
 * Schema for chat message request
 */
export const chatRequestSchema = z.object({
  message: z
    .string()
    .trim()
    .min(1, "Message cannot be empty")
    .max(
      MAX_MESSAGE_LENGTH,
      `Message exceeds maximum length of ${MAX_MESSAGE_LENGTH} characters`,
    ),
  sessionId: z.uuid().optional(),
});

export type ChatRequest = z.infer<typeof chatRequestSchema>;

/**
 * Chat response type
 */
export interface ChatResponse {
  reply: string;
  sessionId: string;
}

/**
 * Error response type
 */
export interface ErrorResponse {
  error: string;
}
