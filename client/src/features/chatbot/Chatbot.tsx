import { useState, useRef, useEffect } from "react";
import { Send, X, Bot, Settings, Loader2 } from "lucide-react";
import {
  sendChatMessage,
  type ChatMessage,
} from "../../api/chatbot";
import { useAuth } from "../../context/AuthContext";
import { theme } from "../../styles/theme";
import { invalidateStoriesCache } from "../../hooks/useStories";

const styles = {
  container: {
    position: "fixed" as const,
    bottom: "20px",
    right: "20px",
    zIndex: 1000,
    fontFamily: "'Lucida Grande', sans-serif",
  },
  toggleButton: {
    width: "60px",
    height: "60px",
    borderRadius: "50%",
    backgroundColor: theme.colors.accent.primary,
    border: "none",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
    transition: "transform 0.2s ease",
  },
  chatWindow: {
    position: "absolute" as const,
    bottom: "80px",
    right: "0",
    width: "380px",
    height: "520px",
    backgroundColor: theme.colors.surface,
    borderRadius: "16px",
    boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
    display: "flex",
    flexDirection: "column" as const,
    overflow: "hidden",
    border: `1px solid ${theme.colors.border}`,
  },
  header: {
    padding: "16px",
    backgroundColor: theme.colors.background,
    borderBottom: `1px solid ${theme.colors.border}`,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    color: theme.colors.text.primary,
    fontSize: theme.fontSize.lg,
    fontWeight: 600,
  },
  modeToggle: {
    display: "flex",
    gap: "8px",
    padding: "12px",
    backgroundColor: theme.colors.background,
    borderBottom: `1px solid ${theme.colors.border}`,
  },
  modeButton: (active: boolean) => ({
    flex: 1,
    padding: "8px 12px",
    borderRadius: "8px",
    border: "none",
    cursor: "pointer",
    fontSize: theme.fontSize.sm,
    fontWeight: 500,
    backgroundColor: active
      ? theme.colors.accent.primary
      : theme.colors.surface,
    color: active ? "#fff" : theme.colors.text.secondary,
    transition: "all 0.2s ease",
  }),
  messagesContainer: {
    flex: 1,
    overflowY: "auto" as const,
    padding: "16px",
    display: "flex",
    flexDirection: "column" as const,
    gap: "12px",
  },
  message: (isUser: boolean) => ({
    maxWidth: "85%",
    padding: "12px 16px",
    borderRadius: "16px",
    fontSize: theme.fontSize.md,
    lineHeight: 1.6,
    alignSelf: isUser ? "flex-end" : "flex-start",
    backgroundColor: isUser
      ? theme.colors.accent.primary
      : theme.colors.background,
    color: isUser ? "#fff" : theme.colors.text.primary,
    borderBottomRightRadius: isUser ? "4px" : "16px",
    borderBottomLeftRadius: isUser ? "16px" : "4px",
    whiteSpace: "pre-line" as const,
    wordBreak: "break-word" as const,
  }),
  inputContainer: {
    padding: "16px",
    borderTop: `1px solid ${theme.colors.border}`,
    display: "flex",
    gap: "8px",
  },
  input: {
    flex: 1,
    padding: "12px 16px",
    borderRadius: "24px",
    border: `1px solid ${theme.colors.border}`,
    backgroundColor: theme.colors.background,
    color: theme.colors.text.primary,
    fontSize: theme.fontSize.md,
    outline: "none",
    fontFamily: "inherit",
  },
  sendButton: {
    width: "44px",
    height: "44px",
    borderRadius: "50%",
    backgroundColor: theme.colors.accent.primary,
    border: "none",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "transform 0.2s ease",
  },
  loadingIndicator: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    color: theme.colors.text.muted,
    fontSize: theme.fontSize.sm,
    padding: "8px 16px",
  },
  };

