import { ChatInput } from "@/components/ChatInput";
import { ChatMessage } from "@/components/ChatMessage";
import { useChat } from "@/hooks/useChat";
import { ChevronLeft, Loader2, MoreHorizontal, X } from "lucide-react";
import { useCallback, useEffect, useRef } from "react";

export function ChatContainer() {
  const { messages, isLoading, isRestoring, error, sendMessage, clearError } =
    useChat();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const shouldAutoScrollRef = useRef(true);
  const prevMessagesLengthRef = useRef(0);

  const checkIfNearBottom = useCallback(() => {
    const container = containerRef.current;
    if (!container) return true;
    const threshold = 100;
    return (
      container.scrollHeight - container.scrollTop - container.clientHeight <
      threshold
    );
  }, []);

  const handleScroll = useCallback(() => {
    shouldAutoScrollRef.current = checkIfNearBottom();
  }, [checkIfNearBottom]);

  useEffect(() => {
    const hasNewMessage = messages.length > prevMessagesLengthRef.current;
    const lastMessage = messages[messages.length - 1];
    const isUserMessage = lastMessage?.sender === "user";
    prevMessagesLengthRef.current = messages.length;

    // Always scroll if user sent a message, otherwise only if near bottom
    if (hasNewMessage && (isUserMessage || shouldAutoScrollRef.current)) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  useEffect(() => {
    if (messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: "instant" });
    }
  }, []);

  return (
    <div className="w-full max-w-100 h-150 flex flex-col bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-200">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <button className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-linear-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-semibold">
              T
            </div>
            <span className="font-semibold text-gray-900">TechStyle</span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
            <MoreHorizontal className="w-5 h-5 text-gray-600" />
          </button>
          <button className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Intro message */}
      <div className="px-5 py-4 text-center border-b border-gray-50">
        <p className="text-gray-600 text-sm">
          Hey! I'm the TechStyle assistant. Ask me anything.
        </p>
      </div>

      {/* Messages */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-4"
      >
        {/* Restoring chat history loader */}
        {isRestoring && (
          <div className="h-full flex flex-col items-center justify-center text-center px-4">
            <Loader2 className="w-6 h-6 text-gray-400 animate-spin mb-3" />
            <div className="text-gray-400 text-sm">
              Loading previous messages...
            </div>
          </div>
        )}

        {/* Empty state with quick actions */}
        {!isRestoring && messages.length === 0 && !isLoading && (
          <div className="h-full flex flex-col items-center justify-center text-center px-4">
            <div className="text-gray-400 text-sm mb-4">No messages yet</div>
            <div className="flex flex-wrap justify-center gap-2">
              {["Shipping options", "Return policy", "Track order"].map(
                (text) => (
                  <button
                    key={text}
                    onClick={() => sendMessage(text)}
                    className="px-3 py-1.5 text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-full hover:bg-gray-100 transition-colors"
                  >
                    {text}
                  </button>
                ),
              )}
            </div>
          </div>
        )}

        <div className="space-y-3">
          {messages.map((message) => (
            <ChatMessage key={message.id} message={message} />
          ))}

          {isLoading && messages.length > 0 && (
            <div className="flex justify-start">
              <div className="bg-gray-100 rounded-2xl rounded-bl-sm px-4 py-2.5">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-pulse" />
                  <span
                    className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-pulse"
                    style={{ animationDelay: "0.2s" }}
                  />
                  <span
                    className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-pulse"
                    style={{ animationDelay: "0.4s" }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        <div ref={messagesEndRef} />
      </div>

      {/* Error */}
      {error && (
        <div className="mx-4 mb-2 p-2.5 bg-red-50 text-red-600 text-xs rounded-lg flex items-center justify-between">
          <span>{error}</span>
          <button onClick={clearError} className="p-1 hover:bg-red-100 rounded">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Input */}
      <ChatInput onSend={sendMessage} isLoading={isLoading || isRestoring} />
    </div>
  );
}
