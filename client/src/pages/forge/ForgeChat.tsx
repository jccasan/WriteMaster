import { useState, useRef, useEffect } from "react";
import { useParams } from "wouter";
import ForgeLayout from "@/components/forge/ForgeLayout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Send, Trash2, Sparkles, User, Bot } from "lucide-react";
import { cn } from "@/lib/utils";

interface Message {
  role: "user" | "assistant";
  content: string;
}

function renderMarkdown(text: string) {
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  let inList = false;

  lines.forEach((line, i) => {
    if (line.startsWith("### ")) {
      elements.push(<h3 key={i} className="text-amber-300 font-semibold text-sm mt-3 mb-1">{line.slice(4)}</h3>);
    } else if (line.startsWith("## ")) {
      elements.push(<h2 key={i} className="text-amber-400 font-semibold mt-3 mb-1">{line.slice(3)}</h2>);
    } else if (line.startsWith("**") && line.endsWith("**")) {
      elements.push(<p key={i} className="font-semibold text-gray-200 mt-2 mb-0.5">{line.slice(2, -2)}</p>);
    } else if (line.startsWith("- ") || line.startsWith("* ")) {
      if (!inList) inList = true;
      elements.push(
        <div key={i} className="flex items-start gap-2 ml-2">
          <span className="text-amber-500 mt-1 shrink-0">•</span>
          <span>{renderInline(line.slice(2))}</span>
        </div>
      );
    } else if (line.match(/^\d+\.\s/)) {
      const content = line.replace(/^\d+\.\s/, "");
      elements.push(
        <div key={i} className="flex items-start gap-2 ml-2">
          <span className="text-amber-500/60 mt-0 shrink-0 text-xs font-mono">{line.match(/^\d+/)![0]}.</span>
          <span>{renderInline(content)}</span>
        </div>
      );
    } else if (line.trim() === "") {
      inList = false;
      elements.push(<div key={i} className="h-2" />);
    } else {
      inList = false;
      elements.push(<p key={i}>{renderInline(line)}</p>);
    }
  });

  return <>{elements}</>;
}

