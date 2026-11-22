import type { Tool } from "@anthropic-ai/sdk/resources/messages/messages";
import type { AssistantLanguage } from "./types";

export type MockMessageBlock =
  | { type: "text"; text: string }
  | { type: "tool_use"; id: string; name: string; input: Record<string, unknown> };

export type MockAnthropicMessage = {
  id: string;
  type: "message";
  role: "assistant";
  model: string;
  content: MockMessageBlock[];
  stop_reason: "end_turn" | "tool_use";
  stop_sequence: null;
  usage: { input_tokens: number; output_tokens: number };
};

/** Checks if mock LLM mode is enabled via environment variable. */
export function isMockLLMEnabled(): boolean {
  return process.env.MOCK_LLM === "true";
}

/** Extracts the latest user query from the message history. */
function extractUserQuery(messages: unknown[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i] as { role?: string; content?: unknown };
    if (msg.role === "user") {
      if (typeof msg.content === "string") return msg.content;
      if (Array.isArray(msg.content)) {
        const textBlock = msg.content.find((b: unknown) => (b as { type?: string }).type === "text");
        if (textBlock && typeof (textBlock as { text?: string }).text === "string") {
          return (textBlock as { text: string }).text;
        }
      }
    }
  }
  return "";
}

/** Extracts tool results from the latest user message if any. */
function extractToolResults(messages: unknown[]): Array<{ toolUseId: string; data: Record<string, unknown> }> {
  const lastMsg = messages[messages.length - 1] as { role?: string; content?: unknown };
  if (!lastMsg || lastMsg.role !== "user" || !Array.isArray(lastMsg.content)) return [];

  const results: Array<{ toolUseId: string; data: Record<string, unknown> }> = [];
  for (const block of lastMsg.content) {
    const b = block as { type?: string; tool_use_id?: string; content?: string };
    if (b.type === "tool_result" && b.content) {
      try {
        const parsed = JSON.parse(b.content);
        results.push({ toolUseId: b.tool_use_id ?? "unknown", data: parsed });
      } catch {
        results.push({ toolUseId: b.tool_use_id ?? "unknown", data: { raw: b.content } });
      }
    }
  }
  return results;
}

/** Determines which tool to invoke on Turn 0 based on user intent. */
function selectToolForQuery(query: string): { name: string; input: Record<string, unknown> } | null {
  const q = query.toLowerCase();

  // Contractor query
  if (/contractor|ranking|best|worst|performance|scorecard|durability/i.test(q)) {
    return { name: "get_contractor_rankings", input: {} };
  }

  // Next Rupee / Priority roads query
  if (/next rupee|priority|riskiest|risk road|where should money go/i.test(q)) {
    const wardMatch = query.match(/\b([A-Z]\/[A-Z]|[A-Z]\b)/i);
    return { name: "get_next_rupee_plan", input: { ward_code: wardMatch ? wardMatch[1].toUpperCase() : "F/S" } };
  }

  // Ward summary query
  if (/ward|budget|explain|spent|spend/i.test(q)) {
    const wardMatch = query.match(/\b([A-Z]\/[A-Z]|[A-Z]\b)/i);
    return { name: "get_ward_summary", input: wardMatch ? { ward_code: wardMatch[1].toUpperCase() } : {} };
  }

  // Audit flags query
  if (/audit|flag|double|phantom|dlp|over_rate|irregular/i.test(q)) {
    return { name: "get_audit_flags", input: {} };
  }

  // Complaint query
  const complaintMatch = query.match(/\b(BMC\d{2}-\d+)\b/i);
  if (complaintMatch) {
    return { name: "get_complaint", input: { complaint_id: complaintMatch[1].toUpperCase() } };
  }

  return null;
}

