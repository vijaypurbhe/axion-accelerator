import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Maximize2, Minimize2, Send, X } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { usePhoenix } from "@/context/PhoenixContext";
import { answerFor, SUGGESTED_PROMPTS, type AssistantAnswer } from "@/lib/assistant";
import { ConfidenceTag } from "@/components/common/Primitives";
import { cn } from "@/lib/utils";

function Markdown({ children }: { children: string }) {
  return (
    <div className="prose prose-sm max-w-none text-sm leading-relaxed text-foreground prose-headings:text-foreground prose-headings:text-sm prose-p:text-foreground prose-strong:font-semibold prose-strong:text-foreground prose-a:text-brand prose-li:text-foreground prose-code:rounded prose-code:bg-secondary prose-code:px-1 prose-code:py-0.5 prose-code:text-xs prose-code:before:content-[''] prose-code:after:content-[''] prose-hr:border-border">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          table: ({ children }) => (
            <div className="my-2 overflow-x-auto rounded-md border border-border">
              <table className="w-full border-collapse text-xs">{children}</table>
            </div>
          ),
          thead: ({ children }) => <thead className="bg-secondary/70">{children}</thead>,
          th: ({ children }) => <th className="border-b border-border px-2.5 py-1.5 text-left font-semibold text-foreground">{children}</th>,
          td: ({ children }) => <td className="border-b border-border px-2.5 py-1.5 align-top text-muted-foreground">{children}</td>,
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}

interface Msg {
  id: string;
  role: "user" | "assistant";
  text: string;
  answer?: AssistantAnswer;
  streaming?: boolean;
}

const THINKING_STEPS = [
  "Interpreting your question…",
  "Retrieving grounded platform records…",
  "Cross-checking exposure, approvals and risk signals…",
  "Composing the response…",
];

export default function AssistantPanel() {
  const { assistantOpen, setAssistantOpen, assistantSeed, clearAssistantSeed, persona } = usePhoenix();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [thinkingStep, setThinkingStep] = useState(0);
  const [streaming, setStreaming] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [expanded, setExpanded] = useState(false);
  const timers = useRef<number[]>([]);

  const clearTimers = () => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
  };
  useEffect(() => () => clearTimers(), []);

  const streamAnswer = (answer: AssistantAnswer) => {
    const id = `a-${Date.now()}`;
    setMessages((prev) => [...prev, { id, role: "assistant", text: "", answer, streaming: true }]);
    setStreaming(true);

    const full = answer.text;
    let index = 0;
    const tick = () => {
      // variable-size chunks so it reads like live typing
      const chunk = 3 + Math.floor(Math.random() * 5);
      index = Math.min(full.length, index + chunk);
      const slice = full.slice(0, index);
      setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, text: slice } : m)));
      if (index < full.length) {
        const prevChar = full[index - 1];
        // pause a little longer at sentence ends and line breaks
        const pause = prevChar === "\n" ? 90 : /[.!?:]/.test(prevChar ?? "") ? 70 : 16 + Math.random() * 22;
        timers.current.push(window.setTimeout(tick, pause));
      } else {
        setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, streaming: false } : m)));
        setStreaming(false);
        inputRef.current?.focus();
      }
    };
    timers.current.push(window.setTimeout(tick, 120));
  };

  const send = (question: string) => {
    const q = question.trim();
    if (!q || thinking || streaming) return;
    clearTimers();
    setMessages((prev) => [...prev, { id: `u-${Date.now()}`, role: "user", text: q }]);
    setInput("");
    setThinking(true);
    setThinkingStep(0);

    THINKING_STEPS.forEach((_, i) => {
      if (i === 0) return;
      timers.current.push(window.setTimeout(() => setThinkingStep(i), i * 620));
    });

    timers.current.push(
      window.setTimeout(() => {
        const answer = answerFor(q);
        setThinking(false);
        streamAnswer(answer);
      }, THINKING_STEPS.length * 620),
    );
  };

  useEffect(() => {
    if (assistantSeed) {
      send(assistantSeed.prompt);
      clearAssistantSeed();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assistantSeed]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, thinking]);

  useEffect(() => {
    if (assistantOpen) inputRef.current?.focus();
  }, [assistantOpen]);

  if (!assistantOpen) return null;

  return (
    <aside
      className={cn(
        "fixed bottom-5 right-5 z-50 flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-2xl",
        expanded ? "h-[85vh] w-[min(46rem,calc(100vw-2.5rem))]" : "h-[min(38rem,calc(100vh-6rem))] w-[min(26rem,calc(100vw-2.5rem))]",
      )}
      role="dialog"
      aria-label="Phoenix AI Assistant"
    >
      <header className="flex items-center justify-between gap-2 border-b border-border bg-secondary/50 px-4 py-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">Phoenix AI Assistant</p>
          <p className="truncate text-xs text-muted-foreground">Grounded in platform records · {persona.title}</p>
        </div>
        <div className="flex shrink-0 items-center">
          <Button
            variant="ghost"
            size="icon"
            aria-label={expanded ? "Collapse assistant" : "Expand assistant"}
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="icon" aria-label="Close assistant" onClick={() => setAssistantOpen(false)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
        {messages.length === 0 && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Ask about clients, projects, approvals, exposure or documents. Every answer cites the records it used.
            </p>
            <div className="space-y-2">
              {SUGGESTED_PROMPTS.map((p) => (
                <button
                  key={p}
                  onClick={() => send(p)}
                  className="w-full rounded-lg border border-border bg-secondary/60 px-3 py-2 text-left text-xs text-foreground hover:bg-secondary"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m) =>
          m.role === "user" ? (
            <div key={m.id} className="ml-auto max-w-[85%] rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground">
              {m.text}
            </div>
          ) : (
            <div key={m.id} className="space-y-2">
              <div className="relative">
                <Markdown>{m.text}</Markdown>
                {m.streaming && (
                  <span className="ml-0.5 inline-block h-4 w-[2px] animate-pulse bg-brand align-text-bottom" aria-hidden />
                )}
              </div>
              {m.answer && !m.streaming && (
                <>
                  <ConfidenceTag value={m.answer.confidence} size="sm" />
                  {m.answer.sources.length > 0 && (
                    <div className="rounded-md border border-border bg-secondary/50 p-2.5">
                      <p className="label-caps mb-1.5">Sources</p>
                      <ul className="space-y-1">
                        {m.answer.sources.map((s) => (
                          <li key={s.label}>
                            <Link to={s.route} className="text-xs font-medium text-brand hover:underline">
                              {s.label}
                            </Link>
                            <span className="text-xs text-muted-foreground"> — {s.detail}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <div className="flex flex-wrap gap-1.5">
                    {m.answer.followUps.map((f) => (
                      <button
                        key={f}
                        onClick={() => send(f)}
                        className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground hover:bg-secondary hover:text-foreground"
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          ),
        )}
        {thinking && (
          <div className="space-y-1.5 rounded-md border border-border bg-secondary/40 px-3 py-2.5">
            <div className="flex items-center gap-2">
              <span className="flex gap-1">
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-brand [animation-delay:-0.2s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-brand [animation-delay:-0.1s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-brand" />
              </span>
              <p className="text-sm font-medium text-foreground">Phoenix is thinking</p>
            </div>
            <p className="text-xs text-muted-foreground">{THINKING_STEPS[thinkingStep]}</p>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <form
        className="border-t border-border p-3"
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
      >
        <Textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send(input);
            }
          }}
          rows={2}
          placeholder="Ask Phoenix about a client, project or risk…"
          className="resize-none"
        />
        <div className="mt-2 flex justify-end">
          <Button type="submit" size="sm" disabled={!input.trim() || thinking || streaming}>
            <Send className="h-4 w-4" />
            Ask
          </Button>
        </div>
      </form>
    </aside>
  );
}
