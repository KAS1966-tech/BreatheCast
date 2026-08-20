import React, { useEffect, useMemo, useState } from "react";
import { Wind } from "lucide-react";
// TODO: adjust to your project's actual paths -----------------------------
import { useAppSelector } from "../app/redux";
import { companyName } from "../core/config";
import { useGoogleFont } from "../utils/useGoogleFont";
import { AqiMark } from "../hooks/font/aqiLogo";
// ---------------------------------------------------------------------------

export interface LoadingProps {
    /** 0–100. Omit for an indeterminate loading state. */
    progress?: number;
    /* Overrides the default cycling message sequence when supplied. */
    message?: string;
}

const DEFAULT_MESSAGES = [
    "Initializing atmosphere…",
    "Calibrating environmental sensors…",
    "Mapping atmospheric conditions…",
    "Synthesizing air quality intelligence…",
    "Preparing your experience…",
];

const MESSAGE_INTERVAL_MS = 2800;
const RING_RADIUS = 54;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

function clampPercent(value: number): number {
    if (Number.isNaN(value)) return 0;
    return Math.min(100, Math.max(0, value));
}

const Loading: React.FC<LoadingProps> = ({ progress, message }) => {
    const mode = useAppSelector((state) => state.theme.mode);
    const isDark = mode === "dark";

    useGoogleFont("Fraunces");
    useGoogleFont("Plus Jakarta Sans");

    const hasProgress = typeof progress === "number" && !Number.isNaN(progress);
    const pct = hasProgress ? clampPercent(progress as number) : 0;
    const dashOffset = RING_CIRCUMFERENCE * (1 - pct / 100);

    const [messageIndex, setMessageIndex] = useState(0);

    useEffect(() => {
        if (message) return; // custom message supplied — no cycling.
        const id = window.setInterval(() => {
            setMessageIndex((i) => (i + 1) % DEFAULT_MESSAGES.length);
        }, MESSAGE_INTERVAL_MS);
        return () => window.clearInterval(id);
    }, [message]);

    const displayedMessage = message ?? DEFAULT_MESSAGES[messageIndex];

    const particles = useMemo(
        () =>
            Array.from({ length: 10 }, (_, i) => ({
                id: i,
                cx: 6 + ((i * 41) % 88),
                cy: 8 + ((i * 59) % 84),
                r: 1.3 + (i % 3) * 0.55,
                dur: 15 + (i % 5) * 3,
                delay: -(i * 2.2),
            })),
        []
    );

    const stars = useMemo(
        () =>
            Array.from({ length: 14 }, (_, i) => ({
                id: i,
                cx: (i * 47) % 100,
                cy: (i * 31) % 60,
                r: 0.5 + (i % 3) * 0.3,
                dur: 3 + (i % 4),
                delay: -(i * 1.3),
            })),
        []
    );

    const brandAccent = isDark ? "#4FD8C4" : "#1F8A7A";

    return (
        <div className="bcl-root" data-theme={isDark ? "dark" : "day"}>
            <style>{`
        .bcl-root {
          --bc-font-display: 'Fraunces', 'Georgia', serif;
          --bc-font-body: 'Plus Jakarta Sans', 'Inter', system-ui, sans-serif;
          position: relative;
          min-height: 100vh;
          width: 100%;
          font-family: var(--bc-font-body);
          overflow: hidden;
        }
        .bcl-root[data-theme='day'] {
            --bc-bg-top: #F3F9F6;
            --bc-bg-mid: #DCEEEA;
            --bc-bg-bottom: #C3E3D8;
            --bc-ink: #12262B;
            --bc-ink-soft: #4B6169;
            --bc-ink-faint: #8AA1A6;
            --bc-accent: #1F8A7A;
            --bc-accent-strong: #146357;
            --bc-ring-track: rgba(18, 38, 43, 0.1);
            --bc-glow: #FCEBC7;
            --bc-horizon: #BFE2D6;
        }
        .bcl-root[data-theme='dark'] {
            --bc-bg-top: #0C1A1F;
            --bc-bg-mid: #081216;
            --bc-bg-bottom: #050B0D;
            --bc-ink: #E7F1F0;
            --bc-ink-soft: #93ACB0;
            --bc-ink-faint: #5E767B;
            --bc-accent: #4FD8C4;
            --bc-accent-strong: #7EE9DA;
            --bc-ring-track: rgba(231, 241, 240, 0.12);
            --bc-glow: #123B39;
            --bc-horizon: #081215;
        }

        .bcl-bg { position: absolute; inset: 0; z-index: 0; }
        .bcl-bg-svg { width: 100%; height: 100%; display: block; }
        .bcl-content {
            position: relative;
            z-index: 1;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 32px 20px;
            text-align: center;
        }
        .bcl-ring-wrap {
            position: relative;
            width: 168px;
            height: 168px;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 22px;
        }
        @media (min-width: 640px) { .bcl-ring-wrap { width: 188px; height: 188px; } }
        .bcl-ring-svg { position: absolute; inset: 0; width: 100%; height: 100%; }
        .bcl-core {
            position: relative;
            z-index: 1;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 4px;
            color: var(--bc-accent-strong);
        }
        .bcl-core-icon { animation: bcl-pulse 3.2s ease-in-out infinite; }
        .bcl-core-progress {
            font-family: var(--bc-font-display);
            font-size: 22px;
            font-weight: 600;
            color: var(--bc-ink);
        }
        .bcl-brand {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 12px;
        }
        .bcl-brand-mark {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 26px;
            height: 26px;
            border-radius: 8px;
            background: color-mix(in srgb, var(--bc-accent) 16%, transparent);
            color: var(--bc-accent-strong);
        }
        .bcl-brand-name {
            font-family: var(--bc-font-display);
            font-size: 18px;
            font-weight: 600;
            color: var(--bc-ink);
            letter-spacing: 0.01em;
        }
        .bcl-message-wrap {
            min-height: 22px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .bcl-message {
            margin: 0;
            font-size: 13.5px;
            color: var(--bc-ink-soft);
            animation: bcl-fade-in 0.5s ease both;
        }
        .bcl-progress-track {
            margin-top: 16px;
            width: 168px;
            height: 3px;
            border-radius: 999px;
            background: var(--bc-ring-track);
            overflow: hidden;
        }
        @media (min-width: 640px) { .bcl-progress-track { width: 188px; } }
        .bcl-progress-fill {
            height: 100%;
            border-radius: 999px;
            background: var(--bc-accent);
            transform-origin: left center;
            transition: transform 0.6s ease;
        }

        /* ---------- Motion ---------- */
        @keyframes bcl-glow-breathe { 0%, 100% { opacity: 0.55; } 50% { opacity: 0.9; } }
        @keyframes bcl-float { 0%, 100% { transform: translate3d(0,0,0); opacity: 0.5; } 50% { transform: translate3d(0,-12px,0); opacity: 0.9; } }
        @keyframes bcl-wind-flow { from { stroke-dashoffset: 220; } to { stroke-dashoffset: 0; } }
        @keyframes bcl-twinkle { 0%, 100% { opacity: 0.15; } 50% { opacity: 0.85; } }
        @keyframes bcl-data-rotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes bcl-sweep-rotate { from { transform: rotate(-90deg); } to { transform: rotate(270deg); } }
        @keyframes bcl-pulse { 0%, 100% { transform: scale(1); opacity: 0.85; } 50% { transform: scale(1.1); opacity: 1; } }
        @keyframes bcl-fade-in { from { opacity: 0; transform: translateY(3px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes bcl-drift { from { transform: translate3d(-6%, 0, 0); } to { transform: translate3d(6%, 0, 0); } }
        @keyframes bcl-drift-slow { from { transform: translate3d(-4%, 0, 0); } to { transform: translate3d(5%, 0, 0); } }
        
        .bcl-glow { animation: bcl-glow-breathe 20s ease-in-out infinite; }
        .bcl-particle { animation-name: bcl-float; animation-timing-function: ease-in-out; animation-iteration-count: infinite; transform-box: fill-box; transform-origin: center; }
        .bcl-wind { stroke-dasharray: 7 12; animation: bcl-wind-flow linear infinite; }
        .bcl-star { animation: bcl-twinkle ease-in-out infinite; transform-box: fill-box; transform-origin: center; }
        .bcl-data-ring { transform-box: fill-box; transform-origin: center; animation: bcl-data-rotate 14s linear infinite; }
        .bcl-sweep { transform-box: fill-box; transform-origin: center; animation: bcl-sweep-rotate 1.7s linear infinite; }
        .bcl-cloud-a { animation: bcl-drift 46s ease-in-out infinite alternate; }
        .bcl-cloud-b { animation: bcl-drift-slow 62s ease-in-out infinite alternate; }
        
        @media (prefers-reduced-motion: reduce) {
            .bcl-glow, .bcl-particle, .bcl-wind, .bcl-star,
            .bcl-data-ring, .bcl-sweep, .bcl-core-icon,
            .bcl-cloud-a, .bcl-cloud-b {
            animation: none !important;
            }
            .bcl-message { animation: none !important; }
        }
        `}</style>

            <div className="bcl-bg" aria-hidden="true">
                <svg className="bcl-bg-svg" viewBox="0 0 480 480" preserveAspectRatio="xMidYMid slice" focusable="false">
                    <defs>
                        <linearGradient id="bcl-sky" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="var(--bc-bg-top)" />
                            <stop offset="55%" stopColor="var(--bc-bg-mid)" />
                            <stop offset="100%" stopColor="var(--bc-bg-bottom)" />
                        </linearGradient>
                        <radialGradient id="bcl-glow" cx="50%" cy="28%" r="55%">
                            <stop offset="0%" stopColor="var(--bc-glow)" stopOpacity="0.8" />
                            <stop offset="100%" stopColor="var(--bc-glow)" stopOpacity="0" />
                        </radialGradient>
                    </defs>
                    <rect x="0" y="0" width="480" height="480" fill="url(#bcl-sky)" />
                    <rect className="bcl-glow" x="0" y="0" width="480" height="480" fill="url(#bcl-glow)" />
                    
                    {isDark &&
                        stars.map((s) => (
                            <circle
                                key={s.id}
                                className="bcl-star"
                                cx={(s.cx / 100) * 480}
                                cy={(s.cy / 100) * 480}
                                r={s.r}
                                fill="#EAF4F2"
                                style={{ animationDuration: `${s.dur}s`, animationDelay: `${s.delay}s` }}
                            />
                        ))}

                    {/* Drifting cloud bands */}
                    <g className="bcl-cloud-a" opacity={isDark ? 0.5 : 0.9}>
                        <ellipse
                            cx="120"
                            cy="280"
                            rx="120"
                            ry="26"
                            fill={isDark ? "#12222A" : "#FFFFFF"}
                        />
                        <ellipse
                            cx="205"
                            cy="266"
                            rx="80"
                            ry="20"
                            fill={isDark ? "#12222A" : "#FFFFFF"}
                        />
                    </g>
                    <g className="bcl-cloud-b" opacity={isDark ? 0.4 : 0.75}>
                        <ellipse
                            cx="330"
                            cy="352"
                            rx="140"
                            ry="30"
                            fill={isDark ? "#0E1B21" : "#FFFFFF"}
                        />
                        <ellipse
                            cx="410"
                            cy="336"
                            rx="70"
                            ry="18"
                            fill={isDark ? "#0E1B21" : "#FFFFFF"}
                        />
                    </g>

                    <g stroke={brandAccent} strokeOpacity="0.24" strokeWidth="2" fill="none" strokeLinecap="round">
                        <path className="bcl-wind" style={{ animationDuration: "6s" }} d="M -20 300 C 90 282, 150 318, 260 296 S 470 278, 520 294" />
                        <path
                            className="bcl-wind"
                            style={{ animationDuration: "7.5s", animationDelay: "-2s" }}
                            d="M -30 336 C 80 352, 170 322, 250 340 S 440 354, 520 334"
                        />
                    </g>

                    {particles.map((p) => (
                        <circle
                            key={p.id}
                            className="bcl-particle"
                            cx={(p.cx / 100) * 480}
                            cy={(p.cy / 100) * 480}
                            r={p.r}
                            fill={brandAccent}
                            fillOpacity="0.4"
                            style={{ animationDuration: `${p.dur}s`, animationDelay: `${p.delay}s` }}
                        />
                    ))}

                    <path
                        d="M0 388 C 120 370, 360 406, 480 380 L480 480 L0 480 Z"
                        fill="var(--bc-horizon)"
                        opacity={isDark ? 0.85 : 0.6}
                    />
                </svg>
            </div>

            <div className="bcl-content">
                <div className="bcl-ring-wrap">
                    <svg className="bcl-ring-svg" viewBox="0 0 140 140" focusable="false">
                        {/* Layer 5 — faint data ring */}
                        <circle
                            className="bcl-data-ring"
                            cx="70"
                            cy="70"
                            r="66"
                            fill="none"
                            stroke={brandAccent}
                            strokeOpacity="0.16"
                            strokeWidth="1"
                            strokeDasharray="1 9"
                        />
                        {/* Track */}
                        <circle cx="70" cy="70" r={RING_RADIUS} fill="none" stroke="var(--bc-ring-track)" strokeWidth="6" />
                        {/* Layer 4 — central system: determinate progress OR indeterminate sweep */}
                        {hasProgress ? (
                            <circle
                                cx="70"
                                cy="70"
                                r={RING_RADIUS}
                                fill="none"
                                stroke={brandAccent}
                                strokeWidth="6"
                                strokeLinecap="round"
                                transform="rotate(-90 70 70)"
                                style={{
                                    strokeDasharray: RING_CIRCUMFERENCE,
                                    strokeDashoffset: dashOffset,
                                    transition: "stroke-dashoffset 0.6s ease",
                                }}
                            />
                        ) : (
                            <circle
                                className="bcl-sweep"
                                cx="70"
                                cy="70"
                                r={RING_RADIUS}
                                fill="none"
                                stroke={brandAccent}
                                strokeWidth="6"
                                strokeLinecap="round"
                                strokeDasharray={`${RING_CIRCUMFERENCE * 0.22} ${RING_CIRCUMFERENCE}`}
                            />
                        )}
                    </svg>
                    <div className="bcl-core">
                        <Wind size={hasProgress ? 20 : 26} className="bcl-core-icon" strokeWidth={2} />
                        {hasProgress && <span className="bcl-core-progress">{Math.round(pct)}%</span>}
                    </div>
                </div>

                <div className="bcl-brand">
                    <span className="bcl-brand-mark">
                        <AqiMark className="h-4.5 w-4.5 text-current"/>
                    </span>
                    <span className="bcl-brand-name">{companyName}</span>
                </div>

                <div className="bcl-message-wrap">
                    <p className="bcl-message" role="status" aria-live="polite" key={displayedMessage}>
                        {displayedMessage}
                    </p>
                </div>

                {hasProgress && (
                    <div
                        className="bcl-progress-track"
                        role="progressbar"
                        aria-valuenow={Math.round(pct)}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuetext={`${Math.round(pct)} percent loaded`}
                    >
                        <div className="bcl-progress-fill" style={{ transform: `scaleX(${pct / 100})` }} />
                    </div>
                )}
            </div>
        </div>
    );
};

export default Loading;