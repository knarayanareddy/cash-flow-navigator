import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const AGENTS = [
  {
    id: "elena",
    name: "Elena K.",
    role: "CFO · Series B startup",
    color: "#6366f1",
    persona:
      "Pragmatic, data-driven, direct. 15 years CFO experience at growth-stage SaaS. Speaks in short sentences. Asks hard questions. Always demands a concrete action and a date. Risk tolerance medium-low.",
  },
  {
    id: "marcus",
    name: "Marcus T.",
    role: "Board Member · VC",
    color: "#10b981",
    persona:
      "Growth-focused, optimistic, impatient VC. Compares everything to portfolio companies. Tolerates burn if growth is there. Pushes for acceleration. Risk tolerance high. Speaks in big-picture terms.",
  },
  {
    id: "priya",
    name: "Priya M.",
    role: "Head of FP&A",
    color: "#f59e0b",
    persona:
      "Cautious, thorough, scenario-obsessed. Always qualifies statements with 'assuming…', references the model, flags assumptions. Risk tolerance low. Sentences include caveats and ranges.",
  },
  {
    id: "james",
    name: "James O.",
    role: "CEO",
    color: "#ec4899",
    persona:
      "Non-finance CEO. Optimistic, wants plain language, dislikes complexity. Asks 'what does this mean for us?'. Action-oriented. Risk tolerance high. Talks like a founder, not a banker.",
  },
  {
    id: "sandra",
    name: "Sandra L.",
    role: "External Auditor",
    color: "#ef4444",
    persona:
      "Conservative, compliance-focused, skeptical Controller. Formal tone. References accounting standards and covenants. Flags risks others ignore. Risk tolerance very low.",
  },
] as const;

export type AgentId = (typeof AGENTS)[number]["id"];

const InputSchema = z.object({
  scenarioName: z.string().max(200).optional().default("Untitled Scenario"),
  levers: z.record(z.string(), z.any()),
  kpis: z.object({
    endYearCash: z.number(),
    lowestCashMonth: z.string(),
    lowestCashValue: z.number(),
    totalInflow: z.number(),
    totalOutflow: z.number(),
    netCashFlow: z.number(),
    monthsNegative: z.number(),
  }),
  narrative: z
    .object({
      headline: z.string().optional(),
      summary: z.string().optional(),
      urgency: z.string().optional(),
    })
    .optional(),
  monteCarlo: z
    .object({
      medianEndYear: z.number(),
      worstCaseEndYear: z.number(),
      bestCaseEndYear: z.number(),
      maxProbabilityNegative: z.number(),
      dangerMonths: z.array(z.string()),
    })
    .optional(),
});

export interface AgentReaction {
  agentId: AgentId;
  sentiment: "positive" | "neutral" | "concerned" | "alarmed";
  sentimentScore: number;
  reaction: string;
  topConcern: string;
  suggestedAction: string;
  agreesWith: AgentId[];
}

export interface StakeholderResult {
  reactions: AgentReaction[];
  consensus: {
    averageSentiment: number;
    agreements: string[];
    conflicts: string[];
    recommendation: string;
  };
  unavailableReason?: "credits" | "rate_limit" | "configuration" | "gateway";
}

function unavailableStakeholders(reason: NonNullable<StakeholderResult["unavailableReason"]>): StakeholderResult {
  const recommendation: Record<NonNullable<StakeholderResult["unavailableReason"]>, string> = {
    credits: "Stakeholder simulation is paused until AI credits are added in workspace settings.",
    rate_limit: "Stakeholder simulation is rate limited. Wait a moment, then reconvene the room.",
    configuration: "Stakeholder simulation needs the AI gateway configured before it can run.",
    gateway: "Stakeholder simulation is temporarily unavailable. Try reconvening shortly.",
  };

  return {
    reactions: [],
    consensus: {
      averageSentiment: 0,
      agreements: [],
      conflicts: [],
      recommendation: recommendation[reason],
    },
    unavailableReason: reason,
  };
}

const TOOL = {
  type: "function" as const,
  function: {
    name: "submit_reactions",
    description: "Return all 5 stakeholder reactions plus the room consensus.",
    parameters: {
      type: "object",
      additionalProperties: false,
      properties: {
        reactions: {
          type: "array",
          minItems: 5,
          maxItems: 5,
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              agentId: { type: "string", enum: AGENTS.map((a) => a.id) },
              sentiment: {
                type: "string",
                enum: ["positive", "neutral", "concerned", "alarmed"],
              },
              sentimentScore: {
                type: "number",
                description: "-100 (alarmed) to +100 (positive).",
              },
              reaction: {
                type: "string",
                description:
                  "2-3 sentences in the agent's distinct voice. Reference specific numbers.",
              },
              topConcern: { type: "string", description: "One sentence." },
              suggestedAction: { type: "string", description: "One concrete action." },
              agreesWith: {
                type: "array",
                items: { type: "string", enum: AGENTS.map((a) => a.id) },
              },
            },
            required: [
              "agentId",
              "sentiment",
              "sentimentScore",
              "reaction",
              "topConcern",
              "suggestedAction",
              "agreesWith",
            ],
          },
        },
        consensus: {
          type: "object",
          additionalProperties: false,
          properties: {
            averageSentiment: { type: "number" },
            agreements: {
              type: "array",
              items: { type: "string" },
              minItems: 2,
              maxItems: 4,
            },
            conflicts: {
              type: "array",
              items: { type: "string" },
              minItems: 1,
              maxItems: 3,
            },
            recommendation: { type: "string" },
          },
          required: ["averageSentiment", "agreements", "conflicts", "recommendation"],
        },
      },
      required: ["reactions", "consensus"],
    },
  },
};

