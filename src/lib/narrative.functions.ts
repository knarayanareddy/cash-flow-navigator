import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const KpisSchema = z.object({
  endYearCash: z.number(),
  lowestCashMonth: z.string(),
  lowestCashValue: z.number(),
  totalInflow: z.number(),
  totalOutflow: z.number(),
  netCashFlow: z.number(),
  monthsNegative: z.number(),
});

const InputSchema = z.object({
  scenarioName: z.string().max(200).optional().default("Untitled Scenario"),
  levers: z.record(z.string(), z.any()),
  results: z.array(z.any()).max(60),
  kpis: KpisSchema,
});

export interface NarrativeResult {
  headline: string;
  summary: string;
  risks: string[];
  recommendations: string[];
  urgency: "low" | "medium" | "high" | "critical";
  cashRunwayMonths: number | null;
}

const SYSTEM_PROMPT =
  "You are a senior CFO advisor and financial risk analyst. Your job is to analyze cash flow scenarios and provide concise, actionable, board-ready financial commentary. Be direct, specific with numbers, and always include a recommended action. Write in a confident, professional tone. Never be generic — always reference the specific numbers in the scenario.";

const TOOL = {
  type: "function" as const,
  function: {
    name: "submit_brief",
    description: "Return the CFO brief as structured JSON.",
    parameters: {
      type: "object",
      additionalProperties: false,
      properties: {
        headline: { type: "string", description: "One punchy sentence, max 12 words." },
        summary: { type: "string", description: "2-3 plain English sentences." },
        risks: { type: "array", items: { type: "string" }, minItems: 3, maxItems: 3 },
        recommendations: { type: "array", items: { type: "string" }, minItems: 3, maxItems: 3 },
        urgency: { type: "string", enum: ["low", "medium", "high", "critical"] },
        cashRunwayMonths: {
          type: ["number", "null"],
          description: "Months until cash hits zero, or null if cash never goes negative.",
        },
      },
      required: ["headline", "summary", "risks", "recommendations", "urgency", "cashRunwayMonths"],
    },
  },
};

function fmt(n: number) {
  return `€${Math.round(n).toLocaleString("en-US")}`;
}

function buildUserPrompt(d: z.infer<typeof InputSchema>) {
  const { scenarioName, levers, kpis, results } = d;
  const trajectory = results
    .map((r: any) => `${r.month}: cum ${fmt(r.cumulativeCash)} (net ${fmt(r.netCash)})`)
    .join("\n");
  return `Scenario: "${scenarioName}"

Lever settings:
${JSON.stringify(levers, null, 2)}

12-month KPIs:
- End-of-year cash: ${fmt(kpis.endYearCash)}
- Lowest month: ${kpis.lowestCashMonth} at ${fmt(kpis.lowestCashValue)}
- Total inflow: ${fmt(kpis.totalInflow)}
- Total outflow: ${fmt(kpis.totalOutflow)}
- Net cash flow: ${fmt(kpis.netCashFlow)}
- Months with negative cash: ${kpis.monthsNegative}

Monthly trajectory:
${trajectory}

Produce a board-ready CFO brief by calling the submit_brief tool. Be specific — reference these exact numbers. Urgency should be:
- critical if cash goes negative or runway < 3 months
- high if any month within 20% of zero or 4+ months show drawdown
- medium if net flow negative but cash stays comfortable
- low if trajectory is constructive
Set cashRunwayMonths to null if cash never goes negative in the trajectory.`;
}

export const generateCfoBrief = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data }): Promise<NarrativeResult> => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("AI gateway not configured");

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-5",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: buildUserPrompt(data) },
        ],
        tools: [TOOL],
        tool_choice: { type: "function", function: { name: "submit_brief" } },
      }),
    });

    if (res.status === 429) throw new Error("Rate limited. Please try again shortly.");
    if (res.status === 402) throw new Error("AI credits exhausted. Add credits in workspace settings.");
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error("AI gateway error", res.status, text);
      throw new Error("AI gateway request failed");
    }

    const json: any = await res.json();
    const call = json?.choices?.[0]?.message?.tool_calls?.[0];
    const argsRaw = call?.function?.arguments;
    if (!argsRaw) throw new Error("AI response missing tool call");
    const parsed = typeof argsRaw === "string" ? JSON.parse(argsRaw) : argsRaw;

    return {
      headline: String(parsed.headline ?? ""),
      summary: String(parsed.summary ?? ""),
      risks: Array.isArray(parsed.risks) ? parsed.risks.slice(0, 3).map(String) : [],
      recommendations: Array.isArray(parsed.recommendations)
        ? parsed.recommendations.slice(0, 3).map(String)
        : [],
      urgency: (["low", "medium", "high", "critical"].includes(parsed.urgency)
        ? parsed.urgency
        : "medium") as NarrativeResult["urgency"],
      cashRunwayMonths:
        parsed.cashRunwayMonths === null || parsed.cashRunwayMonths === undefined
          ? null
          : Number(parsed.cashRunwayMonths),
    };
  });
