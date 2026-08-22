import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowDown,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Home,
  Cpu,
  Download,
  FileSpreadsheet,
  FileUp,
  Gauge,
  History,
  KeyRound,
  Layers,
  Lock,
  Mail,
  Moon,
  ScanLine,
  ShieldCheck,
  SlidersHorizontal,
  Sun,
  Upload,
  Wind,
} from "lucide-react";

// TODO: adjust to your project's actual paths -----------------------------
import { useAppDispatch, useAppSelector } from "../app/redux";
import { toggleTheme } from "../app/features/theme/themeSlice";
import { companyName } from "../core/config";
import { useSEO } from "../utils/useSeo";
import { useGoogleFont } from "../utils/useGoogleFont";
import { metrics } from "../api/predictionApi";
// ---------------------------------------------------------------------------

/* ---------------------------------------------------------------------------
Metrics contract (mirrors the backend `MetricsResponse`)
--------------------------------------------------------------------------- */
interface MetricsResponse {
  mae: number;
  mse: number;
  rmse: number;
  r2: number;
}

type MetricUnit = "score" | "ratio";

interface MetricCardData {
  key: string;
  label: string;
  name: string;
  value: number;
  unit: MetricUnit;
  description: string;
  direction: "lower" | "higher";
}

type MetricsStatus = "loading" | "success" | "error";

/* ---------------------------------------------------------------------------
Shared class fragments
--------------------------------------------------------------------------- */
const CONTAINER = "mx-auto w-full max-w-6xl px-5 sm:px-8";

const BTN_BASE =
  "inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold " +
  "transition-all duration-200 focus-visible:outline focus-visible:outline-2 " +
  "focus-visible:outline-offset-2 focus-visible:outline-[var(--bc-accent)]";

const BTN_PRIMARY =
  `${BTN_BASE} bg-[var(--bc-cta-bg)] text-[var(--bc-cta-ink)] hover:-translate-y-0.5 ` +
  "hover:shadow-[0_14px_30px_-14px_color-mix(in_srgb,var(--bc-cta-bg)_65%,transparent)]";

const BTN_GHOST =
  `${BTN_BASE} border border-[var(--bc-border-strong)] ` +
  "bg-[color-mix(in_srgb,var(--bc-surface)_55%,transparent)] text-[var(--bc-ink)] " +
  "backdrop-blur-sm hover:bg-[var(--bc-surface)]";

const ICON_BTN =
  "inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--bc-border)] " +
  "bg-[var(--bc-surface)] text-[var(--bc-ink-soft)] transition-colors hover:border-[var(--bc-border-strong)] " +
  "hover:text-[var(--bc-ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 " +
  "focus-visible:outline-[var(--bc-accent)]";

/* ---------------------------------------------------------------------------
Content data
--------------------------------------------------------------------------- */
interface IconItem {
  icon: React.ElementType;
  title: string;
  desc: string;
}

const CAPABILITIES: IconItem[] = [
  { icon: Gauge, title: "Single prediction", desc: "Analyze one set of environmental conditions." },
  { icon: FileUp, title: "CSV batch", desc: "Process an entire dataset at once." },
  { icon: History, title: "Private history", desc: "Results stay tied to your account." },
  { icon: BarChart3, title: "Model metrics", desc: "Evaluated prediction quality." },
];

interface StepDef {
  icon: React.ElementType;
  title: string;
  body: string;
}

const SINGLE_STEPS: StepDef[] = [
  { icon: SlidersHorizontal, title: "Enter conditions", body: "Provide environmental and weather inputs." },
  { icon: ScanLine, title: "Analyze", body: "The model evaluates the combination." },
  { icon: Gauge, title: "Predict", body: "An AQI prediction is generated." },
  { icon: CheckCircle2, title: "Review", body: "See the result in context." },
];

const BATCH_STEPS: StepDef[] = [
  { icon: Upload, title: "Upload CSV", body: "Provide your environmental dataset." },
  { icon: ShieldCheck, title: "Validate", body: "Structure and required fields are checked." },
  { icon: Cpu, title: "Process", body: "Each record is analyzed." },
  { icon: Layers, title: "Enrich", body: "prediction, status, and message are added." },
  { icon: Download, title: "Download", body: "Get your processed CSV." },
];

const AUTH_METHODS: IconItem[] = [
  { icon: Mail, title: "Email & password", desc: "Classic sign-in with your email." },
  { icon: KeyRound, title: "OTP verification", desc: "Confirm your account with a one-time code." },
  { icon: Home, title: "Google sign-in", desc: "Use your Google account to get started." },
];

/* ---------------------------------------------------------------------------
Metrics helpers
--------------------------------------------------------------------------- */
function buildMetricCards(m: MetricsResponse): MetricCardData[] {
  return [
    {
      key: "r2",
      label: "R²",
      name: "Fit score",
      value: m.r2,
      unit: "ratio",
      description: "How closely predictions track observed values, from 0 to 1. Closer to 1 is better.",
      direction: "higher",
    },
    {
      key: "mae",
      label: "MAE",
      name: "Average error",
      value: m.mae,
      unit: "score",
      description: "The typical difference between a prediction and the observed value. Lower is better.",
      direction: "lower",
    },
    {
      key: "rmse",
      label: "RMSE",
      name: "Error magnitude",
      value: m.rmse,
      unit: "score",
      description: "Error that weighs larger misses more heavily. Lower is better.",
      direction: "lower",
    },
    {
      key: "mse",
      label: "MSE",
      name: "Squared error",
      value: m.mse,
      unit: "score",
      description: "The average of squared prediction errors. Lower is better.",
      direction: "lower",
    },
  ];
}

