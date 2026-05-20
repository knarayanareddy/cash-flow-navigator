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
  monteCarlo: z
    .object({
      iterations: z.number().optional(),
      worstCaseEndYear: z.number(),
      bestCaseEndYear: z.number(),
      medianEndYear: z.number(),
      maxProbabilityNegative: z.number(),
      dangerMonths: z.array(z.string()),
      perMonthNegative: z.array(z.object({ month: z.string(), probability: z.number() })).optional(),
    })
    .optional(),
});

export interface NarrativeResult {
  headline: string;
  summary: string;
  risks: string[];
  recommendations: string[];
  urgency: "low" | "medium" | "high" | "critical";
  cashRunwayMonths: number | null;
  unavailableReason?: "credits" | "rate_limit" | "configuration" | "gateway";
}

function unavailableNarrative(reason: NonNullable<NarrativeResult["unavailableReason"]>): NarrativeResult {
  const copy: Record<NonNullable<NarrativeResult["unavailableReason"]>, { headline: string; summary: string }> = {
    credits: {
      headline: "AI credits are exhausted",
      summary: "The forecast is still available, but the AI CFO brief is paused until credits are added in workspace settings.",
    },
    rate_limit: {
      headline: "AI analysis is rate limited",
      summary: "The forecast is still available. Wait a moment, then regenerate the CFO brief.",
    },
    configuration: {
      headline: "AI analysis is not configured",
      summary: "The forecast is still available, but the AI gateway needs to be configured before briefs can run.",
    },
    gateway: {
      headline: "AI analysis is temporarily unavailable",
      summary: "The forecast is still available. Regenerate the brief once the AI service is reachable.",
    },
  };

  return {
    headline: copy[reason].headline,
    summary: copy[reason].summary,
    risks: [],
    recommendations: [],
    urgency: "medium",
    cashRunwayMonths: null,
    unavailableReason: reason,
  };
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
  const { scenarioName, levers, kpis, results, monteCarlo } = d;
  const trajectory = results
    .map((r: any) => `${r.month}: cum ${fmt(r.cumulativeCash)} (net ${fmt(r.netCash)})`)
    .join("\n");

  const mcBlock = monteCarlo
    ? `

Monte Carlo simulation (${monteCarlo.iterations ?? 1000} iterations):
- Median end-of-year cash (p50): ${fmt(monteCarlo.medianEndYear)}
- p10 (worst 10%): ${fmt(monteCarlo.worstCaseEndYear)}
- p90 (best 10%): ${fmt(monteCarlo.bestCaseEndYear)}
- Max probability of negative cash in any month: ${(monteCarlo.maxProbabilityNegative * 100).toFixed(0)}%
- Months with >20% probability of negative cash: ${monteCarlo.dangerMonths.join(", ") || "none"}
${
  monteCarlo.perMonthNegative
    ? `- Per-month probability of negative cash:\n${monteCarlo.perMonthNegative
        .map((p) => `  • ${p.month}: ${(p.probability * 100).toFixed(0)}%`)
        .join("\n")}`
    : ""
}`
    : "";

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
${trajectory}${mcBlock}

Produce a board-ready CFO brief by calling the submit_brief tool. Be specific — reference these exact numbers, including Monte Carlo probabilities (e.g. "34% chance of cash going negative in October") and the median + p10–p90 range when summarising the outlook. Urgency should be:
- critical if cash goes negative or runway < 3 months or any month >50% probability of negative cash
- high if any month within 20% of zero, 4+ months show drawdown, or any month >20% probability of negative cash
- medium if net flow negative but cash stays comfortable
- low if trajectory is constructive
Set cashRunwayMonths to null if cash never goes negative in the trajectory.`;
}

export const generateCfoBrief = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data }): Promise<NarrativeResult> => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) return unavailableNarrative("configuration");

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

    if (res.status === 429) return unavailableNarrative("rate_limit");
    if (res.status === 402) return unavailableNarrative("credits");
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error("AI gateway error", res.status, text);
      return unavailableNarrative("gateway");
    }

    const json: any = await res.json();
    const call = json?.choices?.[0]?.message?.tool_calls?.[0];
    const argsRaw = call?.function?.arguments;
    if (!argsRaw) return unavailableNarrative("gateway");
    let parsed: any;
    try {
      parsed = typeof argsRaw === "string" ? JSON.parse(argsRaw) : argsRaw;
    } catch (error) {
      console.error("AI response parse error", error);
      return unavailableNarrative("gateway");
    }

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
