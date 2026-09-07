import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
    Wind,
    Thermometer,
    Droplets,
    Gauge,
    Activity,
    FileSpreadsheet,
    Clock,
    ChevronRight,
    AlertCircle,
    RotateCcw,
    Lock,
    ScrollText,
    Upload,
    Sparkles,
    CloudSun,
} from "lucide-react";
// TODO: adjust to your project's actual paths -----------------------------
import { useAppDispatch, useAppSelector } from "../app/redux";
import { fetchProfile } from "../app/features/profile/profileSlice";
import { metrics as fetchMetrics } from "../api/predictionApi";
import type { ProfileUser } from "../hooks/types/profile.type";
import Navbar from "../components/Navbar";
import { companyName } from "../core/config";
import { useSEO } from "../utils/useSeo";
import { useGoogleFont } from "../utils/useGoogleFont";
import Animated from "../components/Animated";
// ---------------------------------------------------------------------------

interface MetricsResponse {
    mae: number;
    mse: number;
    rmse: number;
    r2: number;
}

/* ============================================================================
 * Helpers
 * ==========================================================================*/
function getGreeting(): string {
    const h = new Date().getHours();
    if (h >= 5 && h < 12) return "Good morning";
    if (h >= 12 && h < 18) return "Good afternoon";
    return "Good evening";
}

function getAqiMeta(v: number): { label: string; color: string; desc: string } {
    if (v <= 50) return { label: "Pristine & Clean", color: "#10B981", desc: "Crisp, high-clarity air." };
    if (v <= 100) return { label: "Moderate Haze", color: "#FBBF24", desc: "Light atmospheric haze." };
    if (v <= 150) return { label: "Elevated Smog", color: "#F97316", desc: "Noticeable particulate load." };
    return { label: "Heavy Pollution", color: "#EF4444", desc: "Dense pollutant concentration." };
}