function formatMetric(value: number, unit: MetricUnit): string {
  if (!Number.isFinite(value)) return "—";
  if (unit === "ratio") return value.toFixed(3);

  const abs = Math.abs(value);
  if (abs >= 1000) return value.toLocaleString(undefined, { maximumFractionDigits: 0 });
  if (abs >= 100) return value.toFixed(1);
  return value.toFixed(2);
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

/* ---------------------------------------------------------------------------
Scroll reveal (CSS-driven, IntersectionObserver only — no animation loop)
--------------------------------------------------------------------------- */
function useReveal<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisible(true);
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -48px 0px" }
    );

    io.observe(el);
    return () => io.disconnect();
  }, []);

  return { ref, visible };
}

const Reveal: React.FC<{
  children: React.ReactNode;
  className?: string;
  delay?: number;
}> = ({ children, className = "", delay = 0 }) => {
  const { ref, visible } = useReveal<HTMLDivElement>();

  return (
    <div
      ref={ref}
      className={`ip-reveal ${visible ? "is-visible" : ""} ${className}`}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  );
};

/* ---------------------------------------------------------------------------
Atmospheric backdrop (manual SVG + CSS only)
--------------------------------------------------------------------------- */
const AtmosphereBackdrop: React.FC<{ isDark: boolean; idPrefix: string }> = ({
  isDark,
  idPrefix,
}) => {
  const particles = useMemo(
    () =>
      Array.from({ length: 14 }, (_, i) => ({
        id: i,
        cx: 4 + ((i * 37) % 92),
        cy: 8 + ((i * 53) % 84),
        r: 1.2 + (i % 3) * 0.5,
        dur: 15 + (i % 5) * 3,
        delay: -(i * 2.1),
      })),
    []
  );

  const stars = useMemo(
    () =>
      Array.from({ length: 16 }, (_, i) => ({
        id: i,
        cx: (i * 43) % 100,
        cy: (i * 29) % 60,
        r: 0.5 + (i % 3) * 0.3,
        dur: 3 + (i % 4),
        delay: -(i * 1.3),
      })),
    []
  );

  const accent = isDark ? "#4FD8C4" : "#10B981";
  const skyId = `${idPrefix}-sky`;
  const glowId = `${idPrefix}-glow`;

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <svg
        className="h-full w-full"
        viewBox="0 0 480 480"
        preserveAspectRatio="xMidYMid slice"
        focusable="false"
      >
        <defs>
          <linearGradient id={skyId} x1="0" y1="0" x2="0" y2="1">
            {isDark ? (
              <>
                <stop offset="0%" stopColor="#0C1A1F" />
                <stop offset="55%" stopColor="#081216" />
                <stop offset="100%" stopColor="#050B0D" />
              </>
            ) : (
              <>
                <stop offset="0%" stopColor="#F0FDFA" />
                <stop offset="55%" stopColor="#CCFBF1" />
                <stop offset="100%" stopColor="#99F6E4" />
              </>
            )}
          </linearGradient>

          <radialGradient id={glowId} cx="78%" cy="14%" r="50%">
            <stop
              offset="0%"
              stopColor={isDark ? "#123B39" : "#FEF3C7"}
              stopOpacity={isDark ? 0.55 : 0.8}
            />
            <stop
              offset="100%"
              stopColor={isDark ? "#123B39" : "#FEF3C7"}
              stopOpacity="0"
            />
          </radialGradient>
        </defs>

        <rect width="480" height="480" fill={`url(#${skyId})`} />
        <rect width="480" height="480" fill={`url(#${glowId})`} />

        {isDark &&
          stars.map((s) => (
            <circle
              key={s.id}
              className="ip-star"
              cx={(s.cx / 100) * 480}
              cy={(s.cy / 100) * 480}
              r={s.r}
              fill="#EAF4F2"
              style={{ animationDuration: `${s.dur}s`, animationDelay: `${s.delay}s` }}
            />
          ))}

        <g className="ip-cloud-a" opacity={isDark ? 0.5 : 0.9}>
          <ellipse cx="120" cy="150" rx="110" ry="24" fill={isDark ? "#12222A" : "#FFFFFF"} />
          <ellipse cx="198" cy="137" rx="72" ry="18" fill={isDark ? "#12222A" : "#FFFFFF"} />
        </g>

        <g className="ip-cloud-b" opacity={isDark ? 0.4 : 0.7}>
          <ellipse cx="340" cy="300" rx="130" ry="28" fill={isDark ? "#0E1B21" : "#FFFFFF"} />
          <ellipse cx="412" cy="286" rx="66" ry="17" fill={isDark ? "#0E1B21" : "#FFFFFF"} />
        </g>

        <g
          fill="none"
          strokeLinecap="round"
          strokeWidth="2"
          style={{ stroke: accent, strokeOpacity: isDark ? 0.3 : 0.28 }}
        >
          <path
            className="ip-wind"
            style={{ animationDuration: "7s" }}
            d="M -20 240 C 90 222, 150 258, 260 238 S 470 220, 520 236"
          />
          <path
            className="ip-wind"
            style={{ animationDuration: "8.5s", animationDelay: "-2s" }}
            d="M -30 278 C 80 294, 170 264, 250 282 S 440 296, 520 276"
          />
          <path
            className="ip-wind"
            style={{ animationDuration: "9.5s", animationDelay: "-4s" }}
            d="M -10 312 C 70 334, 140 294, 220 320 S 400 338, 520 308"
          />
        </g>

        {particles.map((p) => (
          <circle
            key={p.id}
            className="ip-particle"
            cx={(p.cx / 100) * 480}
            cy={(p.cy / 100) * 480}
            r={p.r}
            fill={accent}
            fillOpacity="0.5"
            style={{ animationDuration: `${p.dur}s`, animationDelay: `${p.delay}s` }}
          />
        ))}

        <path
          d="M0 380 C 120 360, 360 400, 480 372 L480 480 L0 480 Z"
          fill={accent}
          opacity="0.14"
        />
        <path
          d="M0 400 C 120 382, 360 418, 480 392 L480 480 L0 480 Z"
          fill={isDark ? "#081215" : "#A7F3D0"}
          opacity={isDark ? 0.85 : 0.6}
        />
      </svg>
    </div>
  );
};

