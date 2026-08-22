import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import {
    Sun,
    Wind,
    CloudSun,
    Gauge,
    FileSpreadsheet,
    History as HistoryIcon,
    Download,
    Trash2,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    ChevronRight as ArrowRightSmall,
    AlertCircle,
    RotateCcw,
    Lock,
    Loader2,
    Thermometer,
    Droplets,
    Navigation,
    CloudRain,
    Factory,
    Activity,
    CalendarDays,
    Calendar,
    Sparkles,
} from "lucide-react";
import { useAppDispatch, useAppSelector } from "../app/redux";
import {
    fetchPredictionHistory,
    downloadPredictionHistory,
    clearPredictionHistory,
    fetchFileHistory,
    downloadUploadedFileHistory,
    deleteFileHistory,
} from "../app/features/history/historySlice";
import type { PredictionHistory, UploadedFile } from "../hooks/types/history.type";
import Navbar from "../components/Navbar";
import { companyName } from "../core/config";
import { useSEO } from "../utils/useSeo";
import { useGoogleFont } from "../utils/useGoogleFont";
// ---------------------------------------------------------------------------

/* ============================================================================
 * Local typings for the history slice state (shape provided by the backend).
 * ==========================================================================*/
interface HistorySliceState {
    predictionHistory: PredictionHistory[];
    predictionTotal: number;
    predictionSkip: number;
    predictionLimit: number;
    predictionLoading: boolean;
    predictionError: string | null;
    isDownloadingPredictionHistory: boolean;
    predictionDownloadError: string | null;
    isClearingPredictionHistory: boolean;
    predictionClearError: string | null;

    fileHistory: UploadedFile[];
    fileTotal: number;
    fileSkip: number;
    fileLimit: number;
    fileLoading: boolean;
    fileError: string | null;
    isDownloadingFileHistory: boolean;
    fileDownloadError: string | null;
    deletingFileId: number | null;
    fileDeleteError: string | null;
}

/* ============================================================================
 * AQI classification — same language as the rest of BreatheCast.
 * ==========================================================================*/
type AtmosphereKey =
    | "default"
    | "extreme-clean"
    | "clean"
    | "moderate"
    | "elevated"
    | "heavy"
    | "extreme-heavy";

interface AtmosphereInfo {
    key: AtmosphereKey;
    label: string;
    shortLabel: string;
    color: string | null;
}

function getAqiCategory(prediction: number): AtmosphereInfo {
    const p = Number.isFinite(prediction) ? prediction : 0;
    if (p < 8)
        return { key: "extreme-clean", label: "Ultra-Clean Air", shortLabel: "Ultra-clean", color: "#10B981" };
    if (p <= 50) return { key: "clean", label: "Pristine & Clean", shortLabel: "Pristine", color: "#10B981" };
    if (p <= 100) return { key: "moderate", label: "Moderate Haze", shortLabel: "Moderate", color: "#FBBF24" };
    if (p <= 150) return { key: "elevated", label: "Elevated Smog", shortLabel: "Elevated", color: "#F97316" };
    if (p <= 205) return { key: "heavy", label: "Heavy Pollution", shortLabel: "Heavy", color: "#EF4444" };
    return { key: "extreme-heavy", label: "Extreme Pollution", shortLabel: "Extreme", color: "#EF4444" };
}

const DEFAULT_ATMOSPHERE: AtmosphereInfo = {
    key: "default",
    label: "Standing By",
    shortLabel: "Ready",
    color: null,
};

interface AtmosphereVisual {
    particleCount: number;
    particleDuration: [number, number];
    mistColor: string;
    mistOpacity: number;
    windColor: string;
    windOpacity: number;
    windDuration: number;
    horizonOpacity: number;
    turbulent: boolean;
}

function getAtmosphereVisual(key: AtmosphereKey, isDark: boolean): AtmosphereVisual {
    const brandAccent = isDark ? "#4FD8C4" : "#10B981";
    switch (key) {
        case "clean":
        case "extreme-clean":
            return { particleCount: 9, particleDuration: [17, 27], mistColor: "#10B981", mistOpacity: 0.06, windColor: "#10B981", windOpacity: 0.26, windDuration: 6.4, horizonOpacity: 0.72, turbulent: false };
        case "moderate":
            return { particleCount: 12, particleDuration: [12, 19], mistColor: "#E7E2D6", mistOpacity: 0.28, windColor: "#B8A98C", windOpacity: 0.34, windDuration: 5, horizonOpacity: 0.58, turbulent: false };
        case "elevated":
            return { particleCount: 15, particleDuration: [7, 12], mistColor: "#F97316", mistOpacity: 0.3, windColor: "#F97316", windOpacity: 0.4, windDuration: 3, horizonOpacity: 0.48, turbulent: true };
        case "heavy":
        case "extreme-heavy":
            return { particleCount: 18, particleDuration: [4.5, 8], mistColor: "#3B1210", mistOpacity: 0.45, windColor: "#EF4444", windOpacity: 0.48, windDuration: 2.1, horizonOpacity: 0.4, turbulent: true };
        default:
            return { particleCount: 9, particleDuration: [16, 25], mistColor: brandAccent, mistOpacity: 0, windColor: brandAccent, windOpacity: 0.28, windDuration: 6, horizonOpacity: 0.72, turbulent: false };
    }
}

/* ============================================================================
 * Formatting helpers
 * ==========================================================================*/
function formatBytes(bytes: number): string {
    if (!Number.isFinite(bytes) || bytes < 0) return "—";
    if (bytes < 1024) return `${bytes} B`;
    const units = ["KB", "MB", "GB"];
    let v = bytes / 1024;
    let u = 0;
    while (v >= 1024 && u < units.length - 1) {
        v /= 1024;
        u++;
    }
    return `${v >= 100 ? Math.round(v) : v.toFixed(1)} ${units[u]}`;
}

function formatDate(iso: string): string {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    const datePart = d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
    const timePart = d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
    return `${datePart} · ${timePart}`;
}

function fmt(n: number): string {
    if (!Number.isFinite(n)) return "—";
    const r = Math.round(n * 10) / 10;
    return Number.isInteger(r) ? String(r) : r.toFixed(1);
}

function asMessage(v: unknown): string | null {
    return typeof v === "string" && v.trim().length > 0 ? v : null;
}

const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/* ============================================================================
 * Atmospheric background — fixed to the viewport, never scrolls.
 * ==========================================================================*/
