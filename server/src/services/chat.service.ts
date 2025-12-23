import { conversationRepository } from "../repositories/conversation.repo";
import { messageRepository } from "../repositories/message.repo";
import { createLLMProvider, FALLBACK_MESSAGE } from "./llm/llm.factory";
import { LLMError } from "./llm/llm.interface";
import { ChatResponse } from "../types/chat";
import { sessionCache, rateLimiter } from "./cache.service";

/**
 * Number of recent messages to include in LLM context.
 */
const HISTORY_LIMIT = 10;

/**
 * Chat service handling the core business logic for chat interactions.
 * Orchestrates conversation management, message persistence, and LLM calls.
 */
export const chatService = {
  /**
   * Handle an incoming chat message.
   * Creates or continues a conversation, persists messages, and generates AI reply.
   *
   * @param message - The user's message
   * @param sessionId - Optional existing session/conversation ID
   * @param clientIp - Optional client IP for rate limiting
   * @returns ChatResponse with AI reply and session ID
   */
  async handleMessage(
    message: string,
    sessionId?: string,
    clientIp?: string,
  ): Promise<ChatResponse> {
    // Rate limiting (uses sessionId or IP as identifier)
    const rateLimitId = sessionId || clientIp || "anonymous";
    const rateCheck = await rateLimiter.checkLimit(rateLimitId);

    if (!rateCheck.allowed) {
      return {
        reply: `You're sending messages too quickly. Please wait ${
          rateCheck.retryAfter || 60
        } seconds before trying again.`,
        sessionId: sessionId || "",
      };
    }

    // Get or create conversation
    let conversationId = sessionId;

    if (sessionId) {
      // Check cache first for session existence
      const cachedExists = await sessionCache.exists(sessionId);

      if (cachedExists === true) {
        // Cache hit - session exists
        conversationId = sessionId;
      } else {
        // Cache miss - verify via DB
        const existing = await conversationRepository.findById(sessionId);
        if (existing) {
          // Session exists - cache it for future requests
          await sessionCache.setExists(sessionId);
          conversationId = sessionId;
        } else {
          // Invalid sessionId - create new conversation
          conversationId = await conversationRepository.create();
          await sessionCache.setExists(conversationId);
        }
      }
    } else {
      // No sessionId provided - create new conversation
      conversationId = await conversationRepository.create();
      await sessionCache.setExists(conversationId);
    }

    // Persist user message
    await messageRepository.create(conversationId!, "user", message);

    // Get conversation history for context
    const history = await messageRepository.findByConversationId(
      conversationId!,
      HISTORY_LIMIT,
    );

    // Generate AI reply
    let aiReply: string;
    try {
      const llmProvider = createLLMProvider();
      aiReply = await llmProvider.generateReply(history, message);
    } catch (error) {
      // Log error for debugging
      if (error instanceof LLMError) {
        console.error(`LLM Error [${error.code}]:`, error.message);
      } else {
        console.error("Unexpected LLM error:", error);
      }

      // Return fallback message to user
      aiReply = FALLBACK_MESSAGE;
    }

    // Persist AI reply
    await messageRepository.create(conversationId!, "ai", aiReply);

    // Update conversation timestamp
    await conversationRepository.updateTimestamp(conversationId!);

    return {
      reply: aiReply,
      sessionId: conversationId!,
    };
  },

  /**
   * Get conversation history for a session.
   * Useful for restoring chat on page reload.
   */
  async getHistory(sessionId: string) {
    // Check cache first
    const cachedExists = await sessionCache.exists(sessionId);

    if (cachedExists === null) {
      // Not in cache - check DB
      const conversation = await conversationRepository.findById(sessionId);
      if (!conversation) {
        return null;
      }
      // Cache the existence for future requests
      await sessionCache.setExists(sessionId);
    }

    const messages = await messageRepository.findByConversationId(sessionId);

    // If no messages found even though session exists, return empty
    if (!messages.length) {
      const conversation = await conversationRepository.findById(sessionId);
      if (!conversation) {
        return null;
      }
    }

    return {
      sessionId,
      messages: messages.map((m) => ({
        id: m.id,
        sender: m.sender,
        content: m.content,
        createdAt: m.createdAt,
      })),
    };
  },
};
