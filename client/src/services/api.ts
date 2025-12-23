const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export interface ChatMessage {
  id: string;
  sender: "user" | "ai";
  content: string;
  createdAt: string;
}

export interface SendMessageResponse {
  reply: string;
  sessionId: string;
}

export interface ChatHistoryResponse {
  sessionId: string;
  messages: ChatMessage[];
}

export interface ErrorResponse {
  error: string;
}

class ChatApiError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = "ChatApiError";
    this.statusCode = statusCode;
  }
}

export const chatApi = {
  /**
   * Send a message and receive an AI reply.
   */
  async sendMessage(
    message: string,
    sessionId?: string,
  ): Promise<SendMessageResponse> {
    const response = await fetch(`${API_BASE_URL}/chat/message`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message, sessionId }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new ChatApiError(
        (data as ErrorResponse).error || "Failed to send message",
        response.status,
      );
    }

    return data as SendMessageResponse;
  },

  /**
   * Get chat history for a session.
   */
  async getHistory(sessionId: string): Promise<ChatHistoryResponse | null> {
    const response = await fetch(`${API_BASE_URL}/chat/history/${sessionId}`);

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      const data = await response.json();
      throw new ChatApiError(
        (data as ErrorResponse).error || "Failed to get history",
        response.status,
      );
    }

    return (await response.json()) as ChatHistoryResponse;
  },
};