const Atmosphere: React.FC<{ isDark: boolean; atmosphere: AtmosphereInfo }> = ({ isDark, atmosphere }) => {
    const v = getAtmosphereVisual(atmosphere.key, isDark);
    const gaugeColor = atmosphere.color ?? (isDark ? "#4FD8C4" : "#10B981");

    const particles = useMemo(
        () =>
            Array.from({ length: 18 }, (_, i) => ({
                id: i,
                cx: 6 + ((i * 37) % 88),
                cy: 10 + ((i * 53) % 80),
                r: 1.3 + (i % 3) * 0.55,
                delay: -(i * 1.7),
            })),
        []
    );
    const stars = useMemo(
        () =>
            Array.from({ length: 20 }, (_, i) => ({
                id: i,
                cx: (i * 41) % 100,
                cy: (i * 29) % 55,
                r: 0.5 + (i % 3) * 0.3,
                dur: 3 + (i % 4),
                delay: -(i * 1.2),
            })),
        []
    );

    return (
        <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none" aria-hidden="true">
            <svg className="h-full w-full" viewBox="0 0 480 480" preserveAspectRatio="xMidYMid slice" focusable="false">
                <defs>
                    <linearGradient id="hist-sky" x1="0" y1="0" x2="0" y2="1">
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
                    <radialGradient id="hist-sun" cx="82%" cy="12%" r="45%">
                        <stop offset="0%" stopColor={isDark ? "#123B39" : "#FEF3C7"} stopOpacity={isDark ? 0.55 : 0.85} />
                        <stop offset="100%" stopColor={isDark ? "#123B39" : "#FEF3C7"} stopOpacity="0" />
                    </radialGradient>
                </defs>

                <rect x="0" y="0" width="480" height="480" fill="url(#hist-sky)" />
                <rect x="0" y="0" width="480" height="480" fill="url(#hist-sun)" />

                {/* AQI-driven mist */}
                <rect
                    x="0"
                    y="0"
                    width="480"
                    height="480"
                    style={{ fill: v.mistColor, opacity: v.mistOpacity, transition: "fill 1.1s ease, opacity 1.1s ease" }}
                />

                {isDark &&
                    stars.map((s) => (
                        <circle
                            key={s.id}
                            className="hist-star"
                            cx={(s.cx / 100) * 480}
                            cy={(s.cy / 100) * 480}
                            r={s.r}
                            fill="#EAF4F2"
                            style={{ animationDuration: `${s.dur}s`, animationDelay: `${s.delay}s` }}
                        />
                    ))}

                {/* Monitoring ring */}
                <g style={{ opacity: isDark ? 0.2 : 0.16 }}>
                    <circle className="hist-ring" cx="392" cy="72" r="58" fill="none" stroke={gaugeColor} strokeOpacity="0.5" strokeWidth="1" strokeDasharray="2 9" style={{ transition: "stroke 1s ease" }} />
                    <circle className="hist-ring-rev" cx="392" cy="72" r="40" fill="none" stroke={gaugeColor} strokeOpacity="0.35" strokeWidth="1" strokeDasharray="1 7" style={{ transition: "stroke 1s ease" }} />
                </g>

                {/* Wind flow */}
                <g fill="none" strokeLinecap="round" strokeWidth="2" style={{ stroke: v.windColor, strokeOpacity: v.windOpacity, transition: "stroke 1s ease, stroke-opacity 1s ease" }}>
                    <path className="hist-wind" style={{ animationDuration: `${v.windDuration}s` }} d="M -20 236 C 90 218, 150 254, 260 234 S 470 216, 520 232" />
                    <path className="hist-wind" style={{ animationDuration: `${v.windDuration}s`, animationDelay: "-1.4s" }} d="M -30 274 C 80 290, 170 260, 250 278 S 440 292, 520 272" />
                    {v.turbulent && (
                        <path className="hist-wind" style={{ animationDuration: `${v.windDuration * 0.8}s`, animationDelay: "-0.6s" }} d="M -10 306 C 70 328, 140 288, 220 314 S 400 332, 520 302" />
                    )}
                </g>

                {/* Clouds */}
                <g className="hist-cloud-a" opacity={isDark ? 0.5 : 0.9}>
                    <ellipse cx="110" cy="150" rx="110" ry="24" fill={isDark ? "#12222A" : "#FFFFFF"} />
                    <ellipse cx="188" cy="137" rx="72" ry="18" fill={isDark ? "#12222A" : "#FFFFFF"} />
                </g>
                <g className="hist-cloud-b" opacity={isDark ? 0.4 : 0.7}>
                    <ellipse cx="340" cy="205" rx="130" ry="28" fill={isDark ? "#0E1B21" : "#FFFFFF"} />
                    <ellipse cx="412" cy="190" rx="66" ry="17" fill={isDark ? "#0E1B21" : "#FFFFFF"} />
                </g>

                {/* Particles */}
                {particles.slice(0, v.particleCount).map((p) => {
                    const [minDur, maxDur] = v.particleDuration;
                    const dur = minDur + (((p.id * 13) % 100) / 100) * (maxDur - minDur);
                    return (
                        <circle
                            key={p.id}
                            className="hist-particle"
                            cx={(p.cx / 100) * 480}
                            cy={(p.cy / 100) * 480}
                            r={p.r}
                            style={{ fill: gaugeColor, fillOpacity: 0.55, animationDuration: `${dur}s`, animationDelay: `${p.delay}s`, transition: "fill 1s ease" }}
                        />
                    );
                })}

                {/* Horizon */}
                <path d="M0 372 C 120 352, 360 392, 480 364 L480 480 L0 480 Z" style={{ fill: gaugeColor, opacity: v.horizonOpacity * 0.22, transition: "opacity 1.1s ease, fill 1s ease" }} />
                <path d="M0 392 C 120 374, 360 410, 480 384 L480 480 L0 480 Z" fill={isDark ? "#081215" : "#A7F3D0"} opacity={isDark ? 0.85 : 0.6} />
            </svg>
        </div>
    );
};

/* ============================================================================
 * Small local presentational components
 * ==========================================================================*/
const AqiBadge: React.FC<{ value: number; size?: "sm" | "lg" }> = ({ value, size = "sm" }) => {
    const cat = getAqiCategory(value);
    const color = cat.color ?? "#10B981";
    return (
        <span
            className={`inline-flex items-center gap-1.5 rounded-full font-semibold ${size === "lg" ? "px-3 py-1 text-sm" : "px-2.5 py-0.5 text-xs"}`}
            style={{ background: `color-mix(in srgb, ${color} 14%, transparent)`, color }}
        >
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} aria-hidden="true" />
            {Math.round(value)}
            <span className="font-medium opacity-80">{cat.shortLabel}</span>
        </span>
    );
};