function formatDate(iso: string): string {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function formatRelative(iso: string): string {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    const diff = Date.now() - d.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function formatInt(n: number): string {
    return Number.isFinite(n) ? n.toLocaleString() : "—";
}

function fmt(n: number): string {
    if (!Number.isFinite(n)) return "—";
    const r = Math.round(n * 10) / 10;
    return Number.isInteger(r) ? String(r) : r.toFixed(1);
}

/* ============================================================================
 * Atmospheric Background
 * ==========================================================================*/
const Atmosphere: React.FC<{ isDark: boolean; particleCount: number; mistColor: string; mistOpacity: number }> = ({
    isDark,
    particleCount,
    mistColor,
    mistOpacity,
}) => {
    const accent = isDark ? "#4FD8C4" : "#10B981";

    const particles = useMemo(
        () =>
            Array.from({ length: 20 }, (_, i) => ({
                id: i,
                cx: 6 + ((i * 41) % 88),
                cy: 10 + ((i * 53) % 78),
                r: 1.2 + (i % 3) * 0.5,
                dur: 18 + (i % 5) * 4,
                delay: -(i * 2.4),
            })),
        []
    );

    const stars = useMemo(
        () =>
            Array.from({ length: 16 }, (_, i) => ({
                id: i,
                cx: (i * 43) % 100,
                cy: (i * 29) % 52,
                r: 0.5 + (i % 3) * 0.3,
                dur: 4 + (i % 4),
                delay: -(i * 1.4),
            })),
        []
    );

    return (
        <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none" aria-hidden="true">
            <svg className="h-full w-full" viewBox="0 0 480 480" preserveAspectRatio="xMidYMid slice" focusable="false">
                <defs>
                    <linearGradient id="home-sky" x1="0" y1="0" x2="0" y2="1">
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
                    <radialGradient id="home-sun" cx="80%" cy="10%" r="45%">
                        <stop offset="0%" stopColor={isDark ? "#123B39" : "#FEF3C7"} stopOpacity={isDark ? 0.5 : 0.8} />
                        <stop offset="100%" stopColor={isDark ? "#123B39" : "#FEF3C7"} stopOpacity="0" />
                    </radialGradient>
                </defs>

                <rect x="0" y="0" width="480" height="480" fill="url(#home-sky)" />
                <rect x="0" y="0" width="480" height="480" fill="url(#home-sun)" />

                {/* Activity/AQI Mist */}
                <rect
                    x="0"
                    y="0"
                    width="480"
                    height="480"
                    style={{ fill: mistColor, opacity: mistOpacity, transition: "fill 1.5s ease, opacity 1.5s ease" }}
                />

                {isDark &&
                    stars.map((s) => (
                        <circle
                            key={s.id}
                            className="home-star"
                            cx={(s.cx / 100) * 480}
                            cy={(s.cy / 100) * 480}
                            r={s.r}
                            fill="#EAF4F2"
                            style={{ animationDuration: `${s.dur}s`, animationDelay: `${s.delay}s` }}
                        />
                    ))}

                <g fill="none" strokeLinecap="round" strokeWidth="2" style={{ stroke: accent, strokeOpacity: isDark ? 0.2 : 0.22 }}>
                    <path className="home-wind" style={{ animationDuration: "9s" }} d="M -20 240 C 90 222, 150 258, 260 238 S 470 220, 520 236" />
                    <path className="home-wind" style={{ animationDuration: "11s", animationDelay: "-3s" }} d="M -30 280 C 80 296, 170 266, 250 284 S 440 298, 520 278" />
                </g>

                <g className="home-cloud-a" opacity={isDark ? 0.45 : 0.85}>
                    <ellipse cx="110" cy="140" rx="110" ry="24" fill={isDark ? "#12222A" : "#FFFFFF"} />
                    <ellipse cx="188" cy="127" rx="72" ry="18" fill={isDark ? "#12222A" : "#FFFFFF"} />
                </g>
                <g className="home-cloud-b" opacity={isDark ? 0.35 : 0.65}>
                    <ellipse cx="340" cy="210" rx="130" ry="28" fill={isDark ? "#0E1B21" : "#FFFFFF"} />
                    <ellipse cx="412" cy="195" rx="66" ry="17" fill={isDark ? "#0E1B21" : "#FFFFFF"} />
                </g>

                {particles.slice(0, particleCount).map((p) => (
                    <circle
                        key={p.id}
                        className="home-particle"
                        cx={(p.cx / 100) * 480}
                        cy={(p.cy / 100) * 480}
                        r={p.r}
                        fill={accent}
                        fillOpacity="0.4"
                        style={{ animationDuration: `${p.dur}s`, animationDelay: `${p.delay}s` }}
                    />
                ))}

                <path d="M0 380 C 120 362, 360 400, 480 372 L480 480 L0 480 Z" fill={accent} opacity="0.12" />
                <path d="M0 400 C 120 382, 360 418, 480 392 L480 480 L0 480 Z" fill={isDark ? "#081215" : "#A7F3D0"} opacity={isDark ? 0.85 : 0.55} />
            </svg>
        </div>
    );
};

/* ============================================================================
 * Local UI Components
 * ==========================================================================*/
const Card: React.FC<{
    title?: string;
    icon?: React.ReactNode;
    action?: React.ReactNode;
    children: React.ReactNode;
    className?: string;
}> = ({ title, icon, action, children, className = "" }) => (
    <div className={`rounded-2xl border border-(--bc-border) bg-(--bc-surface) backdrop-blur-md shadow-[0_18px_50px_-30px_rgba(9,30,34,0.15)] p-5 sm:p-6 ${className}`}>
        {(title || action) && (
            <div className="flex items-center justify-between mb-4">
                {title && (
                    <h2 className="home-display text-base font-semibold flex items-center gap-2 text-(--bc-ink)">
                        {icon && <span className="text-(--bc-accent-strong)">{icon}</span>}
                        {title}
                    </h2>
                )}
                {action}
            </div>
        )}
        {children}
    </div>
);

const StatCard: React.FC<{ icon: React.ReactNode; label: string; value: string; loading?: boolean }> = ({ icon, label, value, loading }) => (
    <div className="rounded-2xl border border-(--bc-border) bg-(--bc-surface) backdrop-blur-md p-4 sm:p-5">
        <div className="flex items-center gap-2 text-(--bc-ink-faint) mb-2">
            {icon}
            <p className="text-[10px] font-bold uppercase tracking-[0.08em]">{label}</p>
        </div>
        {loading ? (
            <div className="h-7 w-16 animate-pulse rounded-md bg-(--bc-track)" />
        ) : (
            <p className="home-display text-2xl font-semibold text-(--bc-ink)">{value}</p>
        )}
    </div>
);

const EnvChip: React.FC<{ icon: React.ReactNode; label: string; value: string }> = ({ icon, label, value }) => (
    <div className="flex items-center gap-2 rounded-lg bg-(--bc-surface-2) border border-(--bc-border) px-3 py-2">
        <span className="text-(--bc-ink-faint)">{icon}</span>
        <div className="min-w-0">
            <p className="text-[9px] font-bold uppercase tracking-wider text-(--bc-ink-faint)">{label}</p>
            <p className="text-xs font-semibold text-(--bc-ink) truncate">{value}</p>
        </div>
    </div>
);

const AqiBadge: React.FC<{ value: number }> = ({ value }) => {
    const meta = getAqiMeta(value);
    return (
        <span
            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold shrink-0"
            style={{ background: `color-mix(in srgb, ${meta.color} 14%, transparent)`, color: meta.color }}
        >
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: meta.color }} aria-hidden="true" />
            {Math.round(value)}
        </span>
    );
};

