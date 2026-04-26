import { useState, useRef, useEffect } from "react";
import { Send, X, Bot, Settings, Loader2, AlertCircle } from "lucide-react";
import { sendChatMessage, confirmAction, type ChatMessage } from "../../api/chatbot";
import { useAuth } from "../../context/AuthContext";
import { theme } from "../../styles/theme";

interface ConfirmDialogState {
  open: boolean;
  action: "delete" | "update" | null;
  storyId: string | null;
  storyTitle: string;
  data?: Record<string, unknown>;
}

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
    backgroundColor: active ? theme.colors.accent.primary : theme.colors.surface,
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
    backgroundColor: isUser ? theme.colors.accent.primary : theme.colors.background,
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
  confirmDialog: {
    position: "absolute" as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.7)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "24px",
  },
  confirmContent: {
    backgroundColor: theme.colors.surface,
    borderRadius: "16px",
    padding: "24px",
    maxWidth: "320px",
    textAlign: "center" as const,
  },
  confirmButtons: {
    display: "flex",
    gap: "12px",
    marginTop: "20px",
    justifyContent: "center",
  },
  confirmButton: (danger: boolean) => ({
    padding: "10px 24px",
    borderRadius: "8px",
    border: "none",
    cursor: "pointer",
    fontWeight: 500,
    fontSize: theme.fontSize.md,
    backgroundColor: danger ? theme.colors.danger.primary : theme.colors.accent.primary,
    color: "#fff",
  }),
  loginPrompt: {
    padding: "24px",
    textAlign: "center" as const,
    color: theme.colors.text.muted,
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
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState>({
    open: false,
    action: null,
    storyId: null,
    storyTitle: "",
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const currentMessages = mode === "inquiry" ? inquiryMessages : crudMessages;
  const setCurrentMessages = mode === "inquiry" ? setInquiryMessages : setCrudMessages;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [currentMessages]);

  useEffect(() => {
    if (!isOpen) return;
    
    if (!isAuthenticated) return;
    
    const existingMessages = mode === "inquiry" ? inquiryMessages : crudMessages;
    
    if (existingMessages.length === 0) {
      const welcomeMsg: ChatMessage = {
        id: "welcome",
        role: "assistant",
        content: mode === "crud"
          ? "Hello! I'm your AI assistant for story management.\n\n📖 I can help you search for stories\n✏️ Create new story templates\n📝 Update your existing stories\n🗑️ Delete your stories\n\nWhat would you like to do?"
          : "Hello! I'm your AI assistant for finding stories.\n\n🔍 I can help you:\n• Search stories by title, author, genre, or tags\n• Discover new stories\n• Get recommendations\n\nWhat are you looking for?",
        timestamp: Date.now(),
      };
      setCurrentMessages([welcomeMsg]);
    }
  }, [isOpen, isAuthenticated]);

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
      const response = await sendChatMessage(input.trim(), mode, contextMessages);

      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: response.response,
        timestamp: Date.now(),
      };

      setCurrentMessages((prev) => [...prev, assistantMessage]);

      if (mode === "crud" && response.functionCalls) {
        for (const fc of response.functionCalls) {
          if (fc.function === "delete_story" || fc.function === "update_story") {
            const storyId = fc.args.storyId as string;
            const storyTitle = (fc.args.title as string) || "this story";
            setConfirmDialog({
              open: true,
              action: fc.function === "delete_story" ? "delete" : "update",
              storyId,
              storyTitle,
              data: fc.args,
            });
            break;
          }
        }
      }
    } catch (error: unknown) {
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        role: "assistant",
        content: error instanceof Error ? error.message : "Sorry, I encountered an error. Please try again.",
        timestamp: Date.now(),
      };
      setCurrentMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async (confirmed: boolean) => {
    if (!confirmed || !confirmDialog.storyId) {
      setConfirmDialog({ open: false, action: null, storyId: null, storyTitle: "" });
      return;
    }

    setLoading(true);
    try {
      const result = await confirmAction(
        confirmDialog.action!,
        confirmDialog.storyId,
        true,
        confirmDialog.data
      );

      const resultMessage: ChatMessage = {
        id: `result-${Date.now()}`,
        role: "assistant",
        content: result.success
          ? result.message
          : `Operation failed: ${result.message}`,
        timestamp: Date.now(),
      };
      setCurrentMessages((prev) => [...prev, resultMessage]);
    } catch (error: unknown) {
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        role: "assistant",
        content: "Sorry, I encountered an error while processing your request.",
        timestamp: Date.now(),
      };
      setCurrentMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
      setConfirmDialog({ open: false, action: null, storyId: null, storyTitle: "" });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const switchMode = (newMode: "inquiry" | "crud") => {
    if (newMode === mode) return;

    const otherModeMessages = newMode === "inquiry" ? crudMessages : inquiryMessages;
    const currentModeMessages = newMode === "inquiry" ? inquiryMessages : crudMessages;
    const setCurrentModeMessages = newMode === "inquiry" ? setInquiryMessages : setCrudMessages;

    if (currentModeMessages.length === 0) {
      const welcomeMsg: ChatMessage = {
        id: "welcome",
        role: "assistant",
        content: newMode === "crud"
          ? "🔧 **CRUD Mode**\n\nI can help you:\n📖 Search stories\n✏️ Create new stories\n📝 Update your stories\n🗑️ Delete your stories\n\nWhat would you like to do?"
          : "🔍 **Inquiry Mode**\n\nI can help you:\n• Search stories by genre, author, tags\n• Discover new stories\n• Get recommendations\n\nWhat are you looking for?",
        timestamp: Date.now(),
      };
      setCurrentModeMessages([welcomeMsg]);
    } else if (otherModeMessages.length > 0) {
      const switchMsg: ChatMessage = {
        id: `switch-${Date.now()}`,
        role: "assistant",
        content: `↩️ Switched from ${newMode === "inquiry" ? "CRUD" : "inquiry"} mode. Your previous conversation (${otherModeMessages.length} messages) is saved.`,
        timestamp: Date.now(),
      };
      setCurrentModeMessages(prev => [...prev, switchMsg]);
    }

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
              <span>AI Assistant</span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              style={{ background: "none", border: "none", cursor: "pointer", padding: "4px" }}
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
            {currentMessages.map((msg) => (
              <div
                key={msg.id}
                style={styles.message(msg.role === "user")}
              >
                {msg.content}
              </div>
            ))}
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

          {confirmDialog.open && (
            <div style={styles.confirmDialog}>
              <div style={styles.confirmContent}>
                <AlertCircle size={48} color={theme.colors.danger.primary} />
                <h3 style={{ marginTop: "16px", color: theme.colors.text.primary }}>
                  Confirm {confirmDialog.action === "delete" ? "Delete" : "Update"}
                </h3>
                <p style={{ marginTop: "8px", color: theme.colors.text.muted }}>
                  Are you sure you want to {confirmDialog.action} "{confirmDialog.storyTitle}"?
                </p>
                <div style={styles.confirmButtons}>
                  <button
                    style={styles.confirmButton(false)}
                    onClick={() => handleConfirm(false)}
                  >
                    Cancel
                  </button>
                  <button
                    style={styles.confirmButton(true)}
                    onClick={() => handleConfirm(true)}
                  >
                    {confirmDialog.action === "delete" ? "Delete" : "Update"}
                  </button>
                </div>
              </div>
            </div>
          )}
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