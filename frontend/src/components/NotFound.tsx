import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { House, ArrowLeft } from "lucide-react";

// TODO: adjust to your project's actual paths -----------------------------
import { useAppSelector } from "../app/redux";
import { useSEO } from "../utils/useSeo";
import { useGoogleFont } from "../utils/useGoogleFont";
import { companyName } from "../core/config";
import { AqiMark } from "../hooks/font/aqiLogo";
// ---------------------------------------------------------------------------

const ATMOSPHERE_MESSAGES = [
    "Scanning the atmosphere for this route…",
    "No signal detected at this coordinate…",
    "This environment may have drifted out of range…",
    "Recalibrating your path…",
];
const MESSAGE_INTERVAL_MS = 3000;

const RING_R = 44;
const RING_C = 2 * Math.PI * RING_R;
const RING_GAP_FRACTION = 0.24; // visible gap in the "0" ring — signal incomplete

const NotFound: React.FC = () => {
    const navigate = useNavigate();
    const mode = useAppSelector((state) => state.theme.mode);
    const isDark = mode === "dark";

    useSEO(
        `Page Not Found | ${companyName}`,
        `The page you're looking for doesn't exist or may have moved. Return to ${companyName} to keep tracking live air quality and weather intelligence.`
    );
    useGoogleFont("Fraunces");
    useGoogleFont("Plus Jakarta Sans");

    const [messageIndex, setMessageIndex] = useState(0);
    useEffect(() => {
        const id = window.setInterval(() => {
            setMessageIndex((i) => (i + 1) % ATMOSPHERE_MESSAGES.length);
        }, MESSAGE_INTERVAL_MS);
        return () => window.clearInterval(id);
    }, []);
    const message = ATMOSPHERE_MESSAGES[messageIndex];

    const particles = useMemo(
        () =>
            Array.from({ length: 9 }, (_, i) => ({
                id: i,
                cx: 6 + ((i * 43) % 88),
                cy: 8 + ((i * 61) % 82),
                r: 1.2 + (i % 3) * 0.5,
                dur: 16 + (i % 5) * 3,
                delay: -(i * 2),
            })),
        []
    );

    const stars = useMemo(
        () =>
            Array.from({ length: 13 }, (_, i) => ({
                id: i,
                cx: (i * 47) % 100,
                cy: (i * 33) % 58,
                r: 0.5 + (i % 3) * 0.3,
                dur: 3 + (i % 4),
                delay: -(i * 1.4),
            })),
        []
    );

    const brandAccent = isDark ? "#4FD8C4" : "#1F8A7A";
    const ringDash = `${RING_C * (1 - RING_GAP_FRACTION)} ${RING_C * RING_GAP_FRACTION}`;

    return (
        <div
            className="nf-root relative min-h-screen w-full overflow-x-hidden"
            data-theme={isDark ? "dark" : "day"}
            style={{ fontFamily: "var(--bc-font-body)" }}
        >
            <style>{`
        .nf-root {
            --bc-font-display: 'Fraunces', 'Georgia', serif;
            --bc-font-body: 'Plus Jakarta Sans', 'Inter', system-ui, sans-serif;
        }
        .nf-root[data-theme='day'] {
            --bc-bg-top: #F3F9F6;
            --bc-bg-mid: #DCEEEA;
            --bc-bg-bottom: #C3E3D8;
            --bc-ink: #12262B;
            --bc-ink-soft: #4B6169;
            --bc-ink-faint: #7C949A;
            --bc-accent: #1F8A7A;
            --bc-accent-strong: #146357;
            --bc-border: rgba(18, 38, 43, 0.14);
            --bc-border-strong: rgba(18, 38, 43, 0.26);
            --bc-warn: #E8A64C;
            --bc-glow: #FCEBC7;
            --bc-horizon: #BFE2D6;
            --bc-focus-ring: rgba(31, 138, 122, 0.35);
        }
        .nf-root[data-theme='dark'] {
            --bc-bg-top: #0C1A1F;
            --bc-bg-mid: #081216;
            --bc-bg-bottom: #050B0D;
            --bc-ink: #E7F1F0;
            --bc-ink-soft: #93ACB0;
            --bc-ink-faint: #5E767B;
            --bc-accent: #4FD8C4;
            --bc-accent-strong: #7EE9DA;
            --bc-border: rgba(231, 241, 240, 0.14);
            --bc-border-strong: rgba(231, 241, 240, 0.26);
            --bc-warn: #F0B65E;
            --bc-glow: #123B39;
            --bc-horizon: #081215;
            --bc-focus-ring: rgba(79, 216, 196, 0.4);
        }

        @keyframes nf-float { 0%, 100% { transform: translate3d(0,0,0); opacity: 0.5; } 50% { transform: translate3d(0,-12px,0); opacity: 0.9; } }
        @keyframes nf-wind-flow { from { stroke-dashoffset: 220; } to { stroke-dashoffset: 0; } }
        @keyframes nf-twinkle { 0%, 100% { opacity: 0.15; } 50% { opacity: 0.85; } }
        @keyframes nf-ring-rotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes nf-dot-pulse { 0%, 100% { opacity: 0.4; transform: scale(1); } 50% { opacity: 1; transform: scale(1.3); } }
        @keyframes nf-fade-in { from { opacity: 0; transform: translateY(3px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes nf-glow-breathe { 0%, 100% { opacity: 0.55; } 50% { opacity: 0.85; } }
        `}</style>

            {/* ---------------- Atmospheric background ---------------- */}
            <div className="absolute inset-0 z-0" aria-hidden="true">
                <svg
                    className="block h-full w-full"
                    viewBox="0 0 480 480"
                    preserveAspectRatio="xMidYMid slice"
                    focusable="false"
                >
                    <defs>
                        <linearGradient id="nf-sky" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="var(--bc-bg-top)" />
                            <stop offset="55%" stopColor="var(--bc-bg-mid)" />
                            <stop offset="100%" stopColor="var(--bc-bg-bottom)" />
                        </linearGradient>
                        <radialGradient id="nf-glow" cx="50%" cy="22%" r="55%">
                            <stop offset="0%" stopColor="var(--bc-glow)" stopOpacity="0.75" />
                            <stop offset="100%" stopColor="var(--bc-glow)" stopOpacity="0" />
                        </radialGradient>
                        <linearGradient id="nf-fade-stroke" x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%" stopColor={brandAccent} stopOpacity="0.4" />
                            <stop offset="65%" stopColor={brandAccent} stopOpacity="0.14" />
                            <stop offset="100%" stopColor={brandAccent} stopOpacity="0" />
                        </linearGradient>
                    </defs>

                    <rect x="0" y="0" width="480" height="480" fill="url(#nf-sky)" />
                    <rect
                        className="animate-[nf-glow-breathe_20s_ease-in-out_infinite] motion-reduce:animate-none"
                        x="0"
                        y="0"
                        width="480"
                        height="480"
                        fill="url(#nf-glow)"
                    />

                    {isDark &&
                        stars.map((s) => (
                            <circle
                                key={s.id}
                                className={`transform-fill origin-center animate-[nf-twinkle_ease-in-out_infinite] motion-reduce:animate-none${s.id % 2 === 1 ? " hidden sm:block" : ""
                                    }`}
                                cx={(s.cx / 100) * 480}
                                cy={(s.cy / 100) * 480}
                                r={s.r}
                                fill="#EAF4F2"
                                style={{ animationDuration: `${s.dur}s`, animationDelay: `${s.delay}s` }}
                            />
                        ))}

                    {/* Wind-flow: one steady path, one that visibly fades — "off course" */}
                    <g fill="none" strokeLinecap="round" strokeWidth="2">
                        <path
                            className="animate-[nf-wind-flow_6.5s_linear_infinite] motion-reduce:animate-none [stroke-dasharray:7_13]"
                            stroke={brandAccent}
                            strokeOpacity="0.26"
                            d="M -20 292 C 90 274, 150 310, 260 288 S 470 270, 520 286"
                        />
                        <path
                            className="hidden sm:block animate-[nf-wind-flow_8s_linear_infinite] motion-reduce:animate-none [stroke-dasharray:7_13]"
                            style={{ animationDelay: "-2.4s" }}
                            stroke="url(#nf-fade-stroke)"
                            d="M -30 330 C 90 348, 190 316, 280 336 S 420 356, 500 320"
                        />
                    </g>

                    {particles.map((p) => (
                        <circle
                            key={p.id}
                            className={`transform-fill origin-center animate-[nf-float_ease-in-out_infinite] motion-reduce:animate-none${p.id % 2 === 1 ? " hidden sm:block" : ""
                                }`}
                            cx={(p.cx / 100) * 480}
                            cy={(p.cy / 100) * 480}
                            r={p.r}
                            fill={brandAccent}
                            fillOpacity="0.4"
                            style={{ animationDuration: `${p.dur}s`, animationDelay: `${p.delay}s` }}
                        />
                    ))}

                    <path
                        d="M0 384 C 120 366, 360 402, 480 376 L480 480 L0 480 Z"
                        fill="var(--bc-horizon)"
                        opacity={isDark ? 0.85 : 0.62}
                    />
                </svg>
            </div>

            {/* ---------------- Foreground content ---------------- */}
            <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-5 py-12 text-center sm:px-8">
                <div className="mb-8 inline-flex items-center gap-2 sm:mb-10">
                    <span
                        className="inline-flex h-7 w-7 items-center justify-center rounded-lg"
                        style={{ backgroundColor: "color-mix(in srgb, var(--bc-accent) 16%, transparent)", color: "var(--bc-accent-strong)" }}
                    >
                        <AqiMark />
                    </span>
                    <span
                        className="text-[15px] font-semibold"
                        style={{ fontFamily: "var(--bc-font-display)", color: "var(--bc-ink)" }}
                    >
                        {companyName}
                    </span>
                </div>

                <p
                    className="mb-4 text-[11px] font-semibold uppercase tracking-[0.14em]"
                    style={{ color: "var(--bc-accent-strong)" }}
                >
                    Environmental Intelligence
                </p>

                <div className="mb-6 flex select-none items-center justify-center" aria-hidden="true">
                    <span
                        className="text-[72px] font-semibold leading-none sm:text-[104px]"
                        style={{ fontFamily: "var(--bc-font-display)", color: "var(--bc-ink)" }}
                    >
                        4
                    </span>
                    <span className="relative mx-1 inline-flex h-13.5 w-13.5 items-center justify-center sm:mx-2 sm:h-19.5 sm:w-19.5">
                        <svg viewBox="0 0 100 100" className="h-full w-full" focusable="false">
                            <circle cx="50" cy="50" r={RING_R} fill="none" stroke="var(--bc-border-strong)" strokeWidth="7" opacity="0.6" />
                            <g
                                className="transform-fill origin-center animate-[nf-ring-rotate_16s_linear_infinite] motion-reduce:animate-none"
                            >
                                <circle
                                    cx="50"
                                    cy="50"
                                    r={RING_R}
                                    fill="none"
                                    stroke="var(--bc-accent)"
                                    strokeWidth="7"
                                    strokeLinecap="round"
                                    strokeDasharray={ringDash}
                                    opacity="0.9"
                                />
                                <circle
                                    className="transform-fill origin-center animate-[nf-dot-pulse_2.4s_ease-in-out_infinite] motion-reduce:animate-none"
                                    cx="50"
                                    cy="6"
                                    r="4.5"
                                    fill="var(--bc-warn)"
                                />
                            </g>
                        </svg>
                    </span>
                    <span
                        className="text-[72px] font-semibold leading-none sm:text-[104px]"
                        style={{ fontFamily: "var(--bc-font-display)", color: "var(--bc-ink)" }}
                    >
                        4
                    </span>
                </div>
                <span className="sr-only">404 — Page not found</span>

                <h1
                    className="mb-3 max-w-md text-xl font-semibold leading-snug sm:text-2xl"
                    style={{ fontFamily: "var(--bc-font-display)", color: "var(--bc-ink)" }}
                >
                    The atmosphere you&apos;re looking for couldn&apos;t be found.
                </h1>
                <p className="mb-7 max-w-sm text-sm leading-relaxed sm:text-[15px]" style={{ color: "var(--bc-ink-soft)" }}>
                    This route may have moved, changed, or never existed. Let&apos;s get you back to clearer conditions.
                </p>

                <div className="mb-8 flex min-h-5 items-center justify-center">
                    <p
                        key={message}
                        role="status"
                        aria-live="polite"
                        className="animate-[nf-fade-in_0.5s_ease_both] motion-reduce:animate-none text-[13px]"
                        style={{ color: "var(--bc-ink-faint)" }}
                    >
                        {message}
                    </p>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                    <button
                        type="button"
                        onClick={() => navigate("/home")}
                        className="inline-flex items-center justify-center gap-2 rounded-[10px] px-5 py-3 text-sm font-semibold text-[#F4FBF9] transition-transform duration-150 hover:-translate-y-0.5 active:translate-y-0 focus-visible:outline-none focus-visible:[box-shadow:0_0_0_4px_var(--bc-focus-ring)]"
                        style={{
                            backgroundColor: "var(--bc-accent-strong)",
                            boxShadow: "0 10px 30px -12px var(--bc-accent-strong)",
                        }}
                    >
                        <House size={16} />
                        Back to Home
                    </button>
                    <button
                        type="button"
                        onClick={() => navigate(-1)}
                        className="inline-flex items-center justify-center gap-2 rounded-[10px] border border-(--bc-border) text-(--bc-ink-soft) px-5 py-3 text-sm font-semibold transition-colors duration-150 hover:border-(--bc-border-strong) hover:text-(--bc-ink) focus-visible:outline-none focus-visible:[box-shadow:0_0_0_4px_var(--bc-focus-ring)]"
                    >
                        <ArrowLeft size={16} />
                        Go Back
                    </button>


                </div>
            </div>
        </div>
    );
};

export default NotFound;