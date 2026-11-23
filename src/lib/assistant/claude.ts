import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import type { ToolContext } from "./tools/executor";
import { executeAssistantTool } from "./tools/executor";
import { ASSISTANT_TOOLS } from "./tools/definitions";
import type { AssistantLanguage, AssistantStructuredResponse, EvidenceBundle } from "./types";
import { generateFactualFallbackAnswer, validateAndSanitizeResponse } from "./response-schema";
import { isMockLLMEnabled, simulateMockLLMMessage } from "./mock-llm";
import { createComplaintIntelligenceEngine } from "@/lib/matching/engine";
import { loadDataset } from "@/lib/rupee/load";

const PRIMARY_MODEL = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-5";
const FALLBACK_MODEL = "claude-haiku-4-5";
const TURN_TIMEOUT_MS = 8000;
const TOTAL_BUDGET_MS = 25000;

const SYSTEM_PROMPT = `You are the Rastabaaz Accountability Assistant for Mumbai's monsoon road repairs (24 BMC wards, 2,499 work orders, ₹13 Cr spend).
You help both citizens and BMC ward officers answer: where did the money go, did the fix last, who is responsible, and where should the next rupee go.

RULES:
1. Always call the available tools to look up real numbers before answering. NEVER invent contractor names, scores, work order IDs, or rupee figures.
2. For contractor comparisons ("which contractor is best/worst?"), call get_contractor_rankings and explain both the overall stress-adjusted score (50 = as expected) and fair context (stress share, sample size, cost ratio, re-open rate).
3. For ward spend, audit flags, or next-rupee priorities, call get_ward_summary, get_audit_flags, or get_next_rupee_plan.
4. For a specific complaint ID, call get_complaint / get_work_orders / get_issue_timeline. State plainly if a link is unverified or missing.
5. NEVER accuse anyone of fraud, crime, or corruption; say "needs an explanation" and cite exact IDs and ₹ figures.
6. Keep answers crisp, structured, and easy to read on a phone. Respond in the requested language (en, hi, or mr).`;

export function hasAnthropicCredentials(allowMock = false): boolean {
  if (process.env.VITEST && !allowMock && !isMockLLMEnabled()) return false;
  return Boolean(
    process.env.ANTHROPIC_API_KEY ||
      process.env.ANTHROPIC_AUTH_TOKEN ||
      isMockLLMEnabled() ||
      allowMock,
  );
}

export type ClaudeOrchestrationOptions = {
  evidence?: EvidenceBundle | null;
  toolCtx?: ToolContext;
  language?: AssistantLanguage;
  maxTurns?: number;
  useMock?: boolean;
};

async function createTurnMessage(
  client: Anthropic,
  messages: Anthropic.MessageParam[],
  modelState: { activeModel: string },
  turnTimeoutMs: number,
): Promise<Anthropic.Message> {
  const signal = AbortSignal.timeout(turnTimeoutMs);

  if (modelState.activeModel === PRIMARY_MODEL) {
    try {
      return await client.messages.create(
        {
          model: PRIMARY_MODEL,
          max_tokens: 1200,
          system: SYSTEM_PROMPT,
          tools: ASSISTANT_TOOLS,
          messages,
        },
        { signal },
      );
    } catch (err) {
      if (PRIMARY_MODEL === FALLBACK_MODEL) throw err;
      console.warn(
        `Primary model ${PRIMARY_MODEL} failed or timed out, tripping circuit breaker to ${FALLBACK_MODEL}:`,
        err,
      );
      // Trip circuit breaker immediately for this turn and subsequent turns
      modelState.activeModel = FALLBACK_MODEL;
    }
  }

  // Fallback model attempt with fresh timeout signal
  const fallbackSignal = AbortSignal.timeout(turnTimeoutMs);
  return await client.messages.create(
    {
      model: FALLBACK_MODEL,
      max_tokens: 1200,
      system: SYSTEM_PROMPT,
      tools: ASSISTANT_TOOLS,
      messages,
    },
    { signal: fallbackSignal },
  );
}

/**
 * Orchestrates Claude (Sonnet with Haiku circuit-breaker fallback) with read-only analytical and complaint tools.
 */
export async function queryClaudeAssistant(
  citizenQuery: string,
  options: ClaudeOrchestrationOptions = {},
): Promise<AssistantStructuredResponse> {
  const {
    evidence = null,
    toolCtx,
    language = "en",
    maxTurns = 5,
    useMock: explicitMock,
  } = options;
  const useMock = explicitMock ?? isMockLLMEnabled();
  const effectiveToolCtx: ToolContext =
    toolCtx ?? {
      engine: createComplaintIntelligenceEngine(loadDataset()),
      dataset: loadDataset(),
    };

  if (!hasAnthropicCredentials(useMock)) {
    return validateAndSanitizeResponse(
      {
        answer: evidence ? generateFactualFallbackAnswer(evidence, language) : "No records found matching your query.",
        responseLanguage: language,
      },
      evidence,
      language,
    );
  }

  try {
    const client = useMock ? (null as unknown as Anthropic) : new Anthropic();
    const modelState = { activeModel: PRIMARY_MODEL };
    const startTime = Date.now();
    const messages: Anthropic.MessageParam[] = [
      {
        role: "user",
        content: `Question: "${citizenQuery}"\nLanguage: ${language}\nAttached Complaint ID: ${evidence?.complaintId ?? "none"}`,
      },
    ];

    const usedTools: string[] = [];
    for (let turn = 0; turn < maxTurns; turn++) {
      const elapsed = Date.now() - startTime;
      if (elapsed >= TOTAL_BUDGET_MS) {
        console.warn(`Assistant execution budget of ${TOTAL_BUDGET_MS}ms exhausted after ${elapsed}ms at turn ${turn}`);
        break;
      }
      const remainingBudget = TOTAL_BUDGET_MS - elapsed;
      const turnTimeout = Math.min(TURN_TIMEOUT_MS, Math.max(1000, remainingBudget));

      const response = useMock
        ? (simulateMockLLMMessage(messages, ASSISTANT_TOOLS, language) as unknown as Anthropic.Message)
        : await createTurnMessage(client, messages, modelState, turnTimeout);

      if (response.stop_reason === "tool_use") {
        messages.push({ role: "assistant", content: response.content });
        const toolResults: Anthropic.ToolResultBlockParam[] = [];
        for (const block of response.content) {
          if (block.type === "tool_use") {
            usedTools.push(block.name);
            const result = executeAssistantTool(
              block.name,
              block.input as Record<string, unknown>,
              effectiveToolCtx,
            );
            toolResults.push({
              type: "tool_result",
              tool_use_id: block.id,
              content: JSON.stringify(result.data ?? { error: result.error }),
            });
          }
        }
        messages.push({ role: "user", content: toolResults });
      } else {
        const textContent = response.content
          .flatMap((b) => (b.type === "text" ? [b.text] : []))
          .join("\n")
          .trim();

        const isGeneral = !evidence && usedTools.length > 0;
        const sanitized = validateAndSanitizeResponse(
          {
            answer: textContent,
            text: textContent,
            toolsUsed: usedTools,
            citations: isGeneral ? usedTools.map((t) => `tool:${t}`) : [],
            responseLanguage: language,
            ...(isGeneral
              ? {
                  complaintStatus: "Dataset Analysis",
                  nextAction: "Open /wards or /contractors to inspect the underlying tables and export audit briefs.",
                }
              : {}),
          },
          evidence,
          language,
        );
        if (isGeneral) {
          sanitized.isOfficialLink = true;
          sanitized.evidenceSources = [...new Set(usedTools.map((t) => `tool:${t}`))];
          sanitized.citations = sanitized.evidenceSources;
        }
        sanitized.toolsUsed = usedTools;
        return sanitized;
      }
    }

    return validateAndSanitizeResponse(
      {
        answer: evidence ? generateFactualFallbackAnswer(evidence, language) : "Query processing timed out.",
        responseLanguage: language,
      },
      evidence,
      language,
    );
  } catch (err) {
    console.error("Claude assistant invocation error, falling back to evidence template:", err);
    return validateAndSanitizeResponse(
      {
        answer: evidence ? generateFactualFallbackAnswer(evidence, language) : "Unable to reach Claude right now. Please check your ANTHROPIC_API_KEY and try again.",
        responseLanguage: language,
      },
      evidence,
      language,
    );
  }
}