/* ---------------------------------------------------------------------------
Hero focal gauge (abstract, no fabricated numbers)
--------------------------------------------------------------------------- */
const HeroGauge: React.FC<{ isDark: boolean }> = ({ isDark }) => {
  const accent = isDark ? "#4FD8C4" : "#10B981";
  const accentStrong = isDark ? "#7EE9DA" : "#059669";
  const inkFaint = isDark ? "#5E767B" : "#8DA3A2";

  const R = 112;
  const C = 2 * Math.PI * R;

  const chips = [
    { label: "Humidity", className: "left-0 top-10", delay: "0s" },
    { label: "Wind", className: "right-0 top-1/3", delay: "-2s" },
    { label: "Pressure", className: "bottom-8 left-6", delay: "-4s" },
  ];

  return (
    <div className="relative mx-auto flex h-[380px] w-[380px] items-center justify-center lg:h-[440px] lg:w-[440px]">
      <svg viewBox="0 0 400 400" className="h-full w-full" aria-hidden="true" focusable="false">
        <defs>
          <radialGradient id="ip-gauge-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={accent} stopOpacity="0.16" />
            <stop offset="100%" stopColor={accent} stopOpacity="0" />
          </radialGradient>
        </defs>

        <circle cx="200" cy="200" r="190" fill="url(#ip-gauge-glow)" />

        <circle
          className="ip-ring-rot"
          cx="200"
          cy="200"
          r="170"
          fill="none"
          stroke={accent}
          strokeOpacity="0.22"
          strokeWidth="1"
          strokeDasharray="2 9"
        />
        <circle
          className="ip-ring-rot-rev"
          cx="200"
          cy="200"
          r="140"
          fill="none"
          stroke={accent}
          strokeOpacity="0.16"
          strokeWidth="1"
          strokeDasharray="1 7"
        />

        <circle cx="200" cy="200" r={R} fill="none" stroke={inkFaint} strokeOpacity="0.25" strokeWidth="8" />
        <circle
          cx="200"
          cy="200"
          r={R}
          fill="none"
          stroke={accentStrong}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={`${C * 0.62} ${C}`}
          transform="rotate(-90 200 200)"
          opacity="0.9"
        />

        <g className="ip-sweep">
          <line x1="200" y1="200" x2="200" y2="62" stroke={accent} strokeOpacity="0.5" strokeWidth="1.5" />
        </g>

        <circle className="ip-pulse-node" cx="200" cy="200" r="10" fill="none" stroke={accent} strokeOpacity="0.5" strokeWidth="1" />
        <circle cx="200" cy="200" r="5" fill={accentStrong} />

        <circle className="ip-pulse-node" cx="200" cy="88" r="4" fill={accentStrong} style={{ animationDelay: "-1s" }} />
        <circle className="ip-pulse-node" cx="312" cy="200" r="4" fill={accent} style={{ animationDelay: "-2s" }} />
        <circle className="ip-pulse-node" cx="120" cy="290" r="4" fill={accentStrong} style={{ animationDelay: "-3s" }} />
      </svg>

      {chips.map((chip) => (
        <span
          key={chip.label}
          aria-hidden="true"
          className={`ip-float-chip absolute ${chip.className} rounded-full border border-[var(--bc-border-strong)] ` +
            "bg-[color-mix(in_srgb,var(--bc-surface)_70%,transparent)] px-3 py-1 text-xs font-medium " +
            "text-[var(--bc-ink-soft)] backdrop-blur-sm"}
          style={{ animationDelay: chip.delay }}
        >
          {chip.label}
        </span>
      ))}
    </div>
  );
};

/* ---------------------------------------------------------------------------
Small decorative visuals for the capability cards
--------------------------------------------------------------------------- */
const SingleVisual: React.FC<{ isDark: boolean }> = ({ isDark }) => {
  const accent = isDark ? "#4FD8C4" : "#10B981";
  const faint = isDark ? "#5E767B" : "#8DA3A2";
  const r = 34;
  const c = 2 * Math.PI * r;

  return (
    <svg viewBox="0 0 220 120" className="h-32 w-full" aria-hidden="true" focusable="false">
      <rect x="10" y="18" width="64" height="9" rx="4.5" fill={faint} opacity="0.35" />
      <rect x="10" y="38" width="78" height="9" rx="4.5" fill={faint} opacity="0.28" />
      <rect x="10" y="58" width="56" height="9" rx="4.5" fill={faint} opacity="0.22" />
      <rect x="10" y="78" width="70" height="9" rx="4.5" fill={faint} opacity="0.18" />

      <path d="M96 60 H128" stroke={accent} strokeWidth="1.5" strokeDasharray="3 4" opacity="0.7" />
      <path d="M124 55 l8 5 -8 5" fill="none" stroke={accent} strokeWidth="1.5" opacity="0.7" />

      <circle cx="170" cy="60" r={r} fill="none" stroke={faint} strokeOpacity="0.25" strokeWidth="7" />
      <circle
        cx="170"
        cy="60"
        r={r}
        fill="none"
        stroke={accent}
        strokeWidth="7"
        strokeLinecap="round"
        strokeDasharray={`${c * 0.66} ${c}`}
        transform="rotate(-90 170 60)"
      />
      <circle cx="170" cy="60" r="3" fill={accent} />
    </svg>
  );
};

