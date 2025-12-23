import OpenAI from "openai";
import { env } from "../../config/env";
import { Message } from "../../db/schema";
import { LLMProvider, LLMError, LLMErrorCode } from "./llm.interface";
import { SYSTEM_PROMPT, HISTORY_LIMIT } from "./prompts";

/**
 * OpenAI-based implementation of LLMProvider.
 */
export class OpenAIClient implements LLMProvider {
  private client: OpenAI;
  private modelName: string;

  constructor(apiKey?: string, modelName: string = "gpt-4o-mini") {
    const key = apiKey || env.OPENAI_API_KEY;
    if (!key) {
      throw new LLMError(
        "OpenAI API key is not configured",
        LLMErrorCode.INVALID_API_KEY,
      );
    }
    this.client = new OpenAI({ apiKey: key });
    this.modelName = modelName;
  }

  async generateReply(
    history: Message[],
    userMessage: string,
  ): Promise<string> {
    try {
      // Build messages array for OpenAI chat completion
      const messages = this.buildMessages(history, userMessage);

      const response = await this.client.chat.completions.create({
        model: this.modelName,
        messages,
        max_tokens: 1024,
        temperature: 0.7,
      });

      // Extract text from response
      const text = response.choices[0]?.message?.content?.trim();

      if (!text) {
        throw new LLMError(
          "Received empty response from OpenAI",
          LLMErrorCode.EMPTY_RESPONSE,
        );
      }

      return text;
    } catch (error) {
      // Re-throw LLMErrors as-is
      if (error instanceof LLMError) {
        throw error;
      }

      // Handle OpenAI API specific errors
      if (error instanceof OpenAI.APIError) {
        const status = error.status;

        if (status === 401) {
          throw new LLMError(
            "Invalid OpenAI API key",
            LLMErrorCode.INVALID_API_KEY,
          );
        }

        if (status === 429) {
          throw new LLMError(
            "Rate limit exceeded",
            LLMErrorCode.RATE_LIMIT,
            true, // Retryable
          );
        }

        if (status === 408 || status === 504) {
          throw new LLMError("Request timed out", LLMErrorCode.TIMEOUT, true);
        }

        if (status && status >= 500) {
          throw new LLMError(
            "OpenAI service error",
            LLMErrorCode.NETWORK_ERROR,
            true,
          );
        }
      }

      // Handle network errors
      const errorMessage =
        error instanceof Error ? error.message : String(error);

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
      console.error("Unexpected OpenAI error:", error);
      throw new LLMError("Failed to generate response", LLMErrorCode.UNKNOWN);
    }
  }

  /**
   * Build OpenAI chat messages from conversation history.
   */
  private buildMessages(
    history: Message[],
    userMessage: string,
  ): OpenAI.Chat.ChatCompletionMessageParam[] {
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: "system", content: SYSTEM_PROMPT },
    ];

    // Add recent history
    const recentHistory = history.slice(-HISTORY_LIMIT);
    for (const msg of recentHistory) {
      messages.push({
        role: msg.sender === "user" ? "user" : "assistant",
        content: msg.content,
      });
    }

    // Add current user message
    messages.push({ role: "user", content: userMessage });

    return messages;
  }
}