const NavLink: React.FC<{ to: string; children: React.ReactNode }> = ({ to, children }) => (
    <Link
        to={to}
        className="font-semibold text-(--bc-accent-strong) hover:underline underline-offset-2 decoration-(--bc-accent)/40 transition-colors hover:text-(--bc-accent) focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-(--bc-accent)"
    >
        {children}
    </Link>
);

const SkeletonLine: React.FC<{ className?: string }> = ({ className = "" }) => (
    <div className={`animate-pulse rounded-lg bg-(--bc-track) ${className}`} aria-hidden="true" />
);

/* ============================================================================
 * Page
 * ==========================================================================*/
const Home: React.FC = () => {
    const dispatch = useAppDispatch();
    const mode = useAppSelector((state) => state.theme.mode);
    const isDark = mode === "dark";

    const profileState = useAppSelector((state) => state.profile);
    const profile = profileState?.profile ?? null;
    const profileLoading = profileState?.loading ?? false;

    const [metricsData, setMetricsData] = useState<MetricsResponse | null>(null);
    const [metricsLoading, setMetricsLoading] = useState(true);
    const [metricsError, setMetricsError] = useState<string | null>(null);

    useSEO(
        `Dashboard | ${companyName}`,
        `Your personal ${companyName} environmental workspace — track AQI predictions, manage datasets, and review model performance.`
    );
    useGoogleFont("Fraunces");
    useGoogleFont("Plus Jakarta Sans");

    useEffect(() => {
        if (!profile && !profileLoading) {
            dispatch(fetchProfile());
        }
    }, [dispatch, profile, profileLoading]);

    useEffect(() => {
        let mounted = true;
        setMetricsLoading(true);
        fetchMetrics()
            .then((res) => {
                if (mounted) setMetricsData(res);
            })
            .catch((err) => {
                if (mounted) setMetricsError(err?.message || "Failed to load metrics");
            })
            .finally(() => {
                if (mounted) setMetricsLoading(false);
            });
        return () => {
            mounted = false;
        };
    }, []);

    const user: ProfileUser | null = profile?.user ?? null;
    const historyTotal = profile?.history?.total ?? 0;
    const filesTotal = profile?.files?.total ?? 0;
    const historyItems = profile?.history?.items ?? [];
    const fileItems = profile?.files?.items ?? [];

    const hasHistory = historyTotal > 0 && historyItems.length > 0;
    const latestPrediction = hasHistory ? historyItems[0] : null;
    const recentPredictions = historyItems.slice(0, 5);
    const recentFiles = fileItems.slice(0, 3);

    const userName = user?.fullname?.split(" ")[0] || user?.username || "there";

    // Activity personalization: base 8 particles + 1 per 5 predictions (max +10)
    const baseParticles = 8;
    const activityBoost = Math.min(10, Math.floor(historyTotal / 5));
    const particleCount = baseParticles + activityBoost;

    // AQI tint
    const aqiMeta = latestPrediction ? getAqiMeta(latestPrediction.prediction) : null;
    const mistColor = aqiMeta?.color ?? (isDark ? "#4FD8C4" : "#10B981");
    const mistOpacity = aqiMeta ? 0.08 : 0;

    const latestActivityDate = useMemo(() => {
        const dates = [historyItems[0]?.created_at, fileItems[0]?.created_at]
            .filter((v): v is string => typeof v === "string")
            .map((v) => new Date(v).getTime())
            .filter((t) => Number.isFinite(t));
        if (dates.length === 0) return null;
        return new Date(Math.max(...dates)).toISOString();
    }, [historyItems, fileItems]);

    return (
        <div
            className="home-root relative min-h-screen bg-(--bc-bg) text-(--bc-ink) transition-colors duration-500"
            data-theme={isDark ? "dark" : "day"}
        >
            <style>{`
                .home-root {
                    --bc-font-display: 'Fraunces', 'Georgia', serif;
                    --bc-font-body: 'Plus Jakarta Sans', 'Inter', system-ui, sans-serif;
                    font-family: var(--bc-font-body);
                }
                .home-root[data-theme='day'] {
                    --bc-bg: #F8FAFC;
                    --bc-surface: rgba(255, 255, 255, 0.85);
                    --bc-surface-solid: #FFFFFF;
                    --bc-surface-2: #F0FDF4;
                    --bc-ink: #0F2827;
                    --bc-ink-soft: #4A6665;
                    --bc-ink-faint: #8DA3A2;
                    --bc-accent: #10B981;
                    --bc-accent-strong: #059669;
                    --bc-border: rgba(16, 185, 129, 0.18);
                    --bc-border-strong: rgba(16, 185, 129, 0.38);
                    --bc-danger: #DC2626;
                    --bc-track: rgba(16, 185, 129, 0.12);
                }
                .home-root[data-theme='dark'] {
                    --bc-bg: #0A1418;
                    --bc-surface: rgba(16, 28, 33, 0.85);
                    --bc-surface-solid: #101C21;
                    --bc-surface-2: #0C1A1E;
                    --bc-ink: #E7F1F0;
                    --bc-ink-soft: #93ACB0;
                    --bc-ink-faint: #5E767B;
                    --bc-accent: #4FD8C4;
                    --bc-accent-strong: #7EE9DA;
                    --bc-border: rgba(231, 241, 240, 0.12);
                    --bc-border-strong: rgba(231, 241, 240, 0.26);
                    --bc-danger: #FF6B57;
                    --bc-track: rgba(231, 241, 240, 0.1);
                }
                .home-display { font-family: var(--bc-font-display); }

                @keyframes home-float { 0%, 100% { transform: translate3d(0,0,0); opacity: 0.4; } 50% { transform: translate3d(0,-11px,0); opacity: 0.8; } }
                @keyframes home-wind-flow { from { stroke-dashoffset: 240; } to { stroke-dashoffset: 0; } }
                @keyframes home-twinkle { 0%, 100% { opacity: 0.12; } 50% { opacity: 0.7; } }
                @keyframes home-drift { from { transform: translate3d(-5%, 0, 0); } to { transform: translate3d(5%, 0, 0); } }
                @keyframes home-drift-slow { from { transform: translate3d(-3.5%, 0, 0); } to { transform: translate3d(4%, 0, 0); } }

                .home-particle { animation: home-float ease-in-out infinite; transform-box: fill-box; transform-origin: center; }
                .home-wind { stroke-dasharray: 8 14; animation: home-wind-flow linear infinite; }
                .home-star { animation: home-twinkle ease-in-out infinite; transform-box: fill-box; transform-origin: center; }
                .home-cloud-a { animation: home-drift 60s ease-in-out infinite alternate; }
                .home-cloud-b { animation: home-drift-slow 78s ease-in-out infinite alternate; }

                @media (prefers-reduced-motion: reduce) {
                    .home-particle, .home-wind, .home-star, .home-cloud-a, .home-cloud-b { animation: none !important; }
                }
            `}</style>

            <Atmosphere isDark={isDark} particleCount={particleCount} mistColor={mistColor} mistOpacity={mistOpacity} />

            <div className="relative z-10 flex min-h-screen flex-col">
                <header className="sticky top-0 z-40 border-b border-(--bc-border) bg-[color-mix(in_srgb,var(--bc-bg)_72%,transparent)] backdrop-blur-md">
                    <Navbar />
                </header>

                <main className="flex-1 w-full max-w-310 mx-auto px-5 sm:px-8 py-8 sm:py-12">

                    {/* ================= HERO ================= */}
                    <section className="mb-10">
                        {profileLoading && !profile ? (
                            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                                <div className="md:col-span-5 space-y-3">
                                    <SkeletonLine className="h-4 w-32" />
                                    <SkeletonLine className="h-8 w-64" />
                                    <SkeletonLine className="h-4 w-48" />
                                    <SkeletonLine className="h-10 w-40 mt-4" />
                                </div>
                                <div className="md:col-span-7">
                                    <SkeletonLine className="h-64 w-full rounded-2xl" />
                                </div>
                            </div>
                        ) : hasHistory && latestPrediction ? (
                            /* Returning User */
                            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                                <div className="md:col-span-5">
                                    <Animated y={-20}>
                                        <p className="text-sm font-semibold text-(--bc-accent-strong) uppercase tracking-wider mb-2">
                                            {getGreeting()}, {userName}
                                        </p>
                                    </Animated>
                                    <Animated>
                                        <h1 className="home-display text-3xl sm:text-4xl font-semibold mb-3 leading-tight">
                                            Your atmosphere at a glance.
                                        </h1>
                                    </Animated>
                                    <Animated delay={0.2}>
                                        <p className="text-(--bc-ink-soft) mb-6 max-w-md">
                                            Here is the latest environmental synthesis from your workspace.
                                        </p>
                                    </Animated>
                                    <Animated>
                                        <Link
                                            to="/predict"
                                            className="inline-flex items-center gap-2 rounded-lg bg-(--bc-accent-strong) px-5 py-2.5 text-sm font-semibold text-[#F4FBF9] shadow-[0_10px_30px_-12px_color-mix(in_srgb,var(--bc-accent-strong)_60%,transparent)] transition-transform hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-(--bc-accent)"
                                        >
                                            <Sparkles size={15} />
                                            Analyze Air Quality
                                        </Link>
                                    </Animated>
                                </div>
                                <Animated y={0} x={50} delay={0.2} className="md:col-span-7">
                                    <div className="rounded-2xl border border-(--bc-border) bg-(--bc-surface) backdrop-blur-md p-6 shadow-lg">
                                        <div className="flex items-start justify-between mb-4">
                                            <div>
                                                <p className="text-xs font-bold uppercase tracking-wider text-(--bc-ink-faint)">Latest Prediction</p>
                                                <p className="text-sm text-(--bc-ink-soft) mt-1">{formatDate(latestPrediction.created_at)}</p>
                                            </div>
                                            <span
                                                className="px-2.5 py-1 rounded-full text-xs font-semibold"
                                                style={{ background: `color-mix(in srgb, ${aqiMeta?.color} 15%, transparent)`, color: aqiMeta?.color }}
                                            >
                                                {aqiMeta?.label}
                                            </span>
                                        </div>

                                        <div className="flex items-baseline gap-3 mb-6">
                                            <span className="home-display text-6xl font-semibold" style={{ color: aqiMeta?.color }}>
                                                {Math.round(latestPrediction.prediction)}
                                            </span>
                                            <span className="text-lg font-medium text-(--bc-ink-faint)">AQI</span>
                                        </div>

                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                            <EnvChip icon={<Thermometer size={14} />} label="Temp" value={`${fmt(latestPrediction.temperature_c)}°C`} />
                                            <EnvChip icon={<Droplets size={14} />} label="Humidity" value={`${fmt(latestPrediction.humidity_pct)}%`} />
                                            <EnvChip icon={<Wind size={14} />} label="Wind" value={`${fmt(latestPrediction.wind_speed_kmh)} km/h`} />
                                            <EnvChip icon={<Gauge size={14} />} label="Pressure" value={`${fmt(latestPrediction.pressure_hpa)} hPa`} />
                                        </div>
                                    </div>
                                </Animated>
                            </div>
                        ) : (
                            /* New User */
                            <div className="text-center max-w-2xl mx-auto py-12">
                                <span className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-(--bc-surface-2) text-(--bc-accent-strong) mb-6 border border-(--bc-border)">
                                    <CloudSun size={28} />
                                </span>
                                <h1 className="home-display text-3xl sm:text-4xl font-semibold mb-3 leading-tight">
                                    Your environmental workspace is ready.
                                </h1>
                                <p className="text-(--bc-ink-soft) mb-8 max-w-lg mx-auto">
                                    Start by analyzing current air quality conditions, or upload a dataset to process environmental records at scale.
                                </p>
                                <Link
                                    to="/predict"
                                    className="inline-flex items-center gap-2 rounded-lg bg-(--bc-accent-strong) px-6 py-3 text-base font-semibold text-[#F4FBF9] shadow-[0_10px_30px_-12px_color-mix(in_srgb,var(--bc-accent-strong)_60%,transparent)] transition-transform hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-(--bc-accent)"
                                >
                                    <Sparkles size={16} />
                                    Analyze Air Quality
                                </Link>
                            </div>
                        )}
                    </section>

                    {/* ================= SUMMARY ANALYTICS ================= */}
                    <section className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
                        <Animated delay={0.2}>
                            <StatCard icon={<Activity size={14} />} label="Total Predictions" value={formatInt(historyTotal)} loading={profileLoading && !profile} />
                        </Animated>
                        <Animated delay={0.4}>
                            <StatCard icon={<FileSpreadsheet size={14} />} label="Uploaded Datasets" value={formatInt(filesTotal)} loading={profileLoading && !profile} />
                        </Animated>
                        <Animated delay={0.6}>
                            <StatCard icon={<Clock size={14} />} label="Latest Activity" value={latestActivityDate ? formatRelative(latestActivityDate) : "—"} loading={profileLoading && !profile} />
                        </Animated>
                    </section>

                    {/* ================= MAIN GRID ================= */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-12">

                        {/* LEFT COLUMN: ACTIVITY */}
                        <div className="lg:col-span-7 space-y-6">
                            {/* Recent Predictions */}
                            <Animated delay={0.2} scale={0.9}>
                                <Card
                                    title="Recent Predictions"
                                    icon={<Gauge size={16} />}
                                    action={
                                        historyTotal > 0 && (
                                            <Link to="/history" className="text-xs font-semibold text-(--bc-accent-strong) hover:underline flex items-center gap-1">
                                                View full history <ChevronRight size={12} />
                                            </Link>
                                        )
                                    }
                                >
                                    {profileLoading && !profile ? (
                                        <div className="space-y-3">
                                            <SkeletonLine className="h-12" />
                                            <SkeletonLine className="h-12" />
                                            <SkeletonLine className="h-12" />
                                        </div>
                                    ) : recentPredictions.length === 0 ? (
                                        <div className="text-center py-8">
                                            <p className="text-sm text-(--bc-ink-soft) mb-3">No environmental predictions yet.</p>
                                            <Link to="/predict" className="text-sm font-semibold text-(--bc-accent-strong) hover:underline">
                                                Run your first analysis →
                                            </Link>
                                        </div>
                                    ) : (
                                        <ul className="divide-y divide-(--bc-border) -mx-5 sm:-mx-6">
                                            {recentPredictions.map((p, idx) => (
                                                <Animated delay={idx * 0.15}>
                                                    <li key={p.id} className="px-5 sm:px-6 py-3.5 flex items-center justify-between gap-4 hover:bg-(--bc-surface-2) transition-colors">
                                                        <div className="flex items-center gap-3 min-w-0">
                                                            <AqiBadge value={p.prediction} />
                                                            <div className="min-w-0">
                                                                <p className="text-sm font-medium truncate">{formatDate(p.created_at)}</p>
                                                                <p className="text-xs text-(--bc-ink-faint)">
                                                                    {fmt(p.temperature_c)}°C · {fmt(p.wind_speed_kmh)} km/h
                                                                </p>
                                                                <p></p>
                                                            </div>
                                                        </div>
                                                        <ChevronRight size={16} className="text-(--bc-ink-faint) shrink-0" />
                                                    </li>
                                                </Animated>
                                            ))}
                                        </ul>
                                    )}
                                </Card>
                            </Animated>

                            {/* Recent Files */}
                            <Card
                                title="Recent Datasets"
                                icon={<Upload size={16} />}
                                action={
                                    filesTotal > 0 && (
                                        <Link to="/history" className="text-xs font-semibold text-(--bc-accent-strong) hover:underline flex items-center gap-1">
                                            View file history <ChevronRight size={12} />
                                        </Link>
                                    )
                                }
                            >
                                {profileLoading && !profile ? (
                                    <div className="space-y-3">
                                        <SkeletonLine className="h-12" />
                                        <SkeletonLine className="h-12" />
                                    </div>
                                ) : recentFiles.length === 0 ? (
                                    <div className="text-center py-8">
                                        <p className="text-sm text-(--bc-ink-soft) mb-3">No datasets processed yet.</p>
                                        <Link to="/fileupload" className="text-sm font-semibold text-(--bc-accent-strong) hover:underline">
                                            Upload a CSV →
                                        </Link>
                                    </div>
                                ) : (
                                    <ul className="divide-y divide-(--bc-border) -mx-5 sm:-mx-6">
                                        {recentFiles.map((f) => (
                                            <li key={f.id} className="px-5 sm:px-6 py-3.5 flex items-center justify-between gap-4 hover:bg-(--bc-surface-2) transition-colors">
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-(--bc-surface-2) text-(--bc-accent-strong) border border-(--bc-border)">
                                                        <FileSpreadsheet size={16} />
                                                    </span>
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-medium truncate" title={f.original_name}>{f.original_name}</p>
                                                        <p className="text-xs text-(--bc-ink-faint)">
                                                            {formatInt(f.row_count)} rows · {formatInt(f.prediction_count)} predictions
                                                        </p>
                                                    </div>
                                                </div>
                                                <span className="text-xs text-(--bc-ink-faint) shrink-0">{formatRelative(f.created_at)}</span>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </Card>
                        </div>

                        {/* RIGHT COLUMN: METRICS & GUIDANCE */}
                        <div className="lg:col-span-5 space-y-6">
                            {/* Model Performance */}
                            <Animated delay={0.2}>
                                <Card title="Model Performance" icon={<Activity size={16} />}>
                                {metricsLoading ? (
                                    <div className="space-y-4">
                                        <SkeletonLine className="h-14" />
                                        <SkeletonLine className="h-14" />
                                        <SkeletonLine className="h-14" />
                                    </div>
                                ) : metricsError ? (
                                    <div className="flex flex-col items-center text-center py-6 gap-3">
                                        <AlertCircle size={20} className="text-(--bc-danger)" />
                                        <p className="text-sm text-(--bc-ink-soft)">Unable to load model metrics.</p>
                                        <button
                                            onClick={() => window.location.reload()}
                                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-(--bc-accent-strong) hover:underline"
                                        >
                                            <RotateCcw size={12} /> Try Again
                                        </button>
                                    </div>
                                ) : metricsData ? (
                                    <div className="space-y-4">
                                        <div className="rounded-xl bg-(--bc-surface-2) border border-(--bc-border) p-4">
                                            <div className="flex items-baseline justify-between mb-1">
                                                <span className="text-xs font-bold uppercase tracking-wider text-(--bc-ink-faint)">R² Score</span>
                                                <span className="home-display text-xl font-semibold text-(--bc-accent-strong)">
                                                    {metricsData.r2.toFixed(3)}
                                                </span>
                                            </div>
                                            <p className="text-xs text-(--bc-ink-soft)">Variance explained by the model</p>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="rounded-xl bg-(--bc-surface-2) border border-(--bc-border) p-3">
                                                <span className="text-[10px] font-bold uppercase tracking-wider text-(--bc-ink-faint)">MAE</span>
                                                <p className="home-display text-lg font-semibold mt-1">{metricsData.mae.toFixed(2)}</p>
                                                <p className="text-[10px] text-(--bc-ink-faint) mt-0.5">Mean Absolute Error</p>
                                            </div>
                                            <div className="rounded-xl bg-(--bc-surface-2) border border-(--bc-border) p-3">
                                                <span className="text-[10px] font-bold uppercase tracking-wider text-(--bc-ink-faint)">RMSE</span>
                                                <p className="home-display text-lg font-semibold mt-1">{metricsData.rmse.toFixed(2)}</p>
                                                <p className="text-[10px] text-(--bc-ink-faint) mt-0.5">Root Mean Square</p>
                                            </div>
                                        </div>
                                    </div>
                                ) : null}
                            </Card>
                            </Animated>

                            {/* Workspace Guidance */}
                            <Animated delay={0.2} x={50} y={0}>
                                <Card title="Your Workspace" icon={<Sparkles size={16} />}>
                                <div className="text-sm text-(--bc-ink-soft) space-y-3 leading-relaxed">
                                    <p>
                                        Need a prediction? Open <NavLink to="/predict">Analyze Air Quality</NavLink>.
                                    </p>
                                    <p>
                                        Working with a dataset? Use <NavLink to="/fileupload">File Upload</NavLink> to process your CSV.
                                    </p>
                                    <p>
                                        Want to revisit results? Your <NavLink to="/history">History</NavLink> keeps previous predictions and datasets together.
                                    </p>
                                    <p>
                                        Need account information? Your <NavLink to="/profile">Profile</NavLink> contains your account details.
                                    </p>
                                </div>
                            </Card>
                            </Animated>

                            {/* Legal */}
                            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-(--bc-ink-faint) pt-2">
                                <Link to="/privacy-policy" className="inline-flex items-center gap-1.5 hover:text-(--bc-ink-soft) transition-colors">
                                    <Lock size={11} /> Privacy Policy
                                </Link>
                                <Link to="/terms-and-conditions" className="inline-flex items-center gap-1.5 hover:text-(--bc-ink-soft) transition-colors">
                                    <ScrollText size={11} /> Terms & Conditions
                                </Link>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
};

export default Home;