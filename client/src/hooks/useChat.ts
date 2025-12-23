import { chatApi, type ChatMessage } from "@/services/api";
import { useCallback, useEffect, useState } from "react";

const SESSION_STORAGE_KEY = "chat_session_id";

interface UseChatReturn {
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
  sendMessage: (content: string) => Promise<void>;
  clearError: () => void;
}

export function useChat(): UseChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(() => {
    return localStorage.getItem(SESSION_STORAGE_KEY);
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch history on mount if sessionId exists
  useEffect(() => {
    const storedId = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!storedId) return;

    chatApi
      .getHistory(storedId)
      .then((history) => {
        if (history?.messages) {
          setMessages(history.messages);
        } else {
          localStorage.removeItem(SESSION_STORAGE_KEY);
          setSessionId(null);
        }
      })
      .catch((err) => {
        console.error("Failed to restore chat history:", err);
      });
  }, []);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || isLoading) return;

      setError(null);
      setIsLoading(true);

      const tempUserMessage: ChatMessage = {
        id: `temp-${Date.now()}`,
        sender: "user",
        content: content.trim(),
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, tempUserMessage]);

      try {
        const response = await chatApi.sendMessage(
          content.trim(),
          sessionId ?? undefined,
        );

        if (response.sessionId) {
          setSessionId(response.sessionId);
          localStorage.setItem(SESSION_STORAGE_KEY, response.sessionId);
        }

        const aiMessage: ChatMessage = {
          id: `ai-${Date.now()}`,
          sender: "ai",
          content: response.reply,
          createdAt: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, aiMessage]);
      } catch (err) {
        setMessages((prev) => prev.filter((m) => m.id !== tempUserMessage.id));
        setError(err instanceof Error ? err.message : "Failed to send message");
      } finally {
        setIsLoading(false);
      }
    },
    [sessionId, isLoading],
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    clearError,
  };
}
