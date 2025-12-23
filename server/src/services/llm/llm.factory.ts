import { env, LLMProviderType } from "../../config/env";
import {
  LLMProvider,
  LLMError,
  LLMErrorCode,
  FALLBACK_MESSAGE,
} from "./llm.interface";
import { GeminiClient } from "./gemini.client";
import { OpenAIClient } from "./openai.client";

/**
 * Create an LLM provider instance based on the specified type.
 * @throws LLMError if the provider is misconfigured
 */
function createProviderByType(type: LLMProviderType): LLMProvider {
  switch (type) {
    case "gemini":
      return new GeminiClient();
    case "openai":
      return new OpenAIClient();
    default:
      throw new LLMError(`Unknown LLM provider: ${type}`, LLMErrorCode.UNKNOWN);
  }
}

/**
 * Get the fallback provider type (the other provider).
 */
function getFallbackProvider(primary: LLMProviderType): LLMProviderType | null {
  switch (primary) {
    case "gemini":
      return env.OPENAI_API_KEY ? "openai" : null;
    case "openai":
      return env.GEMINI_API_KEY ? "gemini" : null;
    default:
      return null;
  }
}

/**
 * LLM provider wrapper with automatic fallback on retryable errors.
 * If the primary provider fails with a retryable error (rate limit, timeout),
 * it will attempt to use the fallback provider once.
 */
class LLMProviderWithFallback implements LLMProvider {
  private primaryType: LLMProviderType;
  private primary: LLMProvider;
  private fallback: LLMProvider | null = null;

  constructor() {
    this.primaryType = env.LLM_PROVIDER;
    this.primary = createProviderByType(this.primaryType);

    // Initialize fallback if available
    const fallbackType = getFallbackProvider(this.primaryType);
    if (fallbackType) {
      try {
        this.fallback = createProviderByType(fallbackType);
        console.log(
          `[LLM] Primary: ${this.primaryType}, Fallback: ${fallbackType}`,
        );
      } catch {
        // Fallback provider not configured - that's OK
        console.log(`[LLM] Primary: ${this.primaryType}, Fallback: none`);
      }
    } else {
      console.log(`[LLM] Primary: ${this.primaryType}, Fallback: none`);
    }
  }

  async generateReply(
    history: import("../../db/schema").Message[],
    userMessage: string,
  ): Promise<string> {
    try {
      return await this.primary.generateReply(history, userMessage);
    } catch (error) {
      // Only attempt fallback for retryable errors
      if (error instanceof LLMError && error.isRetryable && this.fallback) {
        console.log(
          `[LLM] Primary (${this.primaryType}) failed with ${error.code}, attempting fallback...`,
        );

        try {
          return await this.fallback.generateReply(history, userMessage);
        } catch (fallbackError) {
          // Log fallback failure, throw original error
          console.error("[LLM] Fallback also failed:", fallbackError);
          throw error;
        }
      }

      // Non-retryable error or no fallback available
      throw error;
    }
  }
}

/**
 * Singleton provider instance.
 * Lazily initialized on first use.
 */
let providerInstance: LLMProvider | null = null;

/**
 * Create the LLM provider instance.
 * Uses provider specified by LLM_PROVIDER env var with optional fallback.
 */
export function createLLMProvider(): LLMProvider {
  if (!providerInstance) {
    providerInstance = new LLMProviderWithFallback();
  }
  return providerInstance;
}

// Re-export for convenience
export { FALLBACK_MESSAGE };
