"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

import { askAssistantAction } from "@/app/assistant/actions";
import { AssistantAnswer } from "@/components/assistant/AssistantAnswer";
import { ChatComposer } from "@/components/assistant/ChatComposer";
import { EvidenceExportPanel } from "@/components/assistant/EvidenceExportPanel";
import type { AssistantLanguage, AssistantStructuredResponse } from "@/lib/assistant/types";

type ChatMessage = {
  id: string;
  sender: "citizen" | "assistant";
  text: string;
  structured?: AssistantStructuredResponse;
};

const SUGGESTED_QUESTIONS = [
  { q: "Which contractor is the best?", hint: "Scores for durability, billing and speed" },
  { q: "Which ward has the most money to explain?", hint: "Flagged bills, ward by ward" },
  { q: "Where should the next rupee go in F/S ward?", hint: "The riskiest roads first" },
  { q: "What happened to complaint BMC25-000013?", hint: "From complaint to work order" },
];

/**
 * Ask about road money. Empty, it is a heading, one composer and four
 * starting questions. Once a question is asked it becomes a conversation:
 * questions as bubbles on the right, answers as plain text, and the
 * composer pinned to the bottom of the screen.
 */
export function AssistantChat({ initialComplaintId, context }: { initialComplaintId?: string; context?: ReactNode }) {
  const [complaintId, setComplaintId] = useState(initialComplaintId ?? "");
  const [query, setQuery] = useState("");
  const [language, setLanguage] = useState<AssistantLanguage>("en");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [error, setError] = useState<{ text: string; question: string } | null>(null);
  const [showExportPanel, setShowExportPanel] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messages.length || loading) endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, loading]);

  async function handleSend(questionText: string) {
    const question = questionText.trim();
    if (!question || loading) return;
    setError(null);
    setLoading(true);
    setMessages((prev) => [...prev, { id: `user-${Date.now()}`, sender: "citizen", text: question }]);
    setQuery("");

    const res = await askAssistantAction(question, complaintId || null, language);
    setLoading(false);
    if (res.error || !res.response) {
      setError({ text: res.error ?? "The records could not be checked just now.", question });
      return;
    }
    const answer = res.response;
    setMessages((prev) => [
      ...prev,
      { id: `asst-${Date.now()}`, sender: "assistant", text: answer.answer, structured: answer },
    ]);
  }

  const composer = (compact: boolean) => (
    <ChatComposer
      compact={compact}
      query={query}
      onQuery={setQuery}
      complaintId={complaintId}
      onComplaintId={setComplaintId}
      language={language}
      onLanguage={setLanguage}
      busy={loading}
      onSend={() => void handleSend(query)}
    />
  );

  return (
    <div className={messages.length === 0 && !loading ? "rb-chat rb-chat-empty" : "rb-chat rb-chat-live"}>
      <div className="rb-chat-topbar">
        <h1 className={messages.length === 0 && !loading ? "rb-chat-title" : "sr-only"}>
          Where did the road money go?
        </h1>
        <button
          type="button"
          className="rb-chat-export-btn touch-target"
          onClick={() => setShowExportPanel((v) => !v)}
          aria-expanded={showExportPanel}
        >
          <span aria-hidden="true">📥</span> Export Evidence Pack
        </button>
      </div>

      {showExportPanel ? (
        <div className="rb-chat-export-drawer">
          <EvidenceExportPanel onClose={() => setShowExportPanel(false)} />
        </div>
      ) : null}

      {messages.length === 0 && !loading ? (
        <>
          <p className="rb-chat-sub">
            Ask about a complaint, a road, a ward or a contractor. Answers come from BMC work orders, bills and
            repair records.
          </p>
          {context ? <div className="rb-chat-context">{context}</div> : null}
          {composer(false)}
          <ul className="rb-chat-starters" aria-label="Questions to start with">
            {SUGGESTED_QUESTIONS.map((item) => (
              <li key={item.q}>
                <button type="button" className="touch-target" onClick={() => void handleSend(item.q)}>
                  <span className="rb-chat-starter-q">{item.q.replace(/-/g, "\u2011")}</span>
                  <span className="rb-chat-starter-hint">{item.hint}</span>
                </button>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <>
          <div className="rb-chat-log" role="log" aria-live="polite" aria-label="Conversation">
            {messages.map((m) =>
              m.sender === "citizen" ? (
                <p key={m.id} className="rb-chat-q">
                  {m.text}
                </p>
              ) : (
                <AssistantAnswer key={m.id} text={m.text} data={m.structured} />
              ),
            )}

            {loading ? (
              <p className="rb-chat-wait">
                <span className="rb-chat-dots" aria-hidden="true">
                  <span />
                  <span />
                  <span />
                </span>
                Checking the records…
              </p>
            ) : null}

            {error ? (
              <div className="rb-chat-error" role="alert">
                <p>{error.text}</p>
                <button
                  type="button"
                  className="ux4g-btn ux4g-btn-s ux4g-btn-outline-primary touch-target"
                  onClick={() => {
                    setMessages((prev) => prev.slice(0, -1));
                    void handleSend(error.question);
                  }}
                >
                  Try again
                </button>
              </div>
            ) : null}
            <div ref={endRef} className="rb-chat-end" />
          </div>

          <div className="rb-chat-dock">{composer(true)}</div>
        </>
      )}
    </div>
  );
}