const DetailItem: React.FC<{ icon: React.ReactNode; label: string; value: string }> = ({ icon, label, value }) => (
    <div className="flex items-start gap-2.5 rounded-xl border border-[color:var(--bc-border)] bg-[color:var(--bc-surface-2)] px-3 py-2.5">
        <span className="mt-0.5 text-[color:var(--bc-ink-faint)]" aria-hidden="true">
            {icon}
        </span>
        <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[color:var(--bc-ink-faint)]">{label}</p>
            <p className="truncate text-[13px] font-semibold text-[color:var(--bc-ink)]">{value}</p>
        </div>
    </div>
);

const PredictionDetails: React.FC<{ record: PredictionHistory }> = ({ record }) => (
    <div className="hist-rise grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-4">
        <DetailItem icon={<Gauge size={14} />} label="AQI Prediction" value={`${Math.round(record.prediction)} · ${getAqiCategory(record.prediction).shortLabel}`} />
        <DetailItem icon={<Thermometer size={14} />} label="Temperature" value={`${fmt(record.temperature_c)} °C`} />
        <DetailItem icon={<Droplets size={14} />} label="Humidity" value={`${fmt(record.humidity_pct)} %`} />
        <DetailItem icon={<Wind size={14} />} label="Wind Speed" value={`${fmt(record.wind_speed_kmh)} km/h`} />
        <DetailItem icon={<Navigation size={14} />} label="Wind Direction" value={`${fmt(record.wind_direction_deg)} °`} />
        <DetailItem icon={<Activity size={14} />} label="Pressure" value={`${fmt(record.pressure_hpa)} hPa`} />
        <DetailItem icon={<Sun size={14} />} label="Solar Radiation" value={`${fmt(record.solar_radiation_wm2)} W/m²`} />
        <DetailItem icon={<CloudRain size={14} />} label="Rainfall" value={`${fmt(record.rainfall_mm)} mm`} />
        <DetailItem icon={<Activity size={14} />} label="Traffic Density" value={fmt(record.traffic_density_index)} />
        <DetailItem icon={<Factory size={14} />} label="Industrial Distance" value={`${fmt(record.proximity_industrial_zone_km)} km`} />
        <DetailItem icon={<CalendarDays size={14} />} label="Day of Week" value={DAY_NAMES[record.day_of_week] ?? String(record.day_of_week)} />
        <DetailItem icon={<Calendar size={14} />} label="Month" value={MONTH_NAMES[record.month - 1] ?? String(record.month)} />
        <DetailItem icon={<Sparkles size={14} />} label="Day Type" value={record.is_weekend === 1 ? "Weekend" : "Weekday"} />
        <DetailItem icon={<HistoryIcon size={14} />} label="Recorded" value={formatDate(record.created_at)} />
    </div>
);

interface PaginationProps {
    skip: number;
    limit: number;
    total: number;
    busy: boolean;
    onPage: (nextSkip: number) => void;
}

const Pagination: React.FC<PaginationProps> = ({ skip, limit, total, busy, onPage }) => {
    const pages = Math.max(1, Math.ceil(total / limit));
    const page = Math.floor(skip / limit) + 1;
    const canPrev = skip > 0;
    const canNext = skip + limit < total;
    const from = total === 0 ? 0 : skip + 1;
    const to = Math.min(skip + limit, total);

    return (
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-5">
            <p className="text-xs text-[color:var(--bc-ink-faint)]">
                Showing <span className="font-semibold text-[color:var(--bc-ink-soft)]">{from}–{to}</span> of{" "}
                <span className="font-semibold text-[color:var(--bc-ink-soft)]">{total}</span>
                <span className="mx-2 opacity-50" aria-hidden="true">·</span>
                Page {page} of {pages}
            </p>
            <div className="flex items-center gap-2">
                <button
                    type="button"
                    disabled={!canPrev || busy}
                    onClick={() => onPage(Math.max(0, skip - limit))}
                    className="inline-flex items-center gap-1 rounded-lg border border-[color:var(--bc-border)] bg-[color:var(--bc-surface)] px-3 py-1.5 text-xs font-semibold text-[color:var(--bc-ink-soft)] transition-colors hover:border-[color:var(--bc-border-strong)] hover:text-[color:var(--bc-ink)] disabled:cursor-not-allowed disabled:opacity-45 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--bc-accent)]"
                >
                    <ChevronLeft size={14} />
                    Previous
                </button>
                <button
                    type="button"
                    disabled={!canNext || busy}
                    onClick={() => onPage(skip + limit)}
                    className="inline-flex items-center gap-1 rounded-lg border border-[color:var(--bc-border)] bg-[color:var(--bc-surface)] px-3 py-1.5 text-xs font-semibold text-[color:var(--bc-ink-soft)] transition-colors hover:border-[color:var(--bc-border-strong)] hover:text-[color:var(--bc-ink)] disabled:cursor-not-allowed disabled:opacity-45 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--bc-accent)]"
                >
                    Next
                    <ChevronRight size={14} />
                </button>
            </div>
        </div>
    );
};

interface ConfirmModalProps {
    open: boolean;
    title: string;
    confirmLabel: string;
    loading: boolean;
    onConfirm: () => void;
    onClose: () => void;
    children: React.ReactNode;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({ open, title, confirmLabel, loading, onConfirm, onClose, children }) => {
    const cancelRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        if (!open) return;
        cancelRef.current?.focus();
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape" && !loading) onClose();
        };
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, [open, loading, onClose]);

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-5">
            <div className="absolute inset-0 bg-black/45 backdrop-blur-sm" onClick={() => !loading && onClose()} aria-hidden="true" />
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="hist-confirm-title"
                className="hist-rise relative w-full max-w-md rounded-2xl border border-[color:var(--bc-border-strong)] bg-[color:var(--bc-surface)] p-6 shadow-2xl backdrop-blur-xl"
            >
                <div className="mb-3 flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[color:var(--bc-danger-bg)] text-[color:var(--bc-danger)]">
                        <AlertCircle size={18} />
                    </span>
                    <h3 id="hist-confirm-title" className="hist-display text-lg font-semibold text-[color:var(--bc-ink)]">
                        {title}
                    </h3>
                </div>
                <div className="text-sm leading-relaxed text-[color:var(--bc-ink-soft)]">{children}</div>
                <div className="mt-6 flex justify-end gap-2">
                    <button
                        ref={cancelRef}
                        type="button"
                        disabled={loading}
                        onClick={onClose}
                        className="rounded-lg border border-[color:var(--bc-border)] bg-transparent px-4 py-2 text-sm font-semibold text-[color:var(--bc-ink-soft)] transition-colors hover:border-[color:var(--bc-border-strong)] hover:text-[color:var(--bc-ink)] disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--bc-accent)]"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        disabled={loading}
                        onClick={onConfirm}
                        aria-busy={loading}
                        className="inline-flex items-center gap-2 rounded-lg bg-[color:var(--bc-danger)] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--bc-danger)]"
                    >
                        {loading && <Loader2 size={15} className="animate-spin" />}
                        {loading ? "Working…" : confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
};

