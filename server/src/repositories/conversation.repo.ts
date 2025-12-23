import { eq } from "drizzle-orm";
import { db } from "../db";
import { conversations, Conversation } from "../db/schema";

/**
 * Repository for conversation persistence operations.
 * All database access for conversations goes through this layer.
 */
export const conversationRepository = {
  /**
   * Create a new conversation and return its ID.
   */
  async create(): Promise<string> {
    const [result] = await db
      .insert(conversations)
      .values({})
      .returning({ id: conversations.id });
    return result.id;
  },

  /**
   * Find a conversation by its ID.
   * Returns null if not found.
   */
  async findById(id: string): Promise<Conversation | null> {
    const result = await db
      .select()
      .from(conversations)
      .where(eq(conversations.id, id))
      .limit(1);
    return result[0] ?? null;
  },

  /**
   * Update the updated_at timestamp for a conversation.
   * Call this when a new message is added.
   */
  async updateTimestamp(id: string): Promise<void> {
    await db
      .update(conversations)
      .set({ updatedAt: new Date() })
      .where(eq(conversations.id, id));
  },
};