function fmt(n: number) {
  return `€${Math.round(n).toLocaleString("en-US")}`;
}

function buildPrompt(d: z.infer<typeof InputSchema>) {
  const personaBlock = AGENTS.map(
    (a) => `- ${a.id} · ${a.name} (${a.role}): ${a.persona}`,
  ).join("\n");

  const mc = d.monteCarlo
    ? `\nMonte Carlo: median ${fmt(d.monteCarlo.medianEndYear)}, p10 ${fmt(
        d.monteCarlo.worstCaseEndYear,
      )}, p90 ${fmt(d.monteCarlo.bestCaseEndYear)}, max P(neg) ${(
        d.monteCarlo.maxProbabilityNegative * 100
      ).toFixed(0)}%, danger months: ${d.monteCarlo.dangerMonths.join(", ") || "none"}.`
    : "";

  const nar = d.narrative
    ? `\nCFO brief: "${d.narrative.headline ?? ""}" — ${d.narrative.summary ?? ""} (urgency: ${
        d.narrative.urgency ?? "?"
      })`
    : "";

  return `You are simulating a multi-agent stakeholder war room reviewing a cash flow scenario. Produce 5 reactions — one per agent — written IN EACH AGENT'S DISTINCT VOICE. They MUST disagree where their personas would disagree (e.g. Marcus pushes growth, Sandra flags risk). Reference specific numbers from the scenario.

Agents:
${personaBlock}

Scenario: "${d.scenarioName}"
Levers: ${JSON.stringify(d.levers)}
KPIs:
- End-of-year cash: ${fmt(d.kpis.endYearCash)}
- Lowest: ${d.kpis.lowestCashMonth} at ${fmt(d.kpis.lowestCashValue)}
- Net cash flow: ${fmt(d.kpis.netCashFlow)}
- Months negative: ${d.kpis.monthsNegative}${mc}${nar}

For each agent compute sentimentScore (-100 to +100) consistent with their risk tolerance and the numbers. agreesWith lists agentIds whose reaction this agent would nod along to (can be empty). The consensus.averageSentiment must equal the mean of the 5 scores rounded to integer. agreements = shared themes across most agents. conflicts = where they meaningfully disagree (highlight 1-3). recommendation = one sentence synthesizing the room.

Call submit_reactions.`;
}

export const simulateStakeholders = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data }): Promise<StakeholderResult> => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) return unavailableStakeholders("configuration");

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-5",
        messages: [
          {
            role: "system",
            content:
              "You simulate a MiroFish-style multi-agent stakeholder swarm. Each agent has a distinct personality and MUST sound different from the others. Be specific, reference numbers, allow disagreement.",
          },
          { role: "user", content: buildPrompt(data) },
        ],
        tools: [TOOL],
        tool_choice: { type: "function", function: { name: "submit_reactions" } },
      }),
    });

    if (res.status === 429) return unavailableStakeholders("rate_limit");
    if (res.status === 402) return unavailableStakeholders("credits");
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error("AI gateway error", res.status, text);
      return unavailableStakeholders("gateway");
    }

    const json: any = await res.json();
    const call = json?.choices?.[0]?.message?.tool_calls?.[0];
    const argsRaw = call?.function?.arguments;
    if (!argsRaw) return unavailableStakeholders("gateway");
    let parsed: any;
    try {
      parsed = typeof argsRaw === "string" ? JSON.parse(argsRaw) : argsRaw;
    } catch (error) {
      console.error("AI response parse error", error);
      return unavailableStakeholders("gateway");
    }

    const validIds = new Set(AGENTS.map((a) => a.id));
    const reactions: AgentReaction[] = (parsed.reactions ?? [])
      .filter((r: any) => validIds.has(r.agentId))
      .map((r: any) => ({
        agentId: r.agentId,
        sentiment: ["positive", "neutral", "concerned", "alarmed"].includes(r.sentiment)
          ? r.sentiment
          : "neutral",
        sentimentScore: Math.max(-100, Math.min(100, Number(r.sentimentScore) || 0)),
        reaction: String(r.reaction ?? ""),
        topConcern: String(r.topConcern ?? ""),
        suggestedAction: String(r.suggestedAction ?? ""),
        agreesWith: Array.isArray(r.agreesWith)
          ? (r.agreesWith.filter((id: string) => validIds.has(id as AgentId)) as AgentId[])
          : [],
      }));

    const avg =
      reactions.length > 0
        ? Math.round(
            reactions.reduce((s, r) => s + r.sentimentScore, 0) / reactions.length,
          )
        : 0;

    return {
      reactions,
      consensus: {
        averageSentiment: Number.isFinite(parsed?.consensus?.averageSentiment)
          ? Math.round(parsed.consensus.averageSentiment)
          : avg,
        agreements: Array.isArray(parsed?.consensus?.agreements)
          ? parsed.consensus.agreements.map(String)
          : [],
        conflicts: Array.isArray(parsed?.consensus?.conflicts)
          ? parsed.consensus.conflicts.map(String)
          : [],
        recommendation: String(parsed?.consensus?.recommendation ?? ""),
      },
    };
  });
