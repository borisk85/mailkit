"use client";

import { useState, useRef, useEffect } from "react";
import {
  X,
  Send,
  MessageCircle,
  ThumbsUp,
  ThumbsDown,
  ArrowLeft,
  Mail,
} from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
  isFeedback?: boolean;
}

type View = "chat" | "contact" | "sent";

const STORAGE_KEY = "mailkit_support_chat";
const HISTORY_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_SESSION_DISLIKES = 3;

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

export default function SupportChatWidget() {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<View>("chat");
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: GREETING },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [ratings, setRatings] = useState<Record<number, "up" | "down">>({});
  const [sessionDislikes, setSessionDislikes] = useState(0);

  // Contact form state
  const [cfName, setCfName] = useState("");
  const [cfEmail, setCfEmail] = useState("");
  const [cfMessage, setCfMessage] = useState("");
  const [cfSending, setCfSending] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const initialized = useRef(false);
  const ratedIdxRef = useRef<Set<number>>(new Set());

  const showSuggestions =
    !loading &&
    messages.filter((m) => !m.isFeedback).length === 1 &&
    messages[0].role === "assistant";

  const hasConversation = messages.filter((m) => !m.isFeedback).length > 1;

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
    if (open && view === "chat") {
      setTimeout(
        () => bottomRef.current?.scrollIntoView({ behavior: "smooth" }),
        50,
      );
      inputRef.current?.focus();
    }
  }, [open, messages, view]);

  function openContactForm() {
    // Pre-fill message from last user question
    const lastUserMsg = [...messages]
      .reverse()
      .find((m) => m.role === "user" && !m.isFeedback);
    setCfMessage(lastUserMsg ? lastUserMsg.content : "");
    setView("contact");
  }

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
    if (ratings[idx] === val) return;
    if (ratedIdxRef.current.has(idx)) return;
    if (val === "down" && sessionDislikes >= MAX_SESSION_DISLIKES) return;

    ratedIdxRef.current.add(idx);
    setRatings((prev) => ({ ...prev, [idx]: val }));

    const assistantMsg = messages[idx];
    const userMsg = idx > 0 ? messages[idx - 1] : null;

    if (val === "down") setSessionDislikes((n) => n + 1);

    setMessages((prev) => [
      ...prev,
      {
        role: "assistant",
        content:
          val === "up"
            ? "Thanks for the feedback!"
            : 'Got it. If you need a human, tap "Contact support" below.',
        isFeedback: true,
      },
    ]);

    fetch("/api/support/feedback", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        rating: val,
        assistantReply: assistantMsg?.content ?? "",
        userQuestion: userMsg?.role === "user" ? userMsg.content : null,
      }),
    }).catch(() => {});
  }

  async function submitContact(e: React.FormEvent) {
    e.preventDefault();
    if (!cfEmail.trim() || !cfMessage.trim() || cfSending) return;
    setCfSending(true);

    try {
      await fetch("/api/support/contact", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: cfName.trim(),
          email: cfEmail.trim(),
          message: cfMessage.trim(),
        }),
      });
      setView("sent");
    } catch {
      // Still show sent — message may have gone through
      setView("sent");
    } finally {
      setCfSending(false);
    }
  }

  const panelClass =
    "flex w-[calc(100vw-3rem)] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl shadow-black/60 sm:w-[380px]";

  const header = (title: string, onBack?: () => void) => (
    <div className="flex items-center justify-between border-b border-border bg-card px-5 py-4">
      <div className="flex items-center gap-2">
        {onBack && (
          <button
            onClick={onBack}
            className="mr-1 p-1 text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Back to chat"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
        )}
        <div>
          <p className="text-sm font-semibold text-foreground">{title}</p>
          <p className="text-xs text-green-500">Online</p>
        </div>
      </div>
      <button
        onClick={() => {
          setOpen(false);
          setView("chat");
        }}
        aria-label="Close"
        className="p-1 text-muted-foreground transition-colors hover:text-foreground"
      >
        <X className="h-5 w-5" />
      </button>
    </div>
  );

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {open && view === "chat" && (
        <div className={panelClass}>
          {header("MailKit Support")}

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
                    <button
                      onClick={() => rate(i, "down")}
                      disabled={
                        !ratings[i] && sessionDislikes >= MAX_SESSION_DISLIKES
                      }
                      className={`rounded-md p-1.5 transition-colors disabled:cursor-not-allowed disabled:opacity-30 ${ratings[i] === "down" ? "text-red-500" : "text-muted-foreground hover:text-foreground"}`}
                      title="Not helpful"
                      aria-label="Not helpful"
                    >
                      <ThumbsDown className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>
            ))}

            {showSuggestions && (
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

            {/* Escalation link — shown after first bot reply */}
            {hasConversation && (
              <button
                onClick={openContactForm}
                className="mt-2 flex w-full items-center justify-center gap-1.5 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
              >
                <Mail className="h-3 w-3" />
                Still need help? Contact support
              </button>
            )}
            {!hasConversation && (
              <p className="mt-2 text-center text-[10px] text-muted-foreground">
                AI assistant · complex issues →{" "}
                <button onClick={openContactForm} className="hover:underline">
                  contact us
                </button>
              </p>
            )}
          </div>
        </div>
      )}

      {/* Contact form view */}
      {open && view === "contact" && (
        <div className={panelClass}>
          {header("Contact support", () => setView("chat"))}

          <form
            onSubmit={submitContact}
            className="flex flex-col gap-3 px-5 py-5"
          >
            <p className="text-sm text-muted-foreground">
              We&apos;ll reply to your email within 24 hours.
            </p>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-foreground">
                Your name
              </label>
              <input
                type="text"
                value={cfName}
                onChange={(e) => setCfName(e.target.value)}
                placeholder="Alex"
                maxLength={100}
                className="rounded-xl bg-muted px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary/50"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-foreground">
                Your email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                required
                value={cfEmail}
                onChange={(e) => setCfEmail(e.target.value)}
                placeholder="you@example.com"
                maxLength={200}
                className="rounded-xl bg-muted px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary/50"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-foreground">
                Your question <span className="text-red-500">*</span>
              </label>
              <textarea
                required
                value={cfMessage}
                onChange={(e) => setCfMessage(e.target.value)}
                placeholder="Describe your issue..."
                maxLength={2000}
                rows={4}
                className="resize-none rounded-xl bg-muted px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary/50"
              />
            </div>

            <button
              type="submit"
              disabled={cfSending || !cfEmail.trim() || !cfMessage.trim()}
              className="flex items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-medium text-primary-foreground transition-all hover:opacity-90 disabled:opacity-40"
            >
              {cfSending ? (
                <>
                  <svg
                    className="h-4 w-4 animate-spin"
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
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Send message
                </>
              )}
            </button>
          </form>
        </div>
      )}

      {/* Sent confirmation */}
      {open && view === "sent" && (
        <div className={panelClass}>
          {header("Contact support")}

          <div className="flex flex-col items-center gap-4 px-5 py-10 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-500/15">
              <svg
                className="h-6 w-6 text-green-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">
                Message sent!
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                We&apos;ll reply to your email within 24 hours.
              </p>
            </div>
            <button
              onClick={() => setView("chat")}
              className="text-xs text-primary hover:underline"
            >
              ← Back to chat
            </button>
          </div>
        </div>
      )}

      {/* Toggle button */}
      <div className="relative">
        <button
          onClick={() => {
            setOpen((v) => !v);
            if (open) setView("chat");
          }}
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
