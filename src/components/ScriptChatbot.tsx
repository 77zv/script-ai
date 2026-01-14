"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  actionButtons?: Array<{ label: string; action: string; emoji?: string }>;
  suggestedChanges?: string;
}

interface ScriptChatbotProps {
  scriptId: string;
  scriptContent: string;
  onApplyChanges?: (newContent: string) => void;
  position?: "floating" | "embedded";
  autoOpen?: boolean;
}

const quickActions = [
  { label: "Make it shorter", emoji: "📉", action: "Make this script shorter and more concise" },
  { label: "More engaging", emoji: "✨", action: "Make this script more engaging and captivating" },
  { label: "Add humor", emoji: "😄", action: "Add humor and personality to this script" },
  { label: "Better hook", emoji: "🎣", action: "Improve the opening hook to grab attention" },
  { label: "Add CTA", emoji: "👉", action: "Add a strong call-to-action to this script" },
];

export default function ScriptChatbot({
  scriptId,
  scriptContent,
  onApplyChanges,
  position = "embedded",
  autoOpen = false,
}: ScriptChatbotProps) {
  const [isOpen, setIsOpen] = useState(autoOpen);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const initializeChat = useCallback(async () => {
    try {
      setError(null);
      const response = await fetch("/api/chatbot/init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scriptId, scriptContent }),
      });

      if (!response.ok) {
        throw new Error("Failed to initialize chat");
      }

      const data = await response.json();
      setThreadId(data.threadId);

      // Add initial greeting
      const greeting: Message = {
        id: `greeting-${Date.now()}`,
        role: "assistant",
        content: `Hi! 👋 I'm ScriptBot, your video script assistant. I can help you:
- Make your script more engaging
- Shorten or expand sections
- Improve hooks and CTAs
- Add structure and timing

What would you like to work on?`,
        timestamp: new Date(),
        actionButtons: quickActions.map((qa) => ({
          label: qa.label,
          action: qa.action,
          emoji: qa.emoji,
        })),
      };

      setMessages([greeting]);
    } catch (err) {
      console.error("Error initializing chat:", err);
      setError("Failed to initialize chat. Please try again.");
    }
  }, [scriptId, scriptContent]);

  // Initialize chat when opened (or when embedded)
  useEffect(() => {
    if ((isOpen || position === "embedded") && !threadId && messages.length === 0) {
      initializeChat();
    }
  }, [isOpen, position, threadId, messages.length, initializeChat]);

  // Load chat history from localStorage
  useEffect(() => {
    if (threadId) {
      const contentHash = scriptContent.substring(0, 50).replace(/\s/g, "");
      const saved = localStorage.getItem(`chat-${scriptId}-${contentHash}`);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setMessages(parsed.map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) })));
        } catch (e) {
          console.error("Error loading chat history:", e);
        }
      }
    }
  }, [threadId, scriptId, scriptContent]);

  // Save messages to localStorage
  useEffect(() => {
    if (threadId && messages.length > 0) {
      // Include script content hash to differentiate between original/repurposed chats
      const contentHash = scriptContent.substring(0, 50).replace(/\s/g, "");
      localStorage.setItem(`chat-${scriptId}-${contentHash}`, JSON.stringify(messages));
    }
  }, [messages, threadId, scriptId, scriptContent]);

  const sendMessage = async (content: string) => {
    if (!content.trim() || !threadId) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: content.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsTyping(true);
    setError(null);

    try {
      const response = await fetch("/api/chatbot/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          threadId,
          message: content.trim(),
          scriptContent,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to send message");
      }

      const data = await response.json();
      
      // Parse response for suggested changes
      const suggestedChanges = data.suggestedChanges || null;
      const responseContent = data.response || "I'm here to help!";

      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: responseContent,
        timestamp: new Date(),
        suggestedChanges,
        actionButtons: suggestedChanges
          ? []
          : quickActions.map((qa) => ({
              label: qa.label,
              action: qa.action,
              emoji: qa.emoji,
            })),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      console.error("Error sending message:", err);
      setError("Failed to send message. Please try again.");
      // Remove user message on error
      setMessages((prev) => prev.filter((m) => m.id !== userMessage.id));
    } finally {
      setIsTyping(false);
    }
  };

  const handleQuickAction = (action: string) => {
    sendMessage(action);
  };

  const handleApplyChanges = (changes: string) => {
    if (onApplyChanges) {
      onApplyChanges(changes);
      // Add confirmation message
      const confirmMessage: Message = {
        id: `confirm-${Date.now()}`,
        role: "assistant",
        content: "✅ Changes applied to your script!",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, confirmMessage]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (inputValue.trim()) {
        sendMessage(inputValue);
      }
    }
  };

  // Floating position styles
  const containerClasses =
    position === "floating"
      ? "fixed bottom-6 right-6 w-[380px] h-[600px] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden z-50"
      : "w-full h-full bg-white rounded-[12px] flex flex-col overflow-hidden";

  // For embedded position, always show the chat (don't require isOpen)
  // For floating position, only show when isOpen is true
  if (position === "floating" && !isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all flex items-center justify-center z-50 hover:scale-110"
        aria-label="Open chat"
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      </button>
    );
  }

  // For embedded, ensure isOpen is true so chat initializes
  useEffect(() => {
    if (position === "embedded" && !isOpen) {
      setIsOpen(true);
    }
  }, [position, isOpen]);

  return (
    <>
      {/* Chat Window */}
      {(isOpen || position === "embedded") && (
        <div className={containerClasses}>
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-4 text-white">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-xl">
                🤖
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-base">ScriptBot</h3>
                <p className="text-xs flex items-center gap-1.5">
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                  Online Now
                </p>
              </div>
              {position === "floating" && (
                <button
                  onClick={() => setIsOpen(false)}
                  className="hover:bg-white/20 rounded-full p-1.5 transition-colors"
                  aria-label="Close chat"
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-2 ${
                  message.role === "user" ? "flex-row-reverse" : ""
                } animate-in fade-in slide-in-from-bottom-2`}
              >
                {/* Avatar */}
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm flex-shrink-0 ${
                    message.role === "assistant"
                      ? "bg-purple-500"
                      : "bg-blue-500"
                  }`}
                >
                  {message.role === "assistant" ? "🤖" : "Y"}
                </div>

                {/* Message Bubble */}
                <div className="flex flex-col gap-1 max-w-[75%]">
                  <div
                    className={`rounded-2xl p-3 shadow-sm ${
                      message.role === "assistant"
                        ? "bg-white rounded-tl-sm"
                        : "bg-purple-500 text-white rounded-tr-sm"
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  </div>

                  {/* Suggested Changes */}
                  {message.suggestedChanges && (
                    <div className="bg-gray-100 rounded-lg p-3 mt-2 border border-gray-200">
                      <p className="text-xs font-medium text-gray-700 mb-2">
                        Suggested Changes:
                      </p>
                      <pre className="text-xs text-gray-800 whitespace-pre-wrap font-mono bg-white p-2 rounded border">
                        {message.suggestedChanges}
                      </pre>
                      <Button
                        onClick={() => handleApplyChanges(message.suggestedChanges!)}
                        className="mt-2 w-full bg-green-500 hover:bg-green-600 text-white text-xs"
                        size="sm"
                      >
                        ✓ Apply to Script
                      </Button>
                    </div>
                  )}

                  {/* Action Buttons */}
                  {message.actionButtons && message.actionButtons.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {message.actionButtons.map((btn, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleQuickAction(btn.action)}
                          className="px-3 py-1.5 bg-purple-100 text-purple-700 rounded-full text-xs hover:bg-purple-200 transition-colors flex items-center gap-1"
                        >
                          {btn.emoji && <span>{btn.emoji}</span>}
                          {btn.label}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Timestamp */}
                  <p className="text-xs text-gray-400 px-1">
                    {message.timestamp.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            ))}

            {/* Typing Indicator */}
            {isTyping && (
              <div className="flex gap-2 animate-in fade-in">
                <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center text-white text-sm">
                  🤖
                </div>
                <div className="bg-white rounded-2xl rounded-tl-sm p-3 shadow-sm">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></span>
                    <span
                      className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                      style={{ animationDelay: "0.1s" }}
                    ></span>
                    <span
                      className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                      style={{ animationDelay: "0.2s" }}
                    ></span>
                  </div>
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                {error}
                <button
                  onClick={() => setError(null)}
                  className="ml-2 underline hover:no-underline"
                >
                  Dismiss
                </button>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-4 border-t bg-white">
            <div className="flex gap-2 items-center">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask me to edit your script..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                disabled={!threadId || isTyping}
              />
              <button
                onClick={() => sendMessage(inputValue)}
                disabled={!inputValue.trim() || !threadId || isTyping}
                className="w-10 h-10 bg-purple-500 text-white rounded-full flex items-center justify-center hover:bg-purple-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Send message"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