const BatchVisual: React.FC<{ isDark: boolean }> = ({ isDark }) => {
  const accent = isDark ? "#4FD8C4" : "#10B981";
  const faint = isDark ? "#5E767B" : "#8DA3A2";

  return (
    <svg viewBox="0 0 220 120" className="h-32 w-full" aria-hidden="true" focusable="false">
      {[0, 1, 2].map((row) => (
        <g key={row}>
          <rect x="14" y={22 + row * 28} width="40" height="16" rx="4" fill={faint} opacity="0.28" />
          <rect x="60" y={22 + row * 28} width="40" height="16" rx="4" fill={faint} opacity="0.22" />
        </g>
      ))}

      <path d="M112 60 H138" stroke={accent} strokeWidth="1.5" strokeDasharray="3 4" opacity="0.7" />
      <path d="M134 55 l8 5 -8 5" fill="none" stroke={accent} strokeWidth="1.5" opacity="0.7" />

      <rect x="150" y="6" width="52" height="8" rx="4" fill={accent} opacity="0.35" />
      {[0, 1, 2].map((row) => (
        <rect key={row} x="150" y={22 + row * 28} width="52" height="16" rx="4" fill={accent} opacity={0.75 - row * 0.15} />
      ))}
    </svg>
  );
};

const HistoryVisual: React.FC<{ isDark: boolean }> = ({ isDark }) => {
  const accent = isDark ? "#4FD8C4" : "#10B981";
  const faint = isDark ? "#5E767B" : "#8DA3A2";
  const card = isDark ? "#101C21" : "#FFFFFF";

  return (
    <svg viewBox="0 0 220 120" className="h-32 w-full" aria-hidden="true" focusable="false">
      <rect x="50" y="30" width="120" height="60" rx="10" fill={faint} opacity="0.15" />
      <rect x="42" y="22" width="120" height="60" rx="10" fill={faint} opacity="0.25" />
      <rect x="34" y="14" width="120" height="60" rx="10" fill={card} stroke={accent} strokeOpacity="0.35" />

      <rect x="46" y="28" width="60" height="7" rx="3.5" fill={accent} opacity="0.7" />
      <rect x="46" y="42" width="84" height="6" rx="3" fill={faint} opacity="0.35" />
      <rect x="46" y="54" width="70" height="6" rx="3" fill={faint} opacity="0.28" />

      <circle cx="140" cy="31" r="6" fill={accent} opacity="0.8" />
    </svg>
  );
};

/* ---------------------------------------------------------------------------
Shared section header
--------------------------------------------------------------------------- */
const SectionHeader: React.FC<{
  eyebrow?: string;
  title: string;
  sub?: string;
}> = ({ eyebrow, title, sub }) => (
  <div className="mx-auto max-w-2xl text-center">
    {eyebrow && (
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--bc-accent-strong)]">
        {eyebrow}
      </p>
    )}
    <h2 className="mt-3 font-[var(--bc-font-display)] text-3xl font-semibold text-[var(--bc-ink)] sm:text-4xl">
      {title}
    </h2>
    {sub && <p className="mt-4 text-base leading-relaxed text-[var(--bc-ink-soft)]">{sub}</p>}
  </div>
);

/* ---------------------------------------------------------------------------
Model metrics (real data only)
--------------------------------------------------------------------------- */
const MetricSkeleton: React.FC = () => (
  <div className="ip-skeleton rounded-2xl border border-[var(--bc-border)] bg-[var(--bc-surface)] p-6">
    <div className="h-3 w-16 rounded-full bg-[var(--bc-track)]" />
    <div className="mt-4 h-8 w-24 rounded-md bg-[var(--bc-track)]" />
    <div className="mt-3 h-3 w-28 rounded-full bg-[var(--bc-track)]" />
    <div className="mt-4 h-3 w-full rounded-full bg-[var(--bc-track)]" />
    <div className="mt-2 h-3 w-2/3 rounded-full bg-[var(--bc-track)]" />
  </div>
);

