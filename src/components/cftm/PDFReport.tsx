import { forwardRef, useMemo } from "react";
import type { Levers, MonthData } from "@/lib/cashflow";
import type { MonteCarloResult } from "@/lib/monteCarlo";
import type { NarrativeResult } from "@/lib/narrative.functions";
import type { AgentReaction, StakeholderResult } from "@/lib/stakeholders.functions";
import { AGENTS } from "@/lib/stakeholders.functions";

export interface PDFReportData {
  scenarioName: string;
  company: string;
  levers: Levers;
  data: MonthData[];
  mc?: MonteCarloResult | null;
  narrative?: NarrativeResult | null;
  stakeholders?: StakeholderResult | null;
}

const fmt = (n: number) => `€${Math.round(n).toLocaleString("en-US")}`;
const fmtShort = (n: number) => {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `€${(n / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `€${Math.round(n / 1000)}k`;
  return fmt(n);
};

const LEVER_LABELS: Record<keyof Levers, { label: string; format: (v: any) => string }> = {
  paymentDelay: { label: "💳 Payment Delay", format: (v) => `${v} days` },
  newHires: { label: "👥 New Hires", format: (v) => `${v}` },
  supplierIncrease: { label: "📦 Supplier Costs", format: (v) => `+${v}%` },
  revenueShift: { label: "📈 Revenue Shift", format: (v) => `${v >= 0 ? "+" : ""}${v}%` },
  creditLineOn: { label: "🏦 Credit Line", format: (v) => (v ? "ON" : "OFF") },
  creditLineAmount: { label: "🏦 Credit Amount", format: (v) => fmtShort(v) },
  fxShift: { label: "💱 FX Shift", format: (v) => `${v >= 0 ? "+" : ""}${v}%` },
  churnRate: { label: "📉 Churn Rate", format: (v) => `${v}%/mo` },
};

const URGENCY_COLORS: Record<string, string> = {
  low: "#10b981",
  medium: "#f59e0b",
  high: "#f97316",
  critical: "#ef4444",
};

// Each page is sized for landscape A4 at ~96dpi (1123×794)
const pageStyle: React.CSSProperties = {
  width: 1123,
  height: 794,
  background: "linear-gradient(135deg, #0b0b14 0%, #12121f 100%)",
  color: "#f5f5fa",
  padding: 40,
  boxSizing: "border-box",
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  display: "flex",
  flexDirection: "column",
  gap: 16,
};

const sectionTitle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: 2,
  textTransform: "uppercase",
  color: "#a3a3b5",
  marginBottom: 8,
};

function MiniSparkline({ data }: { data: MonthData[] }) {
  const values = data.map((d) => d.cumulativeCash);
  const min = Math.min(...values, 0);
  const max = Math.max(...values, 0);
  const range = max - min || 1;
  const W = 1043;
  const H = 280;
  const zeroY = H - ((0 - min) / range) * H;
  const points = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * W;
      const y = H - ((v - min) / range) * H;
      return `${x},${y}`;
    })
    .join(" ");
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      <defs>
        <linearGradient id="pdfGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#6366F1" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#6366F1" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* axes */}
      <line x1="0" y1={zeroY} x2={W} y2={zeroY} stroke="#374151" strokeDasharray="4 4" />
      {/* fill */}
      <polygon
        points={`0,${H} ${points} ${W},${H}`}
        fill="url(#pdfGradient)"
      />
      <polyline points={points} fill="none" stroke="#6366F1" strokeWidth="3" />
      {/* month labels */}
      {data.map((d, i) => {
        const x = (i / (values.length - 1)) * W;
        return (
          <text
            key={i}
            x={x}
            y={H - 4}
            textAnchor="middle"
            fontSize="10"
            fill="#6b7280"
          >
            {d.month}
          </text>
        );
      })}
    </svg>
  );
}

function KpiBox({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div
      style={{
        flex: 1,
        background: "rgba(255,255,255,0.03)",
        border: `1px solid ${color}40`,
        borderRadius: 12,
        padding: "16px 18px",
      }}
    >
      <div style={{ fontSize: 10, color: "#a3a3b5", textTransform: "uppercase", letterSpacing: 1.5 }}>
        {label}
      </div>
      <div style={{ fontSize: 26, fontWeight: 700, color, marginTop: 6 }}>{value}</div>
    </div>
  );
}

function HeatRow({ mc }: { mc: MonteCarloResult }) {
  return (
    <div style={{ display: "flex", gap: 4 }}>
      {mc.bands.map((b) => {
        const p = b.probabilityNegative;
        const color =
          p >= 0.5
            ? "#ef4444"
            : p >= 0.25
              ? "#f97316"
              : p >= 0.1
                ? "#facc15"
                : "rgba(255,255,255,0.06)";
        return (
          <div
            key={b.month}
            style={{
              flex: 1,
              height: 38,
              background: color,
              borderRadius: 6,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 10,
              color: p > 0.1 ? "#0b0b14" : "#a3a3b5",
              fontWeight: 600,
            }}
          >
            <div>{b.month}</div>
            <div>{Math.round(p * 100)}%</div>
          </div>
        );
      })}
    </div>
  );
}

function AgentMiniCard({ r }: { r: AgentReaction }) {
  const meta = AGENTS.find((a) => a.id === r.agentId)!;
  const initials = meta.name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("");
  const color =
    r.sentimentScore >= 40
      ? "#10b981"
      : r.sentimentScore >= 0
        ? "#94a3b8"
        : r.sentimentScore >= -40
          ? "#f59e0b"
          : "#ef4444";
  const pct = Math.round(((r.sentimentScore + 100) / 200) * 100);
  return (
    <div
      style={{
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 12,
        padding: 14,
        flex: 1,
        minWidth: 0,
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            background: meta.color,
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 11,
            fontWeight: 700,
          }}
        >
          {initials}
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 600 }}>{meta.name}</div>
          <div style={{ fontSize: 9, color: "#a3a3b5" }}>{meta.role}</div>
        </div>
        <div
          style={{
            marginLeft: "auto",
            fontSize: 12,
            fontWeight: 700,
            color,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {r.sentimentScore > 0 ? `+${r.sentimentScore}` : r.sentimentScore}
        </div>
      </div>
      <div
        style={{
          height: 4,
          background: "rgba(255,255,255,0.08)",
          borderRadius: 2,
          overflow: "hidden",
        }}
      >
        <div style={{ width: `${pct}%`, height: "100%", background: color }} />
      </div>
      <div style={{ fontSize: 10, color: "#cbd5e1", fontStyle: "italic", lineHeight: 1.4 }}>
        “{r.reaction}”
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: "auto" }}>
        <div
          style={{
            fontSize: 9,
            color: "#fca5a5",
            background: "rgba(239,68,68,0.08)",
            border: "1px solid rgba(239,68,68,0.25)",
            borderRadius: 6,
            padding: "4px 8px",
          }}
        >
          ⚠ {r.topConcern}
        </div>
        <div
          style={{
            fontSize: 9,
            color: "#93c5fd",
            background: "rgba(59,130,246,0.08)",
            border: "1px solid rgba(59,130,246,0.25)",
            borderRadius: 6,
            padding: "4px 8px",
          }}
        >
          → {r.suggestedAction}
        </div>
      </div>
    </div>
  );
}

export const PDFReport = forwardRef<HTMLDivElement, { report: PDFReportData }>(
  function PDFReport({ report }, ref) {
    const { scenarioName, company, levers, data, mc, narrative, stakeholders } = report;

    const kpis = useMemo(() => {
      const endYear = data[data.length - 1].cumulativeCash;
      const lowest = data.reduce(
        (m, d) => (d.cumulativeCash < m.cumulativeCash ? d : m),
        data[0],
      );
      const inflow = data.reduce((s, d) => s + d.inflow, 0);
      const outflow = data.reduce((s, d) => s + d.outflow, 0);
      return {
        endYear,
        net: inflow - outflow,
        lowest,
        runway: narrative?.cashRunwayMonths ?? null,
      };
    }, [data, narrative]);

    const today = new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const urgency = narrative?.urgency ?? "low";
    const urgencyColor = URGENCY_COLORS[urgency];

    return (
      <div
        ref={ref}
        style={{
          position: "fixed",
          left: -10000,
          top: 0,
          zIndex: -1,
          pointerEvents: "none",
        }}
        aria-hidden
      >
        {/* PAGE 1 — EXECUTIVE SUMMARY */}
        <div data-pdf-page style={pageStyle}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-end",
              borderBottom: "1px solid rgba(255,255,255,0.1)",
              paddingBottom: 14,
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 11,
                  color: "#a3a3b5",
                  letterSpacing: 3,
                  textTransform: "uppercase",
                }}
              >
                Cash Flow Time Machine
              </div>
              <div style={{ fontSize: 32, fontWeight: 700, marginTop: 4 }}>
                Scenario Report
              </div>
            </div>
            <div style={{ textAlign: "right", fontSize: 11, color: "#cbd5e1", lineHeight: 1.6 }}>
              <div style={{ fontWeight: 600, color: "#fff" }}>{company}</div>
              <div>{today}</div>
              <div style={{ color: "#a3a3b5" }}>
                Scenario: <span style={{ color: "#fff" }}>{scenarioName}</span>
              </div>
            </div>
          </div>

          {/* KPI BOXES */}
          <div>
            <div style={sectionTitle}>KPI Summary</div>
            <div style={{ display: "flex", gap: 12 }}>
              <KpiBox
                label="End-Year Cash"
                value={fmtShort(kpis.endYear)}
                color={kpis.endYear >= 0 ? "#10b981" : "#ef4444"}
              />
              <KpiBox
                label="Net Cash Flow"
                value={fmtShort(kpis.net)}
                color={kpis.net >= 0 ? "#10b981" : "#ef4444"}
              />
              <KpiBox
                label="Lowest Month"
                value={`${kpis.lowest.month} · ${fmtShort(kpis.lowest.cumulativeCash)}`}
                color={kpis.lowest.cumulativeCash >= 0 ? "#f59e0b" : "#ef4444"}
              />
              <KpiBox
                label="Cash Runway"
                value={kpis.runway === null ? "∞ Indefinite" : `${kpis.runway} mo`}
                color={kpis.runway === null ? "#10b981" : "#ef4444"}
              />
            </div>
          </div>

          {/* PARAMETERS + NARRATIVE */}
          <div style={{ display: "flex", gap: 16, flex: 1, minHeight: 0 }}>
            <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
              <div style={sectionTitle}>Scenario Parameters</div>
              <div
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 12,
                  padding: 14,
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 8,
                }}
              >
                {(Object.keys(LEVER_LABELS) as (keyof Levers)[]).map((k) => (
                  <div
                    key={k}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: 11,
                      padding: "4px 6px",
                      borderBottom: "1px solid rgba(255,255,255,0.05)",
                    }}
                  >
                    <span style={{ color: "#cbd5e1" }}>{LEVER_LABELS[k].label}</span>
                    <span style={{ fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
                      {LEVER_LABELS[k].format(levers[k])}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ flex: 1.4, display: "flex", flexDirection: "column" }}>
              <div style={sectionTitle}>AI CFO Brief</div>
              <div
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: `1px solid ${urgencyColor}40`,
                  borderRadius: 12,
                  padding: 14,
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                  minHeight: 0,
                }}
              >
                <div>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: 1.5,
                      color: urgencyColor,
                      background: `${urgencyColor}1A`,
                      border: `1px solid ${urgencyColor}40`,
                      padding: "3px 8px",
                      borderRadius: 6,
                    }}
                  >
                    {urgency} urgency
                  </span>
                </div>
                <div style={{ fontSize: 16, fontWeight: 700, fontStyle: "italic" }}>
                  {narrative?.headline ?? "AI brief not yet generated."}
                </div>
                <div style={{ fontSize: 11, color: "#cbd5e1", lineHeight: 1.5 }}>
                  {narrative?.summary ?? "Generate the AI brief in the app before exporting for the most insight-rich report."}
                </div>
                <div style={{ display: "flex", gap: 10, marginTop: "auto" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 10, color: "#fca5a5", fontWeight: 700, marginBottom: 4 }}>
                      ⚠ KEY RISKS
                    </div>
                    {(narrative?.risks ?? []).map((r, i) => (
                      <div key={i} style={{ fontSize: 10, color: "#e5e7eb", marginBottom: 3 }}>
                        {i + 1}. {r}
                      </div>
                    ))}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 10, color: "#86efac", fontWeight: 700, marginBottom: 4 }}>
                      ✓ RECOMMENDATIONS
                    </div>
                    {(narrative?.recommendations ?? []).map((r, i) => (
                      <div key={i} style={{ fontSize: 10, color: "#e5e7eb", marginBottom: 3 }}>
                        {i + 1}. {r}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div style={{ fontSize: 9, color: "#6b7280", textAlign: "center" }}>
            Page 1 / 3 · Generated by Cash Flow Time Machine
          </div>
        </div>

        {/* PAGE 2 — CHARTS & ANALYSIS */}
        <div data-pdf-page style={pageStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: 22, fontWeight: 700 }}>📈 Charts & Risk Analysis</div>
            <div style={{ fontSize: 11, color: "#a3a3b5" }}>{scenarioName} · {today}</div>
          </div>

          <div>
            <div style={sectionTitle}>12-Month Cumulative Cash</div>
            <div
              style={{
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 12,
                padding: 14,
              }}
            >
              <MiniSparkline data={data} />
            </div>
          </div>

          {mc && (
            <div>
              <div style={sectionTitle}>Monte Carlo Probability of Negative Cash</div>
              <HeatRow mc={mc} />
              <div style={{ fontSize: 10, color: "#a3a3b5", marginTop: 6 }}>
                Median EOY: {fmtShort(mc.summary.medianEndYear)} · p10: {fmtShort(mc.summary.worstCaseEndYear)} · p90:{" "}
                {fmtShort(mc.summary.bestCaseEndYear)} · Max P(negative): {Math.round(mc.summary.maxProbabilityNegative * 100)}%
              </div>
            </div>
          )}

          {stakeholders && (
            <div style={{ display: "flex", gap: 16, flex: 1, minHeight: 0 }}>
              <div
                style={{
                  flex: 1,
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 12,
                  padding: 16,
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <div style={sectionTitle}>Stakeholder Consensus</div>
                <div
                  style={{
                    fontSize: 56,
                    fontWeight: 700,
                    color:
                      stakeholders.consensus.averageSentiment >= 0 ? "#10b981" : "#ef4444",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {stakeholders.consensus.averageSentiment > 0
                    ? `+${stakeholders.consensus.averageSentiment}`
                    : stakeholders.consensus.averageSentiment}
                </div>
                <div style={{ fontSize: 11, color: "#cbd5e1", textAlign: "center", maxWidth: 320 }}>
                  {stakeholders.consensus.recommendation}
                </div>
              </div>
              <div style={{ flex: 1.6, display: "flex", flexDirection: "column", gap: 10, minHeight: 0 }}>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#86efac", marginBottom: 4 }}>
                    ✓ POINTS OF AGREEMENT
                  </div>
                  {stakeholders.consensus.agreements.map((a, i) => (
                    <div key={i} style={{ fontSize: 11, color: "#e5e7eb", marginBottom: 2 }}>
                      • {a}
                    </div>
                  ))}
                </div>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#fcd34d", marginBottom: 4 }}>
                    ⚡ POINTS OF CONFLICT
                  </div>
                  {stakeholders.consensus.conflicts.map((c, i) => (
                    <div key={i} style={{ fontSize: 11, color: "#e5e7eb", marginBottom: 2 }}>
                      • {c}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div style={{ fontSize: 9, color: "#6b7280", textAlign: "center" }}>
            Page 2 / 3
          </div>
        </div>

        {/* PAGE 3 — STAKEHOLDER ANALYSIS */}
        <div data-pdf-page style={pageStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: 22, fontWeight: 700 }}>👥 Stakeholder War Room</div>
            <div style={{ fontSize: 11, color: "#a3a3b5" }}>{scenarioName} · {today}</div>
          </div>

          {stakeholders ? (
            <>
              <div style={{ display: "flex", gap: 12, flex: 1 }}>
                {stakeholders.reactions.slice(0, 3).map((r) => (
                  <AgentMiniCard key={r.agentId} r={r} />
                ))}
              </div>
              <div style={{ display: "flex", gap: 12, flex: 1 }}>
                {stakeholders.reactions.slice(3, 5).map((r) => (
                  <AgentMiniCard key={r.agentId} r={r} />
                ))}
                <div
                  style={{
                    flex: 1,
                    background: "linear-gradient(135deg, rgba(99,102,241,0.12), rgba(99,102,241,0.04))",
                    border: "1px solid rgba(99,102,241,0.3)",
                    borderRadius: 12,
                    padding: 16,
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                  }}
                >
                  <div style={{ fontSize: 10, color: "#a5b4fc", fontWeight: 700, letterSpacing: 1.5 }}>
                    ROOM SYNTHESIS
                  </div>
                  <div
                    style={{
                      fontSize: 36,
                      fontWeight: 700,
                      color:
                        stakeholders.consensus.averageSentiment >= 0 ? "#10b981" : "#ef4444",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {stakeholders.consensus.averageSentiment > 0
                      ? `+${stakeholders.consensus.averageSentiment}`
                      : stakeholders.consensus.averageSentiment}
                  </div>
                  <div style={{ fontSize: 10, color: "#cbd5e1", fontStyle: "italic", lineHeight: 1.5 }}>
                    {stakeholders.consensus.recommendation}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#a3a3b5" }}>
              Stakeholder analysis not yet generated.
            </div>
          )}

          <div style={{ fontSize: 9, color: "#6b7280", textAlign: "center" }}>
            Page 3 / 3 · Confidential — Internal Board Use
          </div>
        </div>
      </div>
    );
  },
);