const SkeletonBlock: React.FC<{ rows?: number }> = ({ rows = 4 }) => (
    <div className="animate-pulse space-y-3 p-5" aria-hidden="true">
        {Array.from({ length: rows }, (_, i) => (
            <div key={i} className="h-12 rounded-xl bg-[color:var(--bc-track)]" />
        ))}
    </div>
);

/* ============================================================================
 * Page
 * ==========================================================================*/
const History: React.FC = () => {
    const dispatch = useAppDispatch();
    const mode = useAppSelector((state) => state.theme.mode);
    const isDark = mode === "dark";
    const history = useAppSelector((state) => state.history) as HistorySliceState;

    useSEO(
        `History — ${companyName}`,
        `Review your private AQI prediction history and uploaded environmental datasets in ${companyName}. All records are associated with your account.`
    );
    useGoogleFont("Fraunces");
    useGoogleFont("Plus Jakarta Sans");

    /* ---- UI-only state ---- */
    const [activePredictionId, setActivePredictionId] = useState<number | null>(null);
    const [selectedRecord, setSelectedRecord] = useState<PredictionHistory | null>(null);
    const [clearOpen, setClearOpen] = useState(false);
    const [pendingDelete, setPendingDelete] = useState<UploadedFile | null>(null);

    const {
        predictionHistory, predictionTotal, predictionSkip, predictionLimit, predictionLoading, predictionError,
        isDownloadingPredictionHistory, isClearingPredictionHistory,
        fileHistory, fileTotal, fileSkip, fileLimit, fileLoading, fileError,
        isDownloadingFileHistory, deletingFileId,
    } = history;

    const predLimit = predictionLimit || 10;
    const fileLimitSafe = fileLimit || 10;

    /* ---- initial fetch (mount only) ---- */
    useEffect(() => {
        dispatch(fetchPredictionHistory({ skip: 0, limit: 10 }));
        dispatch(fetchFileHistory({ skip: 0, limit: 10 }));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    /* ---- atmosphere source: selected record → first record → default ---- */
    const atmosphereSource = selectedRecord ?? predictionHistory[0] ?? null;
    const atmosphere = atmosphereSource ? getAqiCategory(atmosphereSource.prediction) : DEFAULT_ATMOSPHERE;

    /* ---- summary (real data only) ---- */
    const latestActivity = useMemo(() => {
        const candidates = [predictionHistory[0]?.created_at, fileHistory[0]?.created_at]
            .filter((v): v is string => typeof v === "string")
            .map((v) => ({ v, t: new Date(v).getTime() }))
            .filter((x) => Number.isFinite(x.t))
            .sort((a, b) => b.t - a.t);
        return candidates.length ? candidates[0].v : null;
    }, [predictionHistory, fileHistory]);

    /* ---- handlers ---- */
    const togglePrediction = (record: PredictionHistory) => {
        setActivePredictionId((prev) => (prev === record.id ? null : record.id));
        setSelectedRecord(record); // drives the atmosphere, no extra request
    };

    const onExportPredictions = async () => {
        const res = await dispatch(downloadPredictionHistory());
        if (downloadPredictionHistory.fulfilled.match(res)) toast.success("Prediction history exported.");
        else toast.error(asMessage(res.payload) ?? "Unable to export prediction history.");
    };

    const onExportFiles = async () => {
        const res = await dispatch(downloadUploadedFileHistory());
        if (downloadUploadedFileHistory.fulfilled.match(res)) toast.success("File history exported.");
        else toast.error(asMessage(res.payload) ?? "Unable to export file history.");
    };

    const onClearConfirm = async () => {
        const res = await dispatch(clearPredictionHistory());
        if (clearPredictionHistory.fulfilled.match(res)) {
            const payload = res.payload as { deleted_count?: number } | number | undefined;
            const count = typeof payload === "number" ? payload : payload?.deleted_count;
            toast.success(
                typeof count === "number"
                    ? `${count} prediction record${count === 1 ? "" : "s"} cleared.`
                    : "Prediction history cleared."
            );
            setSelectedRecord(null);
            setActivePredictionId(null);
            setClearOpen(false);
        } else {
            toast.error(asMessage(res.payload) ?? "Unable to clear prediction history.");
        }
    };

    const onDeleteConfirm = async () => {
        const target = pendingDelete;
        if (!target) return;
        const res = await dispatch(deleteFileHistory(target.id));
        if (deleteFileHistory.fulfilled.match(res)) {
            toast.success(`${target.original_name} removed from your history.`);
            setPendingDelete(null);
        } else {
            toast.error(asMessage(res.payload) ?? "Unable to remove this file.");
        }
    };

    const requestDelete = (file: UploadedFile) => {
        if (deletingFileId !== null) return; // a deletion is already in flight
        setPendingDelete(file);
    };

    /* ================================================================== */
    return (
        <div className="hist-root relative min-h-screen bg-[color:var(--bc-bg)] text-[color:var(--bc-ink)] transition-colors duration-500" data-theme={isDark ? "dark" : "day"}>
            <style>{`
                .hist-root {
                    --bc-font-display: 'Fraunces', 'Georgia', serif;
                    --bc-font-body: 'Plus Jakarta Sans', 'Inter', system-ui, sans-serif;
                    font-family: var(--bc-font-body);
                }
                .hist-root[data-theme='day'] {
                    --bc-bg: #F8FAFC;
                    --bc-surface: rgba(255, 255, 255, 0.88);
                    --bc-surface-2: #F0FDF4;
                    --bc-ink: #0F2827;
                    --bc-ink-soft: #4A6665;
                    --bc-ink-faint: #8DA3A2;
                    --bc-accent: #10B981;
                    --bc-accent-strong: #059669;
                    --bc-border: rgba(16, 185, 129, 0.18);
                    --bc-border-strong: rgba(16, 185, 129, 0.38);
                    --bc-danger: #DC2626;
                    --bc-danger-bg: rgba(220, 38, 38, 0.08);
                    --bc-track: rgba(16, 185, 129, 0.12);
                }
                .hist-root[data-theme='dark'] {
                    --bc-bg: #0A1418;
                    --bc-surface: rgba(16, 28, 33, 0.88);
                    --bc-surface-2: #0C1A1E;
                    --bc-ink: #E7F1F0;
                    --bc-ink-soft: #93ACB0;
                    --bc-ink-faint: #5E767B;
                    --bc-accent: #4FD8C4;
                    --bc-accent-strong: #7EE9DA;
                    --bc-border: rgba(231, 241, 240, 0.12);
                    --bc-border-strong: rgba(231, 241, 240, 0.26);
                    --bc-danger: #FF6B57;
                    --bc-danger-bg: rgba(255, 107, 87, 0.1);
                    --bc-track: rgba(231, 241, 240, 0.1);
                }
                .hist-display { font-family: var(--bc-font-display); }

                @keyframes hist-float { 0%, 100% { transform: translate3d(0,0,0); opacity: 0.5; } 50% { transform: translate3d(0,-13px,0); opacity: 0.95; } }
                @keyframes hist-wind-flow { from { stroke-dashoffset: 240; } to { stroke-dashoffset: 0; } }
                @keyframes hist-twinkle { 0%, 100% { opacity: 0.15; } 50% { opacity: 0.9; } }
                @keyframes hist-ring-rot { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                @keyframes hist-ring-rot-rev { from { transform: rotate(360deg); } to { transform: rotate(0deg); } }
                @keyframes hist-drift { from { transform: translate3d(-6%, 0, 0); } to { transform: translate3d(6%, 0, 0); } }
                @keyframes hist-drift-slow { from { transform: translate3d(-4%, 0, 0); } to { transform: translate3d(5%, 0, 0); } }
                @keyframes hist-rise { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }

                .hist-particle { animation: hist-float ease-in-out infinite; transform-box: fill-box; transform-origin: center; }
                .hist-wind { stroke-dasharray: 8 14; animation: hist-wind-flow linear infinite; }
                .hist-star { animation: hist-twinkle ease-in-out infinite; transform-box: fill-box; transform-origin: center; }
                .hist-ring { transform-box: fill-box; transform-origin: center; animation: hist-ring-rot 26s linear infinite; }
                .hist-ring-rev { transform-box: fill-box; transform-origin: center; animation: hist-ring-rot-rev 34s linear infinite; }
                .hist-cloud-a { animation: hist-drift 52s ease-in-out infinite alternate; }
                .hist-cloud-b { animation: hist-drift-slow 70s ease-in-out infinite alternate; }
                .hist-rise { animation: hist-rise 0.4s cubic-bezier(0.16, 1, 0.3, 1) both; }

                @media (prefers-reduced-motion: reduce) {
                    .hist-particle, .hist-wind, .hist-star, .hist-ring, .hist-ring-rev,
                    .hist-cloud-a, .hist-cloud-b, .hist-rise { animation: none !important; }
                }
            `}</style>

            <Atmosphere isDark={isDark} atmosphere={atmosphere} />

            <div className="relative z-10 flex min-h-screen flex-col">
                <Navbar />

                <main className="mx-auto w-full max-w-[1240px] flex-1 px-5 pb-24 sm:px-8">
                    {/* ================= HERO ================= */}
                    <section className="pb-6 pt-8 sm:pt-10">
                        <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-[color:var(--bc-accent-strong)]">
                            Private Activity
                        </p>
                        <div className="flex flex-wrap items-end justify-between gap-4">
                            <div>
                                <h1 className="hist-display text-3xl font-semibold leading-tight sm:text-4xl">
                                    Your Environmental History
                                </h1>
                                <p className="mt-2 max-w-[58ch] text-sm leading-relaxed text-[color:var(--bc-ink-soft)] sm:text-[15px]">
                                    Every prediction and processed dataset associated with your account — ready to review,
                                    export, or manage.
                                </p>
                            </div>
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-[color:var(--bc-border)] bg-[color:var(--bc-surface)] px-3 py-1.5 text-xs font-semibold text-[color:var(--bc-ink-soft)] backdrop-blur-md">
                                <Lock size={12} className="text-[color:var(--bc-accent-strong)]" />
                                Visible only to you
                            </span>
                        </div>
                    </section>

                    {/* ================= SUMMARY ================= */}
                    <section aria-label="Activity summary" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                        <div className="rounded-2xl border border-[color:var(--bc-border)] bg-[color:var(--bc-surface)] p-4 backdrop-blur-md">
                            <div className="flex items-center gap-2 text-[color:var(--bc-ink-faint)]">
                                <Gauge size={14} />
                                <p className="text-[10px] font-bold uppercase tracking-[0.08em]">Total Predictions</p>
                            </div>
                            <p className="hist-display mt-2 text-2xl font-semibold">{predictionLoading && predictionTotal === 0 ? "—" : predictionTotal.toLocaleString()}</p>
                        </div>
                        <div className="rounded-2xl border border-[color:var(--bc-border)] bg-[color:var(--bc-surface)] p-4 backdrop-blur-md">
                            <div className="flex items-center gap-2 text-[color:var(--bc-ink-faint)]">
                                <FileSpreadsheet size={14} />
                                <p className="text-[10px] font-bold uppercase tracking-[0.08em]">Uploaded Datasets</p>
                            </div>
                            <p className="hist-display mt-2 text-2xl font-semibold">{fileLoading && fileTotal === 0 ? "—" : fileTotal.toLocaleString()}</p>
                        </div>
                        <div className="rounded-2xl border border-[color:var(--bc-border)] bg-[color:var(--bc-surface)] p-4 backdrop-blur-md">
                            <div className="flex items-center gap-2 text-[color:var(--bc-ink-faint)]">
                                <CloudSun size={14} />
                                <p className="text-[10px] font-bold uppercase tracking-[0.08em]">Latest AQI</p>
                            </div>
                            <div className="mt-2">
                                {predictionHistory[0] ? (
                                    <AqiBadge value={predictionHistory[0].prediction} />
                                ) : (
                                    <p className="hist-display text-2xl font-semibold text-[color:var(--bc-ink-faint)]">—</p>
                                )}
                            </div>
                        </div>
                        <div className="rounded-2xl border border-[color:var(--bc-border)] bg-[color:var(--bc-surface)] p-4 backdrop-blur-md">
                            <div className="flex items-center gap-2 text-[color:var(--bc-ink-faint)]">
                                <HistoryIcon size={14} />
                                <p className="text-[10px] font-bold uppercase tracking-[0.08em]">Latest Activity</p>
                            </div>
                            <p className="mt-2 truncate text-sm font-semibold" title={latestActivity ?? undefined}>
                                {latestActivity ? formatDate(latestActivity) : "—"}
                            </p>
                        </div>
                    </section>

                    {/* ================= PREDICTION HISTORY ================= */}
                    <section aria-labelledby="hist-pred-title" className="mt-12">
                        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                            <div className="flex items-center gap-2.5">
                                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[color:var(--bc-surface)] text-[color:var(--bc-accent-strong)] border border-[color:var(--bc-border)] backdrop-blur-md">
                                    <Gauge size={16} />
                                </span>
                                <div>
                                    <h2 id="hist-pred-title" className="hist-display text-lg font-semibold leading-none">
                                        Prediction History
                                    </h2>
                                    <p className="mt-1 text-xs text-[color:var(--bc-ink-faint)]">
                                        Individual environmental analyses · select a record to revisit its atmosphere
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => void onExportPredictions()}
                                    disabled={isDownloadingPredictionHistory || predictionTotal === 0}
                                    aria-busy={isDownloadingPredictionHistory}
                                    className="inline-flex items-center gap-1.5 rounded-lg border border-[color:var(--bc-border)] bg-[color:var(--bc-surface)] px-3 py-2 text-xs font-semibold text-[color:var(--bc-ink-soft)] backdrop-blur-md transition-colors hover:border-[color:var(--bc-border-strong)] hover:text-[color:var(--bc-ink)] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--bc-accent)]"
                                >
                                    {isDownloadingPredictionHistory ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                                    Export Prediction History
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setClearOpen(true)}
                                    disabled={isClearingPredictionHistory || predictionTotal === 0}
                                    className="inline-flex items-center gap-1.5 rounded-lg border border-[color:var(--bc-border)] bg-[color:var(--bc-surface)] px-3 py-2 text-xs font-semibold text-[color:var(--bc-danger)] backdrop-blur-md transition-colors hover:border-[color:var(--bc-danger)] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--bc-danger)]"
                                >
                                    <Trash2 size={14} />
                                    Clear
                                </button>
                            </div>
                        </div>

                        <div className="overflow-hidden rounded-2xl border border-[color:var(--bc-border)] bg-[color:var(--bc-surface)] shadow-[0_18px_50px_-30px_rgba(9,30,34,0.35)] backdrop-blur-md">
                            {predictionError ? (
                                <div className="flex flex-col items-center gap-3 p-10 text-center">
                                    <AlertCircle size={22} className="text-[color:var(--bc-danger)]" />
                                    <p className="text-sm text-[color:var(--bc-ink-soft)]">{predictionError}</p>
                                    <button
                                        type="button"
                                        onClick={() => dispatch(fetchPredictionHistory({ skip: predictionSkip, limit: predLimit }))}
                                        className="inline-flex items-center gap-1.5 rounded-lg border border-[color:var(--bc-border)] px-3 py-2 text-xs font-semibold text-[color:var(--bc-ink-soft)] transition-colors hover:text-[color:var(--bc-ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--bc-accent)]"
                                    >
                                        <RotateCcw size={13} />
                                        Try Again
                                    </button>
                                </div>
                            ) : predictionLoading ? (
                                <SkeletonBlock rows={5} />
                            ) : predictionHistory.length === 0 ? (
                                <div className="flex flex-col items-center gap-3 p-12 text-center">
                                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[color:var(--bc-surface-2)] text-[color:var(--bc-accent-strong)]">
                                        <CloudSun size={22} />
                                    </span>
                                    <h3 className="hist-display text-lg font-semibold">No predictions yet</h3>
                                    <p className="max-w-[36ch] text-sm text-[color:var(--bc-ink-soft)]">
                                        Your environmental predictions will appear here after your first analysis.
                                    </p>
                                    <Link
                                        to="/predict"
                                        className="mt-1 inline-flex items-center gap-1.5 rounded-lg bg-[color:var(--bc-accent-strong)] px-4 py-2 text-sm font-semibold text-[#F4FBF9] transition-transform hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--bc-accent)]"
                                    >
                                        Make a Prediction
                                        <ArrowRightSmall size={15} />
                                    </Link>
                                </div>
                            ) : (
                                <>
                                    {/* ---------- Desktop table ---------- */}
                                    <div className="hidden md:block">
                                        <table className="w-full text-left text-[13px]">
                                            <thead>
                                                <tr className="border-b border-[color:var(--bc-border)] text-[10px] uppercase tracking-[0.08em] text-[color:var(--bc-ink-faint)]">
                                                    <th scope="col" className="px-5 py-3 font-bold">AQI</th>
                                                    <th scope="col" className="px-4 py-3 font-bold">Conditions</th>
                                                    <th scope="col" className="px-4 py-3 font-bold">Wind</th>
                                                    <th scope="col" className="px-4 py-3 font-bold">Recorded</th>
                                                    <th scope="col" className="px-4 py-3 text-right font-bold">Details</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {predictionHistory.map((rec) => {
                                                    const active = activePredictionId === rec.id;
                                                    const selected = selectedRecord?.id === rec.id;
                                                    return (
                                                        <React.Fragment key={rec.id}>
                                                            <tr
                                                                onClick={() => togglePrediction(rec)}
                                                                className={`cursor-pointer border-b border-[color:var(--bc-border)] transition-colors hover:bg-[color:var(--bc-surface-2)] ${active ? "bg-[color:var(--bc-surface-2)] shadow-[inset_2px_0_0_0_var(--bc-accent)]" : ""}`}
                                                            >
                                                                <td className="px-5 py-3.5">
                                                                    <AqiBadge value={rec.prediction} />
                                                                </td>
                                                                <td className="px-4 py-3.5 text-[color:var(--bc-ink-soft)]">
                                                                    {fmt(rec.temperature_c)} °C · {fmt(rec.humidity_pct)} %
                                                                </td>
                                                                <td className="px-4 py-3.5 text-[color:var(--bc-ink-soft)]">
                                                                    {fmt(rec.wind_speed_kmh)} km/h · {fmt(rec.wind_direction_deg)}°
                                                                </td>
                                                                <td className="px-4 py-3.5 text-[color:var(--bc-ink-soft)]">{formatDate(rec.created_at)}</td>
                                                                <td className="px-4 py-3.5 text-right">
                                                                    <button
                                                                        type="button"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            togglePrediction(rec);
                                                                        }}
                                                                        aria-expanded={active}
                                                                        aria-label={active ? "Collapse prediction details" : "Expand prediction details"}
                                                                        className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-[color:var(--bc-border)] text-[color:var(--bc-ink-faint)] transition-transform hover:text-[color:var(--bc-ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--bc-accent)]"
                                                                    >
                                                                        <ChevronDown size={14} className={`transition-transform duration-200 ${active ? "rotate-180" : ""}`} />
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                            {active && (
                                                                <tr className="border-b border-[color:var(--bc-border)] bg-[color:var(--bc-surface-2)]">
                                                                    <td colSpan={5} className="px-5 py-4">
                                                                        {selected && (
                                                                            <p className="mb-3 flex items-center gap-1.5 text-[11px] font-semibold text-[color:var(--bc-accent-strong)]">
                                                                                <Sparkles size={12} />
                                                                                The atmosphere above now reflects this prediction.
                                                                            </p>
                                                                        )}
                                                                        <PredictionDetails record={rec} />
                                                                    </td>
                                                                </tr>
                                                            )}
                                                        </React.Fragment>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* ---------- Mobile cards ---------- */}
                                    <ul className="divide-y divide-[color:var(--bc-border)] md:hidden">
                                        {predictionHistory.map((rec) => {
                                            const active = activePredictionId === rec.id;
                                            return (
                                                <li key={rec.id}>
                                                    <button
                                                        type="button"
                                                        onClick={() => togglePrediction(rec)}
                                                        aria-expanded={active}
                                                        className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left transition-colors hover:bg-[color:var(--bc-surface-2)] focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[color:var(--bc-accent)]"
                                                    >
                                                        <div className="min-w-0">
                                                            <AqiBadge value={rec.prediction} />
                                                            <p className="mt-1.5 text-xs text-[color:var(--bc-ink-faint)]">{formatDate(rec.created_at)}</p>
                                                            <p className="mt-1 text-xs text-[color:var(--bc-ink-soft)]">
                                                                {fmt(rec.temperature_c)} °C · {fmt(rec.humidity_pct)} % · {fmt(rec.windSpeed_kmh)} km/h
                                                            </p>
                                                        </div>
                                                        <ChevronDown size={16} className={`shrink-0 text-[color:var(--bc-ink-faint)] transition-transform duration-200 ${active ? "rotate-180" : ""}`} />
                                                    </button>
                                                    {active && (
                                                        <div className="hist-rise px-4 pb-4">
                                                            <PredictionDetails record={rec} />
                                                        </div>
                                                    )}
                                                </li>
                                            );
                                        })}
                                    </ul>

                                    <Pagination
                                        skip={predictionSkip}
                                        limit={predLimit}
                                        total={predictionTotal}
                                        busy={predictionLoading}
                                        onPage={(nextSkip) => dispatch(fetchPredictionHistory({ skip: nextSkip, limit: predLimit }))}
                                    />
                                </>
                            )}
                        </div>
                    </section>

                    {/* ================= FILE HISTORY ================= */}
                    <section aria-labelledby="hist-file-title" className="mt-14">
                        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                            <div className="flex items-center gap-2.5">
                                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[color:var(--bc-surface)] text-[color:var(--bc-accent-strong)] border border-[color:var(--bc-border)] backdrop-blur-md">
                                    <FileSpreadsheet size={16} />
                                </span>
                                <div>
                                    <h2 id="hist-file-title" className="hist-display text-lg font-semibold leading-none">
                                        Uploaded File History
                                    </h2>
                                    <p className="mt-1 text-xs text-[color:var(--bc-ink-faint)]">
                                        CSV datasets processed for batch prediction
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => void onExportFiles()}
                                disabled={isDownloadingFileHistory || fileTotal === 0}
                                aria-busy={isDownloadingFileHistory}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-[color:var(--bc-border)] bg-[color:var(--bc-surface)] px-3 py-2 text-xs font-semibold text-[color:var(--bc-ink-soft)] backdrop-blur-md transition-colors hover:border-[color:var(--bc-border-strong)] hover:text-[color:var(--bc-ink)] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--bc-accent)]"
                            >
                                {isDownloadingFileHistory ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                                Export File History
                            </button>
                        </div>

                        <div className="overflow-hidden rounded-2xl border border-[color:var(--bc-border)] bg-[color:var(--bc-surface)] shadow-[0_18px_50px_-30px_rgba(9,30,34,0.35)] backdrop-blur-md">
                            {fileError ? (
                                <div className="flex flex-col items-center gap-3 p-10 text-center">
                                    <AlertCircle size={22} className="text-[color:var(--bc-danger)]" />
                                    <p className="text-sm text-[color:var(--bc-ink-soft)]">{fileError}</p>
                                    <button
                                        type="button"
                                        onClick={() => dispatch(fetchFileHistory({ skip: fileSkip, limit: fileLimitSafe }))}
                                        className="inline-flex items-center gap-1.5 rounded-lg border border-[color:var(--bc-border)] px-3 py-2 text-xs font-semibold text-[color:var(--bc-ink-soft)] transition-colors hover:text-[color:var(--bc-ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--bc-accent)]"
                                    >
                                        <RotateCcw size={13} />
                                        Try Again
                                    </button>
                                </div>
                            ) : fileLoading ? (
                                <SkeletonBlock rows={4} />
                            ) : fileHistory.length === 0 ? (
                                <div className="flex flex-col items-center gap-3 p-12 text-center">
                                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[color:var(--bc-surface-2)] text-[color:var(--bc-accent-strong)]">
                                        <FileSpreadsheet size={22} />
                                    </span>
                                    <h3 className="hist-display text-lg font-semibold">No uploaded datasets yet</h3>
                                    <p className="max-w-[38ch] text-sm text-[color:var(--bc-ink-soft)]">
                                        Upload a CSV to process environmental records and generate predictions.
                                    </p>
                                    <Link
                                        to="/fileupload" /* TODO: adjust route if needed */
                                        className="mt-1 inline-flex items-center gap-1.5 rounded-lg bg-[color:var(--bc-accent-strong)] px-4 py-2 text-sm font-semibold text-[#F4FBF9] transition-transform hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--bc-accent)]"
                                    >
                                        Upload CSV
                                        <ArrowRightSmall size={15} />
                                    </Link>
                                </div>
                            ) : (
                                <>
                                    {/* ---------- Desktop table ---------- */}
                                    <div className="hidden md:block">
                                        <table className="w-full text-left text-[13px]">
                                            <thead>
                                                <tr className="border-b border-[color:var(--bc-border)] text-[10px] uppercase tracking-[0.08em] text-[color:var(--bc-ink-faint)]">
                                                    <th scope="col" className="px-5 py-3 font-bold">File</th>
                                                    <th scope="col" className="px-4 py-3 font-bold">File Size</th>
                                                    <th scope="col" className="px-4 py-3 font-bold">Rows Processed</th>
                                                    <th scope="col" className="px-4 py-3 font-bold">Predictions Generated</th>
                                                    <th scope="col" className="px-4 py-3 font-bold">Uploaded</th>
                                                    <th scope="col" className="px-4 py-3 text-right font-bold">
                                                        <span className="sr-only">Actions</span>
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {fileHistory.map((file) => {
                                                    const deleting = deletingFileId === file.id;
                                                    return (
                                                        <tr key={file.id} className="border-b border-[color:var(--bc-border)] transition-colors hover:bg-[color:var(--bc-surface-2)]">
                                                            <td className="px-5 py-3.5">
                                                                <div className="flex items-center gap-2.5">
                                                                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[color:var(--bc-surface-2)] text-[color:var(--bc-accent-strong)]">
                                                                        <FileSpreadsheet size={14} />
                                                                    </span>
                                                                    <div className="min-w-0">
                                                                        <p className="max-w-[220px] truncate font-semibold" title={file.original_name}>{file.original_name}</p>
                                                                        <p className="text-[11px] uppercase text-[color:var(--bc-ink-faint)]">CSV</p>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="px-4 py-3.5 text-[color:var(--bc-ink-soft)]">{formatBytes(file.file_size)}</td>
                                                            <td className="px-4 py-3.5 text-[color:var(--bc-ink-soft)]">{file.row_count.toLocaleString()}</td>
                                                            <td className="px-4 py-3.5 text-[color:var(--bc-ink-soft)]">{file.prediction_count.toLocaleString()}</td>
                                                            <td className="px-4 py-3.5 text-[color:var(--bc-ink-soft)]">{formatDate(file.created_at)}</td>
                                                            <td className="px-4 py-3.5 text-right">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => requestDelete(file)}
                                                                    disabled={deleting}
                                                                    aria-busy={deleting}
                                                                    aria-label={`Remove ${file.original_name} from history`}
                                                                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[color:var(--bc-border)] text-[color:var(--bc-ink-faint)] transition-colors hover:border-[color:var(--bc-danger)] hover:text-[color:var(--bc-danger)] disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--bc-danger)]"
                                                                >
                                                                    {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* ---------- Mobile cards ---------- */}
                                    <ul className="divide-y divide-[color:var(--bc-border)] md:hidden">
                                        {fileHistory.map((file) => {
                                            const deleting = deletingFileId === file.id;
                                            return (
                                                <li key={file.id} className="px-4 py-4">
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div className="flex min-w-0 items-start gap-2.5">
                                                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[color:var(--bc-surface-2)] text-[color:var(--bc-accent-strong)]">
                                                                <FileSpreadsheet size={15} />
                                                            </span>
                                                            <div className="min-w-0">
                                                                <p className="truncate text-sm font-semibold" title={file.original_name}>{file.original_name}</p>
                                                                <p className="mt-0.5 text-xs text-[color:var(--bc-ink-faint)]">{formatDate(file.created_at)}</p>
                                                            </div>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() => requestDelete(file)}
                                                            disabled={deleting}
                                                            aria-busy={deleting}
                                                            aria-label={`Remove ${file.original_name} from history`}
                                                            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[color:var(--bc-border)] text-[color:var(--bc-ink-faint)] transition-colors hover:border-[color:var(--bc-danger)] hover:text-[color:var(--bc-danger)] disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--bc-danger)]"
                                                        >
                                                            {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                                                        </button>
                                                    </div>
                                                    <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
                                                        <div className="rounded-lg bg-[color:var(--bc-surface-2)] px-2 py-1.5">
                                                            <dt className="text-[9px] font-bold uppercase tracking-[0.06em] text-[color:var(--bc-ink-faint)]">Size</dt>
                                                            <dd className="text-xs font-semibold">{formatBytes(file.file_size)}</dd>
                                                        </div>
                                                        <div className="rounded-lg bg-[color:var(--bc-surface-2)] px-2 py-1.5">
                                                            <dt className="text-[9px] font-bold uppercase tracking-[0.06em] text-[color:var(--bc-ink-faint)]">Rows</dt>
                                                            <dd className="text-xs font-semibold">{file.row_count.toLocaleString()}</dd>
                                                        </div>
                                                        <div className="rounded-lg bg-[color:var(--bc-surface-2)] px-2 py-1.5">
                                                            <dt className="text-[9px] font-bold uppercase tracking-[0.06em] text-[color:var(--bc-ink-faint)]">Predictions</dt>
                                                            <dd className="text-xs font-semibold">{file.prediction_count.toLocaleString()}</dd>
                                                        </div>
                                                    </dl>
                                                </li>
                                            );
                                        })}
                                    </ul>

                                    <Pagination
                                        skip={fileSkip}
                                        limit={fileLimitSafe}
                                        total={fileTotal}
                                        busy={fileLoading}
                                        onPage={(nextSkip) => dispatch(fetchFileHistory({ skip: nextSkip, limit: fileLimitSafe }))}
                                    />
                                </>
                            )}
                        </div>
                    </section>
                </main>
            </div>

            {/* ================= CONFIRM: CLEAR PREDICTIONS ================= */}
            <ConfirmModal
                open={clearOpen}
                title="Clear prediction history?"
                confirmLabel="Clear History"
                loading={isClearingPredictionHistory}
                onConfirm={() => void onClearConfirm()}
                onClose={() => setClearOpen(false)}
            >
                All saved prediction records associated with this account will be permanently removed. This action cannot
                be undone.
            </ConfirmModal>

            {/* ================= CONFIRM: DELETE FILE ================= */}
            <ConfirmModal
                open={pendingDelete !== null}
                title="Remove this file from your history?"
                confirmLabel="Remove File"
                loading={deletingFileId !== null}
                onConfirm={() => void onDeleteConfirm()}
                onClose={() => setPendingDelete(null)}
            >
                <span className="font-semibold text-[color:var(--bc-ink)]">{pendingDelete?.original_name}</span> and its
                upload record will be removed from your history. Processed results already downloaded to your device are
                not affected.
            </ConfirmModal>
        </div>
    );
};

export default History;