const ModelMetrics: React.FC = () => {
  const [status, setStatus] = useState<MetricsStatus>("loading");
  const [cards, setCards] = useState<MetricCardData[]>([]);

  useEffect(() => {
    let active = true;

    metrics()
      .then((res: MetricsResponse) => {
        if (!active) return;
        setCards(buildMetricCards(res));
        setStatus("success");
      })
      .catch(() => {
        if (active) setStatus("error");
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <section id="model-performance" className="py-20 sm:py-24">
      <div className={CONTAINER}>
        <Reveal>
          <SectionHeader
            eyebrow="Model performance"
            title="How well the model predicts"
            sub="Every prediction comes from a model evaluated against observed data. These metrics summarize that performance."
          />
        </Reveal>

        <div className="mt-12">
          {status === "loading" && (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              <MetricSkeleton />
              <MetricSkeleton />
              <MetricSkeleton />
              <MetricSkeleton />
            </div>
          )}

          {status === "error" && (
            <Reveal>
              <div className="mx-auto max-w-xl rounded-2xl border border-[var(--bc-border)] bg-[var(--bc-surface)] p-8 text-center">
                <p className="text-sm text-[var(--bc-ink-soft)]">
                  Model performance metrics are temporarily unavailable. The rest of{" "}
                  {companyName} works as usual.
                </p>
              </div>
            </Reveal>
          )}

          {status === "success" && (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {cards.map((card, i) => (
                <Reveal key={card.key} delay={i * 70}>
                  <div className="h-full rounded-2xl border border-[var(--bc-border)] bg-[var(--bc-surface)] p-6 shadow-[var(--bc-shadow)]">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold uppercase tracking-wider text-[var(--bc-ink-faint)]">
                        {card.label}
                      </span>
                      <span className="text-[10px] font-medium text-[var(--bc-ink-faint)]">
                        {card.direction === "lower" ? "↓ lower is better" : "↑ closer to 1"}
                      </span>
                    </div>

                    <p className="mt-4 font-[var(--bc-font-display)] text-3xl font-semibold text-[var(--bc-ink)]">
                      {formatMetric(card.value, card.unit)}
                    </p>
                    <p className="mt-1 text-sm font-medium text-[var(--bc-ink-soft)]">{card.name}</p>

                    {card.unit === "ratio" && (
                      <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-[var(--bc-track)]">
                        <div
                          className="h-full origin-left rounded-full bg-[var(--bc-accent)]"
                          style={{ transform: `scaleX(${clamp01(card.value)})` }}
                        />
                      </div>
                    )}

                    <p className="mt-4 text-xs leading-relaxed text-[var(--bc-ink-faint)]">
                      {card.description}
                    </p>
                  </div>
                </Reveal>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

/* ---------------------------------------------------------------------------
How it works (single + batch flows)
--------------------------------------------------------------------------- */
type FlowKey = "single" | "batch";

const HowItWorks: React.FC = () => {
  const [flow, setFlow] = useState<FlowKey>("single");
  const steps = flow === "single" ? SINGLE_STEPS : BATCH_STEPS;

  const tabClass = (active: boolean) =>
    `rounded-full px-5 py-2 text-sm font-semibold transition-colors focus-visible:outline ` +
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--bc-accent)] " +
    (active
      ? "bg-[var(--bc-cta-bg)] text-[var(--bc-cta-ink)]"
      : "text-[var(--bc-ink-soft)] hover:text-[var(--bc-ink)]");

  return (
    <section id="how-it-works" className="py-20 sm:py-24">
      <div className={CONTAINER}>
        <Reveal>
          <SectionHeader
            eyebrow="Process"
            title="How it works"
            sub="From input to result in a few clear steps."
          />
        </Reveal>

        <Reveal className="mt-8 flex justify-center">
          <div
            role="tablist"
            aria-label="Prediction flow"
            className="inline-flex rounded-full border border-[var(--bc-border-strong)] bg-[var(--bc-surface)] p-1"
          >
            <button
              type="button"
              role="tab"
              aria-selected={flow === "single"}
              className={tabClass(flow === "single")}
              onClick={() => setFlow("single")}
            >
              Single prediction
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={flow === "batch"}
              className={tabClass(flow === "batch")}
              onClick={() => setFlow("batch")}
            >
              CSV batch
            </button>
          </div>
        </Reveal>

        <div key={flow} className="ip-fade-in mt-12">
          <ol className="flex flex-col gap-6 md:flex-row md:items-stretch md:gap-2">
            {steps.map((step, i) => (
              <React.Fragment key={step.title}>
                <li className="flex-1 rounded-2xl border border-[var(--bc-border)] bg-[var(--bc-surface)] p-5 shadow-[var(--bc-shadow)]">
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--bc-accent)_14%,transparent)] text-sm font-semibold text-[var(--bc-accent-strong)]">
                      {i + 1}
                    </span>
                    <step.icon className="h-5 w-5 text-[var(--bc-accent-strong)]" aria-hidden="true" />
                  </div>
                  <h3 className="mt-4 text-base font-semibold text-[var(--bc-ink)]">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--bc-ink-soft)]">{step.body}</p>
                </li>

                {i < steps.length - 1 && (
                  <div className="hidden items-center md:flex" aria-hidden="true">
                    <ArrowRight className="h-4 w-4 text-[var(--bc-ink-faint)]" />
                  </div>
                )}
                {i < steps.length - 1 && (
                  <div className="flex justify-center md:hidden" aria-hidden="true">
                    <ArrowDown className="h-4 w-4 text-[var(--bc-ink-faint)]" />
                  </div>
                )}
              </React.Fragment>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
};

/* ---------------------------------------------------------------------------
Global styles (theme variables + keyframes + specialized animation only)
--------------------------------------------------------------------------- */
const GLOBAL_CSS = `
  .ip-root {
    --bc-font-display: 'Fraunces', 'Georgia', serif;
    --bc-font-body: 'Plus Jakarta Sans', 'Inter', system-ui, sans-serif;
  }

  .ip-root[data-theme='day'] {
    --bc-bg: #F8FAFC;
    --bc-bg-soft: #F0FDF4;
    --bc-surface: #FFFFFF;
    --bc-surface-2: #F0FDF4;
    --bc-ink: #0F2827;
    --bc-ink-soft: #4A6665;
    --bc-ink-faint: #8DA3A2;
    --bc-accent: #10B981;
    --bc-accent-strong: #059669;
    --bc-cta-bg: #059669;
    --bc-cta-ink: #F4FBF9;
    --bc-border: rgba(16, 185, 129, 0.15);
    --bc-border-strong: rgba(16, 185, 129, 0.35);
    --bc-focus-ring: rgba(16, 185, 129, 0.35);
    --bc-track: rgba(16, 185, 129, 0.12);
    --bc-shadow: 0 20px 60px -25px rgba(9, 30, 34, 0.35);
  }

  .ip-root[data-theme='dark'] {
    --bc-bg: #0A1418;
    --bc-bg-soft: #0C1A1E;
    --bc-surface: #101C21;
    --bc-surface-2: #0C1A1E;
    --bc-ink: #E7F1F0;
    --bc-ink-soft: #93ACB0;
    --bc-ink-faint: #5E767B;
    --bc-accent: #4FD8C4;
    --bc-accent-strong: #7EE9DA;
    --bc-cta-bg: #4FD8C4;
    --bc-cta-ink: #06231F;
    --bc-border: rgba(231, 241, 240, 0.12);
    --bc-border-strong: rgba(231, 241, 240, 0.22);
    --bc-focus-ring: rgba(79, 216, 196, 0.4);
    --bc-track: rgba(231, 241, 240, 0.1);
    --bc-shadow: 0 20px 60px -25px rgba(0, 0, 0, 0.55);
  }

  @keyframes ip-drift { from { transform: translate3d(-6%,0,0); } to { transform: translate3d(6%,0,0); } }
  @keyframes ip-drift-slow { from { transform: translate3d(-4%,0,0); } to { transform: translate3d(5%,0,0); } }
  @keyframes ip-float {
    0%, 100% { transform: translate3d(0,0,0); opacity: .5; }
    50% { transform: translate3d(0,-13px,0); opacity: .95; }
  }
  @keyframes ip-wind-flow { from { stroke-dashoffset: 240; } to { stroke-dashoffset: 0; } }
  @keyframes ip-twinkle { 0%, 100% { opacity: .15; } 50% { opacity: .85; } }
  @keyframes ip-ring-rot { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  @keyframes ip-ring-rot-rev { from { transform: rotate(360deg); } to { transform: rotate(0deg); } }
  @keyframes ip-sweep { from { transform: rotate(-90deg); } to { transform: rotate(270deg); } }
  @keyframes ip-pulse { 0%, 100% { transform: scale(1); opacity: .6; } 50% { transform: scale(1.35); opacity: 1; } }
  @keyframes ip-shimmer { from { transform: translateX(-100%); } to { transform: translateX(100%); } }
  @keyframes ip-fade-up { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: none; } }
  @keyframes ip-fade-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }

  .ip-cloud-a { animation: ip-drift 52s ease-in-out infinite alternate; }
  .ip-cloud-b { animation: ip-drift-slow 70s ease-in-out infinite alternate; }
  .ip-particle { animation: ip-float ease-in-out infinite; transform-box: fill-box; transform-origin: center; }
  .ip-wind { stroke-dasharray: 8 14; animation: ip-wind-flow linear infinite; }
  .ip-star { animation: ip-twinkle ease-in-out infinite; transform-box: fill-box; transform-origin: center; }
  .ip-ring-rot { transform-box: fill-box; transform-origin: center; animation: ip-ring-rot 40s linear infinite; }
  .ip-ring-rot-rev { transform-box: fill-box; transform-origin: center; animation: ip-ring-rot-rev 52s linear infinite; }
  .ip-sweep { transform-box: fill-box; transform-origin: center; animation: ip-sweep 7s linear infinite; }
  .ip-pulse-node { transform-box: fill-box; transform-origin: center; animation: ip-pulse 3.2s ease-in-out infinite; }
  .ip-float-chip { animation: ip-float 6s ease-in-out infinite; }
  .ip-hero-anim { animation: ip-fade-up .8s cubic-bezier(.16,1,.3,1) both; }
  .ip-fade-in { animation: ip-fade-in .5s cubic-bezier(.16,1,.3,1) both; }

  .ip-skeleton { position: relative; overflow: hidden; }
  .ip-skeleton::after {
    content: '';
    position: absolute;
    inset: 0;
    transform: translateX(-100%);
    background: linear-gradient(90deg, transparent, color-mix(in srgb, var(--bc-ink) 6%, transparent), transparent);
    animation: ip-shimmer 1.6s ease-in-out infinite;
  }

  .ip-reveal { opacity: 0; transform: translateY(20px); transition: opacity .7s ease, transform .7s cubic-bezier(.16,1,.3,1); }
  .ip-reveal.is-visible { opacity: 1; transform: none; }

  @media (prefers-reduced-motion: reduce) {
    .ip-cloud-a, .ip-cloud-b, .ip-particle, .ip-wind, .ip-star,
    .ip-ring-rot, .ip-ring-rot-rev, .ip-sweep, .ip-pulse-node,
    .ip-float-chip, .ip-hero-anim, .ip-fade-in, .ip-skeleton::after {
      animation: none !important;
    }
    .ip-reveal { opacity: 1; transform: none; transition: none; }
  }
`;

/* ---------------------------------------------------------------------------
Page
--------------------------------------------------------------------------- */
const IntroPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const mode = useAppSelector((state) => state.theme.mode);
  const isDark = mode === "dark";

  useSEO(
    `${companyName} — Air Quality & Environmental Intelligence`,
    `Predict AQI from environmental and weather conditions. ${companyName} analyzes single scenarios and entire CSV datasets, with prediction history kept in your account.`
  );

  useGoogleFont("Fraunces");
  useGoogleFont("Plus Jakarta Sans");

  const handleToggleTheme = () => dispatch(toggleTheme());

  return (
    <div
      className="ip-root min-h-screen bg-[var(--bc-bg)] font-[var(--bc-font-body)] text-[var(--bc-ink)] antialiased"
      data-theme={isDark ? "dark" : "day"}
    >
      <style>{GLOBAL_CSS}</style>

      {/* ============================ NAV ============================ */}
      <header className="sticky top-0 z-40 border-b border-[var(--bc-border)] bg-[color-mix(in_srgb,var(--bc-bg)_72%,transparent)] backdrop-blur-md">
        <div className={`${CONTAINER} flex h-16 items-center justify-between`}>
          <Link
            to="/"
            className="flex items-center gap-2.5 rounded-lg p-1 text-[var(--bc-ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--bc-accent)]"
            aria-label={`${companyName} home`}
          >
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-[9px] bg-[color-mix(in_srgb,var(--bc-accent)_16%,transparent)] text-[var(--bc-accent-strong)]">
              <Wind size={16} strokeWidth={2.25} aria-hidden="true" />
            </span>
            <span className="font-[var(--bc-font-display)] text-lg font-semibold tracking-[0.01em]">
              {companyName}
            </span>
          </Link>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              className={ICON_BTN}
              onClick={handleToggleTheme}
              aria-label={isDark ? "Switch to day theme" : "Switch to dark theme"}
            >
              {isDark ? <Sun size={15} aria-hidden="true" /> : <Moon size={15} aria-hidden="true" />}
            </button>

            <Link to="/login" className={`${BTN_GHOST} hidden !px-4 !py-2 sm:inline-flex`}>
              Sign in
            </Link>

            <Link to="/signup" className={`${BTN_PRIMARY} !px-4 !py-2`}>
              Get Started
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* ============================ HERO ============================ */}
        <section className="relative overflow-hidden">
          <AtmosphereBackdrop isDark={isDark} idPrefix="hero" />

          <div className={`${CONTAINER} relative z-10 flex min-h-[calc(100vh-4rem)] items-center py-16`}>
            <div className="grid w-full items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
              <div className="ip-hero-anim max-w-xl">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--bc-accent-strong)]">
                  Environmental intelligence
                </p>

                <h1 className="mt-4 font-[var(--bc-font-display)] text-4xl font-semibold leading-[1.05] text-[var(--bc-ink)] sm:text-5xl lg:text-6xl">
                  Predict air quality from the environment itself.
                </h1>

                <p className="mt-5 text-base leading-relaxed text-[var(--bc-ink-soft)] sm:text-lg">
                  {companyName} turns environmental and weather conditions into AQI predictions.
                  Analyze a single scenario, or upload a CSV and process every record — with your
                  history kept in your account.
                </p>

                <div className="mt-8 flex flex-wrap items-center gap-4">
                  <Link to="/signup" className={BTN_PRIMARY}>
                    Get Started
                    <ArrowRight size={16} aria-hidden="true" />
                  </Link>
                  <Link to="/login" className={BTN_GHOST}>
                    Sign in
                  </Link>
                </div>

                <div className="mt-8 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-[var(--bc-ink-faint)]">
                  <span>Single predictions</span>
                  <span aria-hidden="true">·</span>
                  <span>CSV batches</span>
                  <span aria-hidden="true">·</span>
                  <span>Private history</span>
                </div>
              </div>

              <div className="hidden lg:block">
                <HeroGauge isDark={isDark} />
              </div>
            </div>
          </div>
        </section>

        {/* ======================= CAPABILITY STRIP ======================= */}
        <section className="border-y border-[var(--bc-border)] bg-[var(--bc-bg-soft)]">
          <div className={`${CONTAINER} py-10`}>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {CAPABILITIES.map((cap, i) => (
                <Reveal key={cap.title} delay={i * 70}>
                  <div className="flex items-start gap-3">
                    <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--bc-accent)_14%,transparent)] text-[var(--bc-accent-strong)]">
                      <cap.icon size={18} aria-hidden="true" />
                    </span>
                    <div>
                      <h2 className="text-sm font-semibold text-[var(--bc-ink)]">{cap.title}</h2>
                      <p className="mt-1 text-xs leading-relaxed text-[var(--bc-ink-soft)]">{cap.desc}</p>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ========================= TWO MODES ========================= */}
        <section id="capabilities" className="py-20 sm:py-24">
          <div className={CONTAINER}>
            <Reveal>
              <SectionHeader
                eyebrow="Capabilities"
                title="Two ways to predict"
                sub="Start with a single scenario, or bring an entire dataset."
              />
            </Reveal>

            <div className="mt-12 grid gap-6 lg:grid-cols-2">
              {/* Single prediction */}
              <Reveal>
                <div className="h-full rounded-2xl border border-[var(--bc-border)] bg-[var(--bc-surface)] p-6 shadow-[var(--bc-shadow)] transition-transform duration-300 hover:-translate-y-1 sm:p-8">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--bc-accent)_14%,transparent)] text-[var(--bc-accent-strong)]">
                      <Gauge size={18} aria-hidden="true" />
                    </span>
                    <h3 className="text-lg font-semibold text-[var(--bc-ink)]">Single prediction</h3>
                  </div>

                  <p className="mt-4 text-sm leading-relaxed text-[var(--bc-ink-soft)]">
                    Describe environmental and weather conditions in an interactive form and receive
                    an AQI prediction with clear context. {companyName} reads multiple signals —
                    temperature, humidity, wind, pressure, and more — rather than relying on a single
                    measurement.
                  </p>

                  <div className="mt-6">
                    <SingleVisual isDark={isDark} />
                  </div>
                </div>
              </Reveal>

              {/* CSV batch */}
              <Reveal delay={90}>
                <div className="h-full rounded-2xl border border-[var(--bc-border)] bg-[var(--bc-surface)] p-6 shadow-[var(--bc-shadow)] transition-transform duration-300 hover:-translate-y-1 sm:p-8">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--bc-accent)_14%,transparent)] text-[var(--bc-accent-strong)]">
                      <FileSpreadsheet size={18} aria-hidden="true" />
                    </span>
                    <h3 className="text-lg font-semibold text-[var(--bc-ink)]">CSV batch processing</h3>
                  </div>

                  <p className="mt-4 text-sm leading-relaxed text-[var(--bc-ink-soft)]">
                    Upload a CSV of environmental records. {companyName} validates the structure,
                    analyzes each row, and returns your file enriched with results — ready to download.
                  </p>

                  <div className="mt-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-[var(--bc-ink-faint)]">
                      Your returned CSV adds
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {["prediction", "status", "message"].map((col) => (
                        <span
                          key={col}
                          className="rounded-full border border-[var(--bc-border-strong)] bg-[color-mix(in_srgb,var(--bc-accent)_10%,transparent)] px-3 py-1 font-mono text-xs text-[var(--bc-accent-strong)]"
                        >
                          {col}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="mt-6">
                    <BatchVisual isDark={isDark} />
                  </div>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* ========================= HOW IT WORKS ========================= */}
        <HowItWorks />

        {/* ========================= MODEL METRICS ========================= */}
        <ModelMetrics />

        {/* ====================== ACCOUNT & AUTH ====================== */}
        <section id="account" className="py-20 sm:py-24">
          <div className={CONTAINER}>
            <Reveal>
              <SectionHeader
                eyebrow="Your space"
                title="Predictions that stay with you"
                sub="Your history belongs to your account, and signing in is flexible."
              />
            </Reveal>

            <div className="mt-12 grid gap-6 lg:grid-cols-2">
              {/* History / privacy */}
              <Reveal>
                <div className="h-full rounded-2xl border border-[var(--bc-border)] bg-[var(--bc-surface)] p-6 shadow-[var(--bc-shadow)] sm:p-8">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--bc-accent)_14%,transparent)] text-[var(--bc-accent-strong)]">
                      <History size={18} aria-hidden="true" />
                    </span>
                    <h3 className="text-lg font-semibold text-[var(--bc-ink)]">Private prediction history</h3>
                  </div>

                  <p className="mt-4 text-sm leading-relaxed text-[var(--bc-ink-soft)]">
                    Your prediction history stays associated with your account. Revisit past analyses,
                    track how conditions change, and keep everything organized in one place.
                  </p>

                  <div className="mt-6">
                    <HistoryVisual isDark={isDark} />
                  </div>
                </div>
              </Reveal>

              {/* Auth methods */}
              <Reveal delay={90}>
                <div className="h-full rounded-2xl border border-[var(--bc-border)] bg-[var(--bc-surface)] p-6 shadow-[var(--bc-shadow)] sm:p-8">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--bc-accent)_14%,transparent)] text-[var(--bc-accent-strong)]">
                      <Lock size={18} aria-hidden="true" />
                    </span>
                    <h3 className="text-lg font-semibold text-[var(--bc-ink)]">Sign in the way you prefer</h3>
                  </div>

                  <p className="mt-4 text-sm leading-relaxed text-[var(--bc-ink-soft)]">
                    Secure account access with familiar options.
                  </p>

                  <ul className="mt-6 space-y-4">
                    {AUTH_METHODS.map((method) => (
                      <li key={method.title} className="flex items-start gap-3">
                        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--bc-accent)_12%,transparent)] text-[var(--bc-accent-strong)]">
                          <method.icon size={16} aria-hidden="true" />
                        </span>
                        <div>
                          <p className="text-sm font-semibold text-[var(--bc-ink)]">{method.title}</p>
                          <p className="mt-0.5 text-xs leading-relaxed text-[var(--bc-ink-soft)]">{method.desc}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* ========================= FINAL CTA ========================= */}
        <section className="relative overflow-hidden border-t border-[var(--bc-border)]">
          <AtmosphereBackdrop isDark={isDark} idPrefix="cta" />

          <div className={`${CONTAINER} relative z-10 py-24 text-center sm:py-28`}>
            <Reveal>
              <h2 className="mx-auto max-w-2xl font-[var(--bc-font-display)] text-3xl font-semibold text-[var(--bc-ink)] sm:text-4xl">
                Ready to understand your air?
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-[var(--bc-ink-soft)]">
                Create an account to start predicting, upload datasets, and keep your history in one
                place.
              </p>

              <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
                <Link to="/signup" className={BTN_PRIMARY}>
                  Get Started
                  <ArrowRight size={16} aria-hidden="true" />
                </Link>
                <Link to="/login" className={BTN_GHOST}>
                  Sign in
                </Link>
              </div>
            </Reveal>
          </div>
        </section>
      </main>

      {/* ============================ FOOTER ============================ */}
      <footer className="border-t border-[var(--bc-border)] bg-[var(--bc-bg)]">
        <div className={`${CONTAINER} flex flex-col items-center justify-between gap-3 py-8 sm:flex-row`}>
          <div className="flex items-center gap-2 text-sm font-semibold text-[var(--bc-ink)]">
            <Wind size={15} className="text-[var(--bc-accent-strong)]" aria-hidden="true" />
            {companyName}
          </div>
          <p className="text-xs text-[var(--bc-ink-faint)]">Environmental intelligence · AQI prediction</p>
          <p className="text-xs text-[var(--bc-ink-faint)]">
            © {new Date().getFullYear()} {companyName}
          </p>
        </div>
      </footer>
    </div>
  );
};

export default IntroPage;