/** Synthesizes final text answer from tool results. */
function synthesizeToolAnswer(
  toolResults: Array<{ toolUseId: string; data: Record<string, unknown> }>,
  lang: AssistantLanguage,
): string {
  if (toolResults.length === 0) {
    return lang === "mr"
      ? "कोणतीही संबंधित माहिती आढळली नाही."
      : lang === "hi"
      ? "कोई संबंधित रिकॉर्ड नहीं मिला।"
      : "No matching records found.";
  }

  const { data } = toolResults[0];

  // 1. Contractor rankings result
  if (data.contractors && Array.isArray(data.contractors)) {
    const top = data.contractors[0] as { name: string; overallScore: number; jobs: number; actualReopenRatePct: number };
    if (lang === "mr") {
      return `बीएमसी पावसाळी रस्ता दुरुस्ती नोंदीनुसार, सर्वोत्तम कंत्राटदार **${top.name}** आहेत (स्कोअर: **${top.overallScore}/100**). त्यांनी ${top.jobs} कामे पूर्ण केली असून 30 दिवसांत पुन्हा खड्डा पडण्याचे प्रमाण ${top.actualReopenRatePct}% आहे.`;
    }
    if (lang === "hi") {
      return `बीएमसी मानसून सड़क मरम्मत रिकॉर्ड के अनुसार, शीर्ष रैंक वाले ठेकेदार **${top.name}** हैं (स्कोर: **${top.overallScore}/100**)। उन्होंने ${top.jobs} कार्य किए हैं और 30 दिनों में दोबारा गड्ढा होने की दर ${top.actualReopenRatePct}% है।`;
    }
    return `Based on BMC monsoon repair records across 24 wards, the top-ranked contractor is **${top.name}** with a stress-adjusted score of **${top.overallScore}/100** (50 is city benchmark). They completed ${top.jobs} jobs with a 30-day reopen rate of ${top.actualReopenRatePct}%.`;
  }

  // 2. Next Rupee plan
  if (data.priorityRoads && Array.isArray(data.priorityRoads)) {
    const roads = data.priorityRoads.slice(0, 3) as Array<{ roadName: string; roadId: string; riskScore: number; underDlpFreeFix: boolean; estCostInr: number }>;
    const list = roads
      .map((r, i) => `${i + 1}. **${r.roadName}** (${r.roadId}) - Risk: ${r.riskScore}/100${r.underDlpFreeFix ? " (Under DLP zero-cost)" : ` (Est: Rs ${r.estCostInr})`}`)
      .join("\n");
    if (lang === "mr") return `प्रभाग **${data.ward}** मध्ये पुढील निधीसाठी प्राधान्य रस्ते:\n${list}`;
    if (lang === "hi") return `वार्ड **${data.ward}** में अगले रुपये के लिए प्राथमिकता वाली सड़कें:\n${list}`;
    return `For Ward **${data.ward}**, the top priority roads where the next rupee should go are:\n${list}`;
  }

  // 3. Ward summary
  if (data.ward || data.cityTotalBudgetInr) {
    if (data.ward) {
      if (lang === "mr") {
        return `प्रभाग **${data.ward}** (${data.name}) चा रस्ता अर्थसंकल्प रु. ${data.budgetInr} असून प्रत्यक्ष खर्च रु. ${data.spentInr} आहे. 30 दिवसांतील अपयश दर ${data.reopenRatePct}% आहे.`;
      }
      if (lang === "hi") {
        return `वार्ड **${data.ward}** (${data.name}) का सड़क बजट रु. ${data.budgetInr} और दर्ज खर्च रु. ${data.spentInr} है। 30 दिनों में विफलता दर ${data.reopenRatePct}% है।`;
      }
      return `Ward **${data.ward}** (${data.name}) has an allocated road budget of Rs ${data.budgetInr} and recorded billed spend of Rs ${data.spentInr} across ${data.orders} work orders. 30-day failure rate is ${data.reopenRatePct}% with ${data.flagCount} flagged bills.`;
    }
    return `Across all 24 BMC wards, total monsoon road repair spend is Rs ${data.cityTotalSpentInr} across ${data.cityTotalOrders} work orders.`;
  }

  // 4. Audit flags
  if (data.totalMatchingFlags !== undefined) {
    return `Found ${data.totalMatchingFlags} flagged work orders representing Rs ${data.totalAmountAtRiskInr} at risk requiring verification under BMC audit guidelines.`;
  }

  // 5. Complaint details
  if (data.id && data.status) {
    return `Complaint **${data.id}** is recorded as **${data.status}** for road ${data.roadName || data.locality || "Mumbai"}.`;
  }

  return JSON.stringify(data);
}

/**
 * Simulates Anthropic's message endpoint for deterministic, offline testing
 * and mock execution of read-only civic tools.
 */
export function simulateMockLLMMessage(
  messages: unknown[],
  _tools: Tool[],
  language: AssistantLanguage = "en",
): MockAnthropicMessage {
  const toolResults = extractToolResults(messages);

  // Turn 2: Synthesize final answer from executed tool results
  if (toolResults.length > 0) {
    const text = synthesizeToolAnswer(toolResults, language);
    return {
      id: `msg_mock_${Date.now()}`,
      type: "message",
      role: "assistant",
      model: "claude-mock-offline",
      content: [{ type: "text", text }],
      stop_reason: "end_turn",
      stop_sequence: null,
      usage: { input_tokens: 50, output_tokens: 100 },
    };
  }

  // Turn 1: Decide which tool to call based on query intent
  const query = extractUserQuery(messages);
  const selected = selectToolForQuery(query);

  if (selected) {
    return {
      id: `msg_mock_${Date.now()}`,
      type: "message",
      role: "assistant",
      model: "claude-mock-offline",
      content: [
        {
          type: "tool_use",
          id: `call_mock_${Date.now()}`,
          name: selected.name,
          input: selected.input,
        },
      ],
      stop_reason: "tool_use",
      stop_sequence: null,
      usage: { input_tokens: 40, output_tokens: 30 },
    };
  }

  // Fallback text if no tool matched
  return {
    id: `msg_mock_${Date.now()}`,
    type: "message",
    role: "assistant",
    model: "claude-mock-offline",
    content: [
      {
        type: "text",
        text: "I am the Rastabaaz Civic Assistant. You can ask me about road complaints, contractor rankings, ward budgets, or priority road repairs.",
      },
    ],
    stop_reason: "end_turn",
    stop_sequence: null,
    usage: { input_tokens: 20, output_tokens: 40 },
  };
}