function renderInline(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
    const italicMatch = remaining.match(/(?<!\*)\*([^*]+)\*(?!\*)/);
    const codeMatch = remaining.match(/`([^`]+)`/);

    let firstMatch: { index: number; length: number; node: React.ReactNode } | null = null;

    if (boldMatch && boldMatch.index !== undefined) {
      const candidate = { index: boldMatch.index, length: boldMatch[0].length, node: <strong key={key++} className="text-gray-100 font-semibold">{boldMatch[1]}</strong> };
      if (!firstMatch || candidate.index < firstMatch.index) firstMatch = candidate;
    }
    if (italicMatch && italicMatch.index !== undefined) {
      const candidate = { index: italicMatch.index, length: italicMatch[0].length, node: <em key={key++} className="text-gray-300 italic">{italicMatch[1]}</em> };
      if (!firstMatch || candidate.index < firstMatch.index) firstMatch = candidate;
    }
    if (codeMatch && codeMatch.index !== undefined) {
      const candidate = { index: codeMatch.index, length: codeMatch[0].length, node: <code key={key++} className="bg-gray-800 text-amber-300 px-1 py-0.5 rounded text-xs">{codeMatch[1]}</code> };
      if (!firstMatch || candidate.index < firstMatch.index) firstMatch = candidate;
    }

    if (firstMatch) {
      if (firstMatch.index > 0) parts.push(remaining.slice(0, firstMatch.index));
      parts.push(firstMatch.node);
      remaining = remaining.slice(firstMatch.index + firstMatch.length);
    } else {
      parts.push(remaining);
      break;
    }
  }

  return parts.length === 1 && typeof parts[0] === "string" ? parts[0] : <>{parts}</>;
}

const SUGGESTIONS = [
  "What are the biggest issues with my manuscript?",
  "How can I improve the pacing in the middle act?",
  "Which characters need more development?",
  "What are the strongest scenes and why?",
  "Are there any plot holes I should address?",
  "How is the voice consistency across chapters?",
];

export default function ForgeChat() {
  const params = useParams<{ id: string }>();
  const projectId = params.id;

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async (text?: string) => {
    const content = text || input.trim();
    if (!content || loading) return;

    const userMsg: Message = { role: "user", content };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);
    setError(null);

    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch(`/api/forge/projects/${projectId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages }),
        signal: controller.signal,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Chat failed");
      }
      const data = await res.json();
      setMessages([...newMessages, { role: "assistant", content: data.reply }]);
    } catch (err: any) {
      if (err.name === "AbortError") return;
      setError(err.message);
    }
    setLoading(false);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <ForgeLayout projectId={projectId}>
      <div className="flex flex-col h-[calc(100vh-3.5rem-4rem)]" data-testid="forge-chat">
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-amber-400" data-testid="text-chat-heading">Chat with AI</h1>
          <p className="text-gray-500 text-sm mt-1">Ask questions about your manuscript — the AI has full context from your project's analysis.</p>
        </div>

        <div className="flex-1 overflow-y-auto rounded-lg border border-amber-900/20 bg-gray-900/30 p-4 space-y-4">
          {messages.length === 0 && !loading && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <Sparkles className="w-10 h-10 text-amber-500/30 mb-4" />
              <p className="text-gray-500 text-sm mb-6">Start a conversation about your manuscript. The AI knows your characters, plot, issues, and editorial feedback.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-lg w-full">
                {SUGGESTIONS.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => send(s)}
                    className="text-left px-3 py-2 rounded-lg border border-gray-800 hover:border-amber-900/40 hover:bg-gray-800/50 transition-colors text-gray-400 text-sm"
                    data-testid={`button-suggestion-${i}`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div
              key={i}
              className={cn(
                "flex gap-3",
                msg.role === "user" ? "justify-end" : "justify-start"
              )}
              data-testid={`message-${msg.role}-${i}`}
            >
              {msg.role === "assistant" && (
                <div className="w-7 h-7 rounded-full bg-amber-600/20 flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="w-4 h-4 text-amber-400" />
                </div>
              )}
              <div
                className={cn(
                  "rounded-lg px-4 py-3 max-w-[80%] text-sm leading-relaxed",
                  msg.role === "user"
                    ? "bg-amber-600/20 text-gray-200"
                    : "bg-gray-800/60 text-gray-300"
                )}
              >
                {msg.role === "assistant" ? renderMarkdown(msg.content) : msg.content}
              </div>
              {msg.role === "user" && (
                <div className="w-7 h-7 rounded-full bg-gray-700 flex items-center justify-center shrink-0 mt-0.5">
                  <User className="w-4 h-4 text-gray-300" />
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex gap-3" data-testid="message-loading">
              <div className="w-7 h-7 rounded-full bg-amber-600/20 flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4 text-amber-400" />
              </div>
              <div className="bg-gray-800/60 rounded-lg px-4 py-3">
                <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-900/20 border border-red-800/40 rounded-lg p-3 text-red-300 text-sm" data-testid="text-chat-error">
              {error}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        <div className="mt-3 flex gap-2 items-end">
          {messages.length > 0 && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => { if (abortRef.current) abortRef.current.abort(); setMessages([]); setError(null); setLoading(false); }}
              className="text-gray-500 hover:text-gray-300 shrink-0 h-10 w-10"
              title="Clear chat"
              data-testid="button-clear-chat"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
          <Textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your manuscript..."
            className="resize-none min-h-[40px] max-h-[120px] bg-gray-900 border-gray-800 text-sm"
            rows={1}
            disabled={loading}
            data-testid="input-chat"
          />
          <Button
            onClick={() => send()}
            disabled={loading || !input.trim()}
            size="icon"
            className="bg-amber-600 hover:bg-amber-700 text-gray-950 shrink-0 h-10 w-10"
            data-testid="button-send"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </ForgeLayout>
  );
}
