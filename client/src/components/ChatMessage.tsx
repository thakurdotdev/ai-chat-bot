import { cn } from "@/lib/utils";
import type { ChatMessage as ChatMessageType } from "@/services/api";

interface ChatMessageProps {
  message: ChatMessageType;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.sender === "user";

  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[80%] px-4 py-2.5 text-sm leading-relaxed",
          isUser
            ? "bg-blue-600 text-white rounded-2xl rounded-br-sm"
            : "bg-gray-100 text-gray-900 rounded-2xl rounded-bl-sm",
        )}
      >
        <p className="whitespace-pre-wrap word-break">{message.content}</p>
      </div>
    </div>
  );
}
