import { GoogleGenAI } from "@google/genai";
import { env } from "../../config/env";
import { Message } from "../../db/schema";
import { LLMError, LLMErrorCode, LLMProvider } from "./llm.interface";
import { HISTORY_LIMIT, SYSTEM_PROMPT } from "./prompts";

/**
 * Gemini-based implementation of LLMProvider.
 */
export class GeminiClient implements LLMProvider {
  private client: GoogleGenAI;
  private modelName: string;

  constructor(apiKey?: string, modelName: string = "gemini-2.0-flash") {
    const key = apiKey || env.GEMINI_API_KEY;
    if (!key) {
      throw new LLMError(
        "Gemini API key is not configured",
        LLMErrorCode.INVALID_API_KEY,
      );
    }
    this.client = new GoogleGenAI({ apiKey: key });
    this.modelName = modelName;
  }

  async generateReply(
    history: Message[],
    userMessage: string,
  ): Promise<string> {
    try {
      // Build conversation context from history
      const conversationContext = this.buildConversationContext(history);

      // Combine system prompt, history, and current message
      const fullPrompt = `${SYSTEM_PROMPT}

## Recent Conversation
${conversationContext}

## Current Customer Message
${userMessage}

Please provide a helpful response:`;

      const response = await this.client.models.generateContent({
        model: this.modelName,
        contents: fullPrompt,
      });

      // Extract text from response
      const text = response.text?.trim();

      if (!text) {
        throw new LLMError(
          "Received empty response from Gemini",
          LLMErrorCode.EMPTY_RESPONSE,
        );
      }

      return text;
    } catch (error) {
      // Re-throw LLMErrors as-is
      if (error instanceof LLMError) {
        throw error;
      }

      // Handle Google API specific errors
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      if (
        errorMessage.includes("API key") ||
        errorMessage.includes("authentication") ||
        errorMessage.includes("401")
      ) {
        throw new LLMError(
          "Invalid Gemini API key",
          LLMErrorCode.INVALID_API_KEY,
        );
      }

      if (
        errorMessage.includes("rate limit") ||
        errorMessage.includes("quota") ||
        errorMessage.includes("429")
      ) {
        throw new LLMError(
          "Rate limit exceeded",
          LLMErrorCode.RATE_LIMIT,
          true,
        );
      }

      if (
        errorMessage.includes("timeout") ||
        errorMessage.includes("ETIMEDOUT")
      ) {
        throw new LLMError("Request timed out", LLMErrorCode.TIMEOUT, true);
      }

      if (
        errorMessage.includes("network") ||
        errorMessage.includes("ECONNREFUSED") ||
        errorMessage.includes("fetch failed")
      ) {
        throw new LLMError("Network error", LLMErrorCode.NETWORK_ERROR, true);
      }

      // Unknown error - wrap it
      console.error("Unexpected Gemini error:", error);
      throw new LLMError("Failed to generate response", LLMErrorCode.UNKNOWN);
    }
  }

  /**
   * Build a text representation of recent conversation history.
   */
  private buildConversationContext(history: Message[]): string {
    // Take only the most recent messages
    const recentHistory = history.slice(-HISTORY_LIMIT);

    if (recentHistory.length === 0) {
      return "(No previous messages)";
    }

    return recentHistory
      .map((msg) => {
        const role = msg.sender === "user" ? "Customer" : "Support Agent";
        return `${role}: ${msg.content}`;
      })
      .join("\n");
  }
}
