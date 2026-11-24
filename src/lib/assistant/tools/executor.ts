import type { ComplaintIntelligenceEngine } from "@/lib/matching/engine";
import type { Dataset } from "@/lib/rupee/load";
import { executeAggregateTool } from "./aggregates";
import { executeAnalyticsTool } from "./analytics";
import { executeRecordTool } from "./records";

export type ToolContext = {
  engine: ComplaintIntelligenceEngine;
  dataset: Dataset;
};

export type ToolExecutionResult = {
  success: boolean;
  data?: unknown;
  error?: string;
};

/** Executes validated, typed read-only tools against local dataset records. */
export function executeAssistantTool(
  toolName: string,
  args: Record<string, unknown>,
  ctx: ToolContext,
): ToolExecutionResult {
  const analytics = executeAnalyticsTool(toolName, args);
  if (analytics) return analytics;

  const recordResult = executeRecordTool(toolName, args, ctx);
  if (recordResult) return recordResult;

  const aggregateResult = executeAggregateTool(toolName, args, ctx);
  if (aggregateResult) return aggregateResult;

  return { success: false, error: `Unknown tool: "${toolName}".` };
}
