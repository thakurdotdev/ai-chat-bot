import { eq, desc } from "drizzle-orm";
import { db } from "../db";
import { messages, Message, Sender } from "../db/schema";

/**
 * Repository for message persistence operations.
 * Messages are append-only - no updates allowed.
 */
export const messageRepository = {
  /**
   * Create a new message in a conversation.
   */
  async create(
    conversationId: string,
    sender: Sender,
    content: string,
  ): Promise<Message> {
    const [result] = await db
      .insert(messages)
      .values({
        conversationId,
        sender,
        content,
      })
      .returning();
    return result;
  },

  /**
   * Get messages for a conversation, ordered by created_at ascending.
   * Optionally limit number of messages returned.
   */
  async findByConversationId(
    conversationId: string,
    limit?: number,
  ): Promise<Message[]> {
    // Get the most recent messages (descending), then reverse for chronological order
    const query = db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(desc(messages.createdAt));

    const result = limit ? await query.limit(limit) : await query;

    // Reverse to get chronological order (oldest first)
    return result.reverse();
  },
};