export const Chatbot = () => {
  const { isAuthenticated } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<"inquiry" | "crud">("inquiry");
  const [inquiryMessages, setInquiryMessages] = useState<ChatMessage[]>([]);
  const [crudMessages, setCrudMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const currentMessages = mode === "inquiry" ? inquiryMessages : crudMessages;
  const setCurrentMessages =
    mode === "inquiry" ? setInquiryMessages : setCrudMessages;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [currentMessages]);

  // Show welcome message when chatbot opens
  useEffect(() => {
    if (!isOpen || !isAuthenticated) return;
    
    const existingMessages = mode === "inquiry" ? inquiryMessages : crudMessages;
    if (existingMessages.length > 0) return;
    
    const welcomeMsg: ChatMessage = {
      id: "welcome",
      role: "assistant",
      content: mode === "crud"
        ? "Hi! I'm AI3, your story helper! 📚✨\n\nI can help you:\n• Find and manage your stories\n• Create new story templates\n• Edit and update your works\n• Delete stories you no longer want\n\nWhat would you like to do?"
        : "Hi! I'm AI3, your story discovery buddy! 🔍✨\n\nI can help you:\n• Search stories by genre, author, or tags\n• Discover new reads\n• Pick a random story if you're feeling adventurous!\n• Filter and narrow down your search\n\nWhat are you looking for?",
      timestamp: Date.now(),
    };
    setCurrentMessages([welcomeMsg]);
  }, [isOpen, isAuthenticated, mode]);

  const handleSend = async () => {
    if (!input.trim() || loading || !isAuthenticated) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: input.trim(),
      timestamp: Date.now(),
    };

    setCurrentMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const contextMessages = currentMessages.slice(-10);
      const response = await sendChatMessage(
        input.trim(),
        mode,
        contextMessages,
      );

      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: response.response,
        timestamp: Date.now(),
      };

      const hiddenToolMessages = (response.toolMessages || []).map((toolMsg, index) => ({
        ...toolMsg,
        id: toolMsg.id || `tool-${Date.now()}-${index}`,
        timestamp: toolMsg.timestamp || Date.now(),
      }));

      setCurrentMessages((prev) => [...prev, assistantMessage, ...hiddenToolMessages]);

      // Invalidate cache after CRUD operations
      if (mode === "crud" && response.functionCalls) {
        const hasMutations = response.functionCalls.some(
          fc => fc.function === "delete_story" || fc.function === "update_story" || fc.function === "create_story"
        );
        if (hasMutations) {
          invalidateStoriesCache();
        }
      }
    } catch (error: unknown) {
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        role: "assistant",
        content:
          error instanceof Error
            ? error.message
            : "Sorry, I encountered an error. Please try again.",
        timestamp: Date.now(),
      };
      setCurrentMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  // No separate confirm handler - all confirmation is done in chat

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const switchMode = (newMode: "inquiry" | "crud") => {
    if (newMode === mode) return;
    setMode(newMode);
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div style={styles.container}>
      {isOpen && (
        <div style={styles.chatWindow}>
          <div style={styles.header}>
            <div style={styles.headerTitle}>
              <Bot size={24} />
              <span>AI3</span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "4px",
              }}
            >
              <X size={20} color={theme.colors.text.muted} />
            </button>
          </div>

          <div style={styles.modeToggle}>
            <button
              style={styles.modeButton(mode === "inquiry")}
              onClick={() => switchMode("inquiry")}
            >
              <Bot size={14} style={{ marginRight: "4px" }} />
              Inquiry
            </button>
            <button
              style={styles.modeButton(mode === "crud")}
              onClick={() => switchMode("crud")}
            >
              <Settings size={14} style={{ marginRight: "4px" }} />
              CRUD Mode
            </button>
          </div>

          <div style={styles.messagesContainer}>
            {currentMessages.map((msg) => {
              if (msg.role === "tool") return null;

              return (
                <div key={msg.id} style={styles.message(msg.role === "user")}>
                  {msg.content}
                </div>
              );
            })}
            {loading && (
              <div style={styles.loadingIndicator}>
                <Loader2 size={16} className="animate-spin" />
                <span>Thinking...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div style={styles.inputContainer}>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              style={styles.input}
              disabled={loading}
            />
            <button
              onClick={handleSend}
              style={{
                ...styles.sendButton,
                opacity: loading ? 0.5 : 1,
                cursor: loading ? "not-allowed" : "pointer",
              }}
              disabled={loading}
            >
              <Send size={20} color="#fff" />
            </button>
          </div>

          
        </div>
      )}

      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          ...styles.toggleButton,
          transform: isOpen ? "rotate(90deg)" : "rotate(0)",
        }}
      >
        {isOpen ? <X size={24} color="#fff" /> : <Bot size={24} color="#fff" />}
      </button>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </div>
  );
};
