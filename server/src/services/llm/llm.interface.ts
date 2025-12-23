import { Message } from "../../db/schema";

/**
 * Provider-agnostic interface for LLM interactions.
 * Implementations can use any LLM provider (Gemini, OpenAI, etc.)
 * without affecting business logic or routes.
 */
export interface LLMProvider {
  /**
   * Generate an AI reply based on conversation history and user message.
   * @param history - Previous messages in the conversation (limited)
   * @param userMessage - The current user message
   * @returns AI-generated reply string
   * @throws LLMError on failure
   */
  generateReply(history: Message[], userMessage: string): Promise<string>;
}

/**
 * Custom error class for LLM-related failures.
 * Used to distinguish LLM errors from other errors for proper handling.
 */
export class LLMError extends Error {
  constructor(
    message: string,
    public readonly code: LLMErrorCode,
    public readonly isRetryable: boolean = false,
  ) {
    super(message);
    this.name = "LLMError";
  }
}

export enum LLMErrorCode {
  INVALID_API_KEY = "INVALID_API_KEY",
  RATE_LIMIT = "RATE_LIMIT",
  TIMEOUT = "TIMEOUT",
  NETWORK_ERROR = "NETWORK_ERROR",
  EMPTY_RESPONSE = "EMPTY_RESPONSE",
  MALFORMED_RESPONSE = "MALFORMED_RESPONSE",
  UNKNOWN = "UNKNOWN",
}

/**
 * Fallback message to show users when LLM fails.
 */
export const FALLBACK_MESSAGE =
  "I apologize, but I'm having trouble processing your request right now. Please try again in a moment, or contact our support team if the issue persists.";
