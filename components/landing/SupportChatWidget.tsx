"use client";

import { useState, useRef, useEffect } from "react";
import { X, Send, MessageCircle, ThumbsUp, ThumbsDown } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
  isFeedback?: boolean;
}

const STORAGE_KEY = "mailkit_support_chat";
const HISTORY_TTL_MS = 24 * 60 * 60 * 1000;

const GREETING =
  "Hi! I'm the MailKit support assistant. Ask me anything about setup, pricing, or refunds.";

const SUGGESTED_QUESTIONS = [
  "How long does setup take?",
  "What if my domain isn't on Cloudflare?",
  "What are the sending limits?",
  "How do I get a refund?",
];

interface StoredHistory {
  messages: Message[];
  lastActivity: number;
}

function loadHistory(): Message[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as StoredHistory;
      if (
        parsed?.messages &&
        Array.isArray(parsed.messages) &&
        typeof parsed.lastActivity === "number" &&
        Date.now() - parsed.lastActivity <= HISTORY_TTL_MS &&
        parsed.messages.length > 0
      ) {
        return parsed.messages;
      }
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch {}
  return [{ role: "assistant", content: GREETING }];
}

function saveHistory(messages: Message[]) {
  try {
    const stored: StoredHistory = { messages, lastActivity: Date.now() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
  } catch {}
}

function buildEscalationMailto(messages: Message[]): string {
  const transcript = messages
    .filter((m) => !m.isFeedback)
    .map((m) => `${m.role === "user" ? "You" : "Assistant"}: ${m.content}`)
    .join("\n\n");

  const body = encodeURIComponent(
    `Hi,\n\nThe support assistant couldn't help me. Here's our conversation:\n\n${transcript}\n\nMy question: `,
  );
  return `mailto:support@getmailkit.com?subject=${encodeURIComponent("Support needed — chat history attached")}&body=${body}`;
}

export default function SupportChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: GREETING },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [ratings, setRatings] = useState<Record<number, "up" | "down">>({});
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const initialized = useRef(false);

  // Derived: show suggestions only while the conversation has just the greeting
  const showSuggestions =
    !loading &&
    messages.filter((m) => !m.isFeedback).length === 1 &&
    messages[0].role === "assistant";

  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      setMessages(loadHistory());
    }
  }, []);

  useEffect(() => {
    if (initialized.current) saveHistory(messages);
  }, [messages]);

  useEffect(() => {
    if (open) {
      setTimeout(
        () => bottomRef.current?.scrollIntoView({ behavior: "smooth" }),
        50,
      );
      inputRef.current?.focus();
    }
  }, [open, messages]);

  async function send(text?: string) {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;

    setMessages((prev) => [...prev, { role: "user", content: msg }]);
    setInput("");
    setLoading(true);

    try {
      const history = messages.filter((m) => !m.isFeedback).slice(1);
      const res = await fetch("/api/support/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: msg, history }),
      });
      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            data.reply ??
            data.error ??
            "Something went wrong. Email us at support@getmailkit.com.",
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Failed to connect. Email us at support@getmailkit.com.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function onKey(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  function rate(idx: number, val: "up" | "down") {
    setRatings((prev) => {
      const copy = { ...prev };
      if (copy[idx] === val) {
        delete copy[idx];
      } else {
        copy[idx] = val;
      }
      return copy;
    });

    if (val === "up") {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Thanks for the feedback!",
          isFeedback: true,
        },
      ]);
    }
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {open && (
        <div className="flex w-[calc(100vw-3rem)] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl shadow-black/60 sm:w-[380px]">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border bg-card px-5 py-4">
            <div>
              <p className="text-sm font-semibold text-foreground">
                MailKit Support
              </p>
              <p className="text-xs text-green-500">Online</p>
            </div>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close chat"
              className="p-1 text-muted-foreground transition-colors hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Messages */}
          <div className="min-h-[260px] max-h-[340px] flex-1 space-y-3 overflow-y-auto overflow-x-hidden px-4 py-4 sm:min-h-[340px] sm:max-h-[440px]">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex min-w-0 flex-col ${m.role === "user" ? "items-end" : "items-start"}`}
              >
                <div
                  className={`flex w-full min-w-0 gap-3 ${m.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  {m.role === "assistant" && (
                    <div className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                      M
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] min-w-0 whitespace-pre-line break-words rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                      m.role === "user"
                        ? "rounded-br-sm bg-primary text-primary-foreground"
                        : "rounded-bl-sm bg-muted text-foreground"
                    }`}
                  >
                    {m.content}
                  </div>
                </div>

                {/* Thumbs for assistant messages (not the first greeting, not feedback) */}
                {m.role === "assistant" && i > 0 && !m.isFeedback && (
                  <div className="ml-10 mt-1 flex gap-0.5">
                    <button
                      onClick={() => rate(i, "up")}
                      className={`rounded-md p-1.5 transition-colors ${ratings[i] === "up" ? "text-green-500" : "text-muted-foreground hover:text-foreground"}`}
                      title="Helpful"
                      aria-label="Helpful"
                    >
                      <ThumbsUp className="h-3.5 w-3.5" />
                    </button>
                    <a
                      href={buildEscalationMailto(messages.slice(0, i + 1))}
                      onClick={() => rate(i, "down")}
                      className={`rounded-md p-1.5 transition-colors ${ratings[i] === "down" ? "text-red-500" : "text-muted-foreground hover:text-foreground"}`}
                      title="Not helpful — email support"
                      aria-label="Not helpful"
                    >
                      <ThumbsDown className="h-3.5 w-3.5" />
                    </a>
                  </div>
                )}
              </div>
            ))}

            {/* Suggested questions — shown only at start */}
            {showSuggestions && !loading && (
              <div className="space-y-2 pt-1">
                {SUGGESTED_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    onClick={() => send(q)}
                    className="block w-full rounded-xl border border-border bg-background px-3 py-2 text-left text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}

            {loading && (
              <div className="flex justify-start gap-3">
                <div className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                  M
                </div>
                <div className="flex items-center gap-2 rounded-2xl rounded-bl-sm bg-muted px-4 py-3">
                  <svg
                    className="h-3.5 w-3.5 animate-spin text-muted-foreground"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                    />
                  </svg>
                  <span className="text-sm text-muted-foreground">
                    Thinking...
                  </span>
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="border-t border-border bg-background px-4 py-3">
            <div className="flex items-center gap-2 rounded-xl bg-muted px-3 py-1.5">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  e.target.style.height = "24px";
                  e.target.style.height =
                    Math.min(e.target.scrollHeight, 80) + "px";
                }}
                onKeyDown={onKey}
                placeholder="Ask a question..."
                maxLength={500}
                rows={1}
                className="flex-1 resize-none bg-transparent text-foreground placeholder:text-muted-foreground outline-none"
                style={{
                  height: "24px",
                  maxHeight: "80px",
                  fontSize: "16px",
                  lineHeight: "24px",
                }}
              />
              <button
                onClick={() => send()}
                disabled={loading || !input.trim()}
                aria-label="Send message"
                className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-primary transition-all hover:opacity-90 disabled:opacity-30"
              >
                <Send className="h-3.5 w-3.5 text-primary-foreground" />
              </button>
            </div>
            <p className="mt-2 text-center text-[10px] leading-snug text-muted-foreground">
              AI assistant — for complex issues{" "}
              <a
                href="mailto:support@getmailkit.com"
                className="hover:underline"
              >
                email us →
              </a>
            </p>
          </div>
        </div>
      )}

      {/* Toggle button */}
      <div className="relative">
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-primary shadow-lg transition-all hover:scale-105 hover:shadow-xl active:scale-95"
          aria-label="Open support chat"
        >
          {open ? (
            <X className="h-6 w-6 text-primary-foreground" />
          ) : (
            <MessageCircle className="h-6 w-6 text-primary-foreground" />
          )}
        </button>
        {!open && (
          <span className="absolute right-0.5 top-0.5">
            <span className="relative flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-60" />
              <span className="relative inline-flex h-3 w-3 rounded-full border-2 border-background bg-green-500" />
            </span>
          </span>
        )}
      </div>
    </div>
  );
}
