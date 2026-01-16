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
  onSendMessageRef?: (ref: { sendMessage: (message: string) => void; setInputValue: (value: string) => void }) => void;
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
  onSendMessageRef,
}: ScriptChatbotProps) {
  const [isOpen, setIsOpen] = useState(autoOpen);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedSuggestions, setExpandedSuggestions] = useState<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  // Track if this is the initial load
  const isInitialLoadRef = useRef(true);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom on initial load (without animation to avoid glitchy effect)
  useEffect(() => {
    if (threadId && messages.length > 0 && isInitialLoadRef.current && messagesContainerRef.current) {
      // Scroll immediately to bottom without animation on initial load
      setTimeout(() => {
        if (messagesContainerRef.current) {
          messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
          isInitialLoadRef.current = false;
        }
      }, 100);
    }
  }, [threadId, messages.length]);

  // Auto-scroll to bottom when new messages arrive (after initial load)
  useEffect(() => {
    if (!isInitialLoadRef.current && messagesContainerRef.current) {
      // Use setTimeout to ensure DOM is updated
      setTimeout(() => {
        if (messagesContainerRef.current) {
          messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
        }
      }, 0);
    }
  }, [messages, isTyping]);

  const initializeChat = useCallback(async () => {
    try {
      setError(null);
      
      // Ensure we have valid scriptContent
      const contentToSend = scriptContent || "";
      
      const response = await fetch("/api/chatbot/init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scriptId, scriptContent: contentToSend }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
        console.error("Chat initialization failed:", errorData);
        throw new Error(errorData.error || `Failed to initialize chat (${response.status})`);
      }

      const data = await response.json();
      
      if (!data.threadId) {
        throw new Error("No threadId received from server");
      }
      
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
      const errorMessage = err instanceof Error ? err.message : "Failed to initialize chat. Please try again.";
      setError(errorMessage);
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

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim()) return;
    
    // If no threadId, initialize chat first
    let currentThreadId = threadId;
    if (!currentThreadId) {
      try {
        setError(null);
        const contentToSend = scriptContent || "";
        
        const initResponse = await fetch("/api/chatbot/init", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ scriptId, scriptContent: contentToSend }),
        });

        if (!initResponse.ok) {
          const errorData = await initResponse.json().catch(() => ({ error: "Unknown error" }));
          console.error("Chat initialization failed:", errorData);
          throw new Error(errorData.error || `Failed to initialize chat (${initResponse.status})`);
        }

        const initData = await initResponse.json();
        
        if (!initData.threadId) {
          throw new Error("No threadId received from server");
        }
        
        currentThreadId = initData.threadId;
        setThreadId(currentThreadId);

        // Add initial greeting if no messages exist
        if (messages.length === 0) {
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
        }
      } catch (err) {
        console.error("Error initializing chat:", err);
        const errorMessage = err instanceof Error ? err.message : "Failed to initialize chat. Please try again.";
        setError(errorMessage);
        return;
      }
    }

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
          threadId: currentThreadId,
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
  }, [threadId, scriptContent, scriptId, messages.length]);

  // Listen for custom event to set input value
  useEffect(() => {
    const handleSetInput = (event: Event) => {
      const customEvent = event as CustomEvent<{ text: string }>;
      if (customEvent.detail?.text) {
        setInputValue(customEvent.detail.text);
        // Focus the input field
        setTimeout(() => {
          inputRef.current?.focus();
        }, 100);
      }
    };

    window.addEventListener('setChatInput', handleSetInput as EventListener);
    return () => {
      window.removeEventListener('setChatInput', handleSetInput as EventListener);
    };
  }, []);

  // Memoize the ref object functions
  const sendMessageRef = useRef(sendMessage);
  const initializeChatRef = useRef(initializeChat);
  const threadIdRef = useRef(threadId);
  const setInputValueRef = useRef(setInputValue);
  
  // Update refs when values change
  useEffect(() => {
    sendMessageRef.current = sendMessage;
    initializeChatRef.current = initializeChat;
    threadIdRef.current = threadId;
    setInputValueRef.current = setInputValue;
  }, [sendMessage, initializeChat, threadId, setInputValue]);

  // Expose sendMessage function to parent component
  useEffect(() => {
    if (onSendMessageRef) {
      const refObject = {
        sendMessage: (message: string) => {
          if (threadIdRef.current) {
            sendMessageRef.current(message);
          } else {
            // Initialize chat first, then send message
            initializeChatRef.current().then(() => {
              setTimeout(() => sendMessageRef.current(message), 500);
            });
          }
        },
        setInputValue: (value: string) => {
          setInputValueRef.current(value);
          // Focus and resize textarea
          setTimeout(() => {
            const textarea = inputRef.current as HTMLTextAreaElement;
            if (textarea) {
              textarea.focus();
              textarea.style.height = 'auto';
              textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
            }
          }, 100);
        },
      };
      
      onSendMessageRef(refObject);
    }
  }, [onSendMessageRef]); // Only depend on onSendMessageRef, use refs for everything else

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


  // Floating position styles
  const containerClasses =
    position === "floating"
      ? "fixed bottom-6 right-6 w-[380px] h-[600px] bg-white rounded-[12px] shadow-2xl flex flex-col overflow-hidden z-50 border border-gray-200"
      : "w-full h-full bg-white rounded-[12px] flex flex-col overflow-hidden";

  // For embedded position, always show the chat (don't require isOpen)
  // For floating position, only show when isOpen is true
  if (position === "floating" && !isOpen) {
    return (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 w-14 h-14 bg-black text-white rounded-full shadow-lg hover:shadow-xl transition-all flex items-center justify-center z-50 hover:scale-110"
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
          {/* Header - Removed title, only show close button for floating */}
          {position === "floating" && (
            <div className="border-b border-gray-200 p-2 bg-white flex justify-end">
              <button
                onClick={() => setIsOpen(false)}
                className="hover:bg-gray-100 rounded-full p-1.5 transition-colors text-gray-600"
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
            </div>
          )}

          {/* Messages Area */}
          <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-2 ${
                  message.role === "user" ? "justify-end" : "justify-start"
                } animate-in fade-in slide-in-from-bottom-2`}
              >
                {/* Message Bubble - No Avatar */}
                <div className="flex flex-col gap-1" style={{ maxWidth: message.role === "user" ? "90%" : "95%" }}>
                  <div
                    className={`rounded-[12px] p-3 inline-block ${
                      message.role === "assistant"
                        ? "bg-gray-100 rounded-tl-sm"
                        : "bg-black text-white rounded-tr-sm"
                    }`}
                    style={{ maxWidth: "100%" }}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  </div>

                  {/* Suggested Changes */}
                  {message.suggestedChanges && (() => {
                    const isExpanded = expandedSuggestions.has(message.id);
                    const lines = message.suggestedChanges.split('\n');
                    const previewLines = 3;
                    const showPreview = lines.length > previewLines && !isExpanded;
                    const displayText = showPreview 
                      ? lines.slice(0, previewLines).join('\n') + '\n...'
                      : message.suggestedChanges;
                    
                    return (
                      <div className="bg-gray-100 rounded-lg p-3 mt-2 border border-gray-200">
                        <p className="text-xs font-medium text-gray-700 mb-2">
                          Suggested Changes:
                        </p>
                        <pre className="text-xs text-gray-800 whitespace-pre-wrap font-mono bg-white p-2 rounded border max-h-[300px] overflow-y-auto">
                          {displayText}
                        </pre>
                        {lines.length > previewLines && (
                          <button
                            onClick={() => {
                              setExpandedSuggestions(prev => {
                                const next = new Set(prev);
                                if (isExpanded) {
                                  next.delete(message.id);
                                } else {
                                  next.add(message.id);
                                }
                                return next;
                              });
                            }}
                            className="mt-2 text-xs text-gray-600 hover:text-gray-800 underline"
                          >
                            {isExpanded ? 'Show less' : `Show full script (${lines.length} lines)`}
                          </button>
                        )}
                        <Button
                          onClick={() => handleApplyChanges(message.suggestedChanges!)}
                          className="mt-2 w-full bg-black hover:bg-gray-800 text-white text-xs rounded-[12px]"
                          size="sm"
                        >
                          ✓ Apply to Script
                        </Button>
                      </div>
                    );
                  })()}

                  {/* Action Buttons */}
                  {message.actionButtons && message.actionButtons.length > 0 && (
                    <div className="flex flex-col gap-2 mt-2">
                      {message.actionButtons.map((btn, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleQuickAction(btn.action)}
                          className="w-full px-3 py-1.5 bg-gray-100 text-gray-700 rounded-[12px] text-xs hover:bg-gray-200 transition-colors flex items-center gap-1 border border-gray-200"
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
              <div className="flex justify-start animate-in fade-in">
                <div className="bg-gray-100 rounded-[12px] rounded-tl-sm p-3">
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
            <div className="flex gap-2 items-end">
              <div className="flex-1 relative">
                <textarea
                  ref={inputRef as React.RefObject<HTMLTextAreaElement>}
                  value={inputValue}
                  onChange={(e) => {
                    setInputValue(e.target.value);
                    // Auto-resize textarea
                    e.target.style.height = 'auto';
                    e.target.style.height = `${Math.min(e.target.scrollHeight, 200)}px`;
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      if (inputValue.trim()) {
                        sendMessage(inputValue);
                        // Reset textarea height
                        if (inputRef.current) {
                          (inputRef.current as HTMLTextAreaElement).style.height = 'auto';
                        }
                      }
                    }
                  }}
                  placeholder="Ask me to edit your script..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-[12px] focus:outline-none focus:ring-2 focus:ring-black text-sm resize-none overflow-hidden min-h-[44px] max-h-[200px]"
                  disabled={!threadId || isTyping}
                  rows={1}
                  style={{ height: 'auto' }}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
