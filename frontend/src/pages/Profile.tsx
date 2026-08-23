import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
    AtSign,
    Mail,
    CalendarDays,
    KeyRound,
    LogIn,
    PencilLine,
    Settings2,
    Gauge,
    FileSpreadsheet,
    CloudSun,
    ArrowRight,
    ArrowUpRight,
    Trash2,
    AlertTriangle,
    Loader2,
    RotateCcw,
    Lock,
    ScrollText,
    Wind,
    Thermometer,
    AlertCircle,
} from "lucide-react";
// TODO: adjust to your project's actual paths -----------------------------
import { useAppDispatch, useAppSelector } from "../app/redux";
import { fetchProfile, deleteProfileAccount } from "../app/features/profile/profileSlice";
import type { ProfileResponse, ProfileUser, ProfileFile } from "../hooks/types/profile.type";
import type { PredictionHistory } from "../hooks/types/history.type";
import Navbar from "../components/Navbar";
import { companyName } from "../core/config";
import { useSEO } from "../utils/useSeo";
import { useGoogleFont } from "../utils/useGoogleFont";
// ---------------------------------------------------------------------------

/** TODO: adjust to match your profileSlice state shape. */
interface ProfileState {
    profile: ProfileResponse | null;
    loading: boolean;
    error: string | null;
    updateError: string | null;
    deletingAccount: boolean;
}

/** TODO: replace with your real settings/edit route when created. */
const SETTINGS_ROUTE = "/settings";
/** TODO: replace with your real legal routes when created. */
const PRIVACY_ROUTE = "/privacy-policy";
const TERMS_ROUTE = "/terms-and-conditions";

/* ============================================================================
 * Helpers
 * ==========================================================================*/
function getInitials(fullname?: string, username?: string): string {
    const source = (fullname ?? "").trim();
    if (source) {
        const parts = source.split(/\s+/).filter(Boolean);
        const first = parts[0]?.[0] ?? "";
        const last = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? "" : "";
        const initials = (first + last).toUpperCase();
        if (initials) return initials;
    }
    const u = (username ?? "").trim();
    return (u.slice(0, 2) || "BC").toUpperCase();
}

function formatMemberSince(iso: string): string {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

function formatDate(iso: string): string {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    const datePart = d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
    const timePart = d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
    return `${datePart} · ${timePart}`;
}

function formatInt(n: number): string {
    return Number.isFinite(n) ? n.toLocaleString() : "—";
}

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

function fmt(n: number): string {
    if (!Number.isFinite(n)) return "—";
    const r = Math.round(n * 10) / 10;
    return Number.isInteger(r) ? String(r) : r.toFixed(1);
}

/** Same AQI language used across BreatheCast. */
function aqiMeta(v: number): { label: string; color: string } {
    if (v <= 50) return { label: "Pristine", color: "#10B981" };
    if (v <= 100) return { label: "Moderate", color: "#FBBF24" };
    if (v <= 150) return { label: "Elevated", color: "#F97316" };
    return { label: "Heavy", color: "#EF4444" };
}

function asMessage(v: unknown): string | null {
    return typeof v === "string" && v.trim().length > 0 ? v : null;
}

/* ============================================================================
 * Calm fixed atmospheric layer — quieter than the prediction pages.
 * ==========================================================================*/
const CalmAtmosphere: React.FC<{ isDark: boolean }> = ({ isDark }) => {
    const accent = isDark ? "#4FD8C4" : "#10B981";

    const particles = useMemo(
        () =>
            Array.from({ length: 10 }, (_, i) => ({
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
            Array.from({ length: 14 }, (_, i) => ({
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
                    <linearGradient id="pf-sky" x1="0" y1="0" x2="0" y2="1">
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
                    <radialGradient id="pf-sun" cx="80%" cy="10%" r="45%">
                        <stop offset="0%" stopColor={isDark ? "#123B39" : "#FEF3C7"} stopOpacity={isDark ? 0.5 : 0.8} />
                        <stop offset="100%" stopColor={isDark ? "#123B39" : "#FEF3C7"} stopOpacity="0" />
                    </radialGradient>
                </defs>

                <rect x="0" y="0" width="480" height="480" fill="url(#pf-sky)" />
                <rect x="0" y="0" width="480" height="480" fill="url(#pf-sun)" />

                {isDark &&
                    stars.map((s) => (
                        <circle
                            key={s.id}
                            className="pf-star"
                            cx={(s.cx / 100) * 480}
                            cy={(s.cy / 100) * 480}
                            r={s.r}
                            fill="#EAF4F2"
                            style={{ animationDuration: `${s.dur}s`, animationDelay: `${s.delay}s` }}
                        />
                    ))}

                {/* Gentle wind */}
                <g fill="none" strokeLinecap="round" strokeWidth="2" style={{ stroke: accent, strokeOpacity: isDark ? 0.2 : 0.22 }}>
                    <path className="pf-wind" style={{ animationDuration: "9s" }} d="M -20 240 C 90 222, 150 258, 260 238 S 470 220, 520 236" />
                    <path className="pf-wind" style={{ animationDuration: "11s", animationDelay: "-3s" }} d="M -30 280 C 80 296, 170 266, 250 284 S 440 298, 520 278" />
                </g>

                {/* Slow clouds */}
                <g className="pf-cloud-a" opacity={isDark ? 0.45 : 0.85}>
                    <ellipse cx="110" cy="140" rx="110" ry="24" fill={isDark ? "#12222A" : "#FFFFFF"} />
                    <ellipse cx="188" cy="127" rx="72" ry="18" fill={isDark ? "#12222A" : "#FFFFFF"} />
                </g>
                <g className="pf-cloud-b" opacity={isDark ? 0.35 : 0.65}>
                    <ellipse cx="340" cy="210" rx="130" ry="28" fill={isDark ? "#0E1B21" : "#FFFFFF"} />
                    <ellipse cx="412" cy="195" rx="66" ry="17" fill={isDark ? "#0E1B21" : "#FFFFFF"} />
                </g>

                {/* Quiet particles */}
                {particles.map((p) => (
                    <circle
                        key={p.id}
                        className="pf-particle"
                        cx={(p.cx / 100) * 480}
                        cy={(p.cy / 100) * 480}
                        r={p.r}
                        fill={accent}
                        fillOpacity="0.4"
                        style={{ animationDuration: `${p.dur}s`, animationDelay: `${p.delay}s` }}
                    />
                ))}

                {/* Soft horizon */}
                <path d="M0 380 C 120 362, 360 400, 480 372 L480 480 L0 480 Z" fill={accent} opacity="0.12" />
                <path d="M0 400 C 120 382, 360 418, 480 392 L480 480 L0 480 Z" fill={isDark ? "#081215" : "#A7F3D0"} opacity={isDark ? 0.85 : 0.55} />
            </svg>
        </div>
    );
};

/* ============================================================================
 * Small local presentational pieces
 * ==========================================================================*/
const InfoRow: React.FC<{ icon: React.ReactNode; label: string; children: React.ReactNode }> = ({ icon, label, children }) => (
    <div className="flex items-start justify-between gap-4 px-5 py-4">
        <div className="flex items-center gap-2.5 min-w-0">
            <span className="text-[color:var(--bc-ink-faint)]" aria-hidden="true">
                {icon}
            </span>
            <span className="text-xs font-semibold uppercase tracking-[0.06em] text-[color:var(--bc-ink-faint)]">{label}</span>
        </div>
        <div className="min-w-0 text-right text-sm font-semibold text-[color:var(--bc-ink)]">{children}</div>
    </div>
);

const AqiBadge: React.FC<{ value: number }> = ({ value }) => {
    const meta = aqiMeta(value);
    return (
        <span
            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold"
            style={{ background: `color-mix(in srgb, ${meta.color} 14%, transparent)`, color: meta.color }}
        >
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: meta.color }} aria-hidden="true" />
            {Math.round(value)}
            <span className="font-medium opacity-80">{meta.label}</span>
        </span>
    );
};

interface DeleteModalProps {
    open: boolean;
    busy: boolean;
    onConfirm: () => void;
    onClose: () => void;
}

const DeleteModal: React.FC<DeleteModalProps> = ({ open, busy, onConfirm, onClose }) => {
    const cancelRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        if (!open) return;
        cancelRef.current?.focus();
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape" && !busy) onClose();
        };
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, [open, busy, onClose]);

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-5">
            <div className="absolute inset-0 bg-black/45 backdrop-blur-sm" onClick={() => !busy && onClose()} aria-hidden="true" />
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="pf-delete-title"
                className="pf-rise relative w-full max-w-md rounded-2xl border border-[color:var(--bc-border-strong)] bg-[color:var(--bc-surface)] p-6 shadow-2xl backdrop-blur-xl"
            >
                <div className="mb-3 flex items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[color:var(--bc-danger-bg)] text-[color:var(--bc-danger)]">
                        <AlertTriangle size={18} />
                    </span>
                    <h3 id="pf-delete-title" className="pf-display text-lg font-semibold text-[color:var(--bc-ink)]">
                        Delete your account?
                    </h3>
                </div>
                <p className="text-sm leading-relaxed text-[color:var(--bc-ink-soft)]">
                    This action permanently removes your account and associated data. This cannot be undone.
                </p>
                <div className="mt-6 flex justify-end gap-2">
                    <button
                        ref={cancelRef}
                        type="button"
                        disabled={busy}
                        onClick={onClose}
                        className="rounded-lg border border-[color:var(--bc-border)] px-4 py-2 text-sm font-semibold text-[color:var(--bc-ink-soft)] transition-colors hover:border-[color:var(--bc-border-strong)] hover:text-[color:var(--bc-ink)] disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--bc-accent)]"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        disabled={busy}
                        onClick={onConfirm}
                        aria-busy={busy}
                        className="inline-flex items-center gap-2 rounded-lg bg-[color:var(--bc-danger)] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--bc-danger)]"
                    >
                        {busy && <Loader2 size={15} className="animate-spin" />}
                        {busy ? "Deleting account..." : "Delete Account"}
                    </button>
                </div>
            </div>
        </div>
    );
};

const SkeletonLine: React.FC<{ className?: string }> = ({ className = "" }) => (
    <div className={`animate-pulse rounded-lg bg-[color:var(--bc-track)] ${className}`} aria-hidden="true" />
);

/* ============================================================================
 * Page
 * ==========================================================================*/
const Profile: React.FC = () => {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const mode = useAppSelector((state) => state.theme.mode);
    const isDark = mode === "dark";

    // TODO: adjust selector/shape to match your profileSlice.
    const { profile, loading, error, deletingAccount } = useAppSelector(
        (state) => (state).profile
    );

    const [deleteOpen, setDeleteOpen] = useState(false);

    useSEO(
        `Profile | ${companyName}`,
        `Your ${companyName} account overview — identity, environmental activity, sign-in status, and account management.`
    );
    useGoogleFont("Fraunces");
    useGoogleFont("Plus Jakarta Sans");

    /* ---- initial fetch (mount only) ---- */
    useEffect(() => {
        dispatch(fetchProfile());
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const user: ProfileUser | null = profile?.user ?? null;
    const historyTotal = profile?.history.total ?? 0;
    const filesTotal = profile?.files.total ?? 0;
    const recentPredictions = useMemo(() => profile?.history.items.slice(0, 4) ?? [], [profile]);
    const recentFiles = useMemo(() => profile?.files.items.slice(0, 4) ?? [], [profile]);
    const latestPrediction = recentPredictions[0] ?? null;
    const bothEmpty = historyTotal === 0 && filesTotal === 0;

    /* ---- account deletion ---- */
    const handleDeleteConfirm = async () => {
        if (deletingAccount) return; // prevent duplicate submission
        const res = await dispatch(deleteProfileAccount()); // TODO: pass payload if your thunk requires one
        if (deleteProfileAccount.fulfilled.match(res)) {
            toast.success("Your account has been deleted.");
            setDeleteOpen(false);
            navigate("/"); // TODO: adjust to your public intro/login route if different
        } else {
            toast.error(asMessage(res.payload) ?? "Unable to delete your account right now.");
        }
    };

    const cardBase =
        "rounded-2xl border border-[color:var(--bc-border)] bg-[color:var(--bc-surface)] shadow-[0_18px_50px_-30px_rgba(9,30,34,0.35)] backdrop-blur-md";

    return (
        <div
            className="pf-root relative min-h-screen bg-[color:var(--bc-bg)] text-[color:var(--bc-ink)] transition-colors duration-500"
            data-theme={isDark ? "dark" : "day"}
        >
            <style>{`
                .pf-root {
                    --bc-font-display: 'Fraunces', 'Georgia', serif;
                    --bc-font-body: 'Plus Jakarta Sans', 'Inter', system-ui, sans-serif;
                    font-family: var(--bc-font-body);
                }
                .pf-root[data-theme='day'] {
                    --bc-bg: #F8FAFC;
                    --bc-surface: rgba(255, 255, 255, 0.9);
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
                    --bc-success: #059669;
                    --bc-success-bg: rgba(16, 185, 129, 0.1);
                    --bc-track: rgba(16, 185, 129, 0.12);
                    --bc-grad-1: rgba(16, 185, 129, 0.18);
                    --bc-grad-2: rgba(6, 182, 212, 0.12);
                }
                .pf-root[data-theme='dark'] {
                    --bc-bg: #0A1418;
                    --bc-surface: rgba(16, 28, 33, 0.9);
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
                    --bc-success: #4FD8C4;
                    --bc-success-bg: rgba(79, 216, 196, 0.1);
                    --bc-track: rgba(231, 241, 240, 0.1);
                    --bc-grad-1: rgba(79, 216, 196, 0.14);
                    --bc-grad-2: rgba(18, 59, 57, 0.4);
                }
                .pf-display { font-family: var(--bc-font-display); }

                @keyframes pf-float { 0%, 100% { transform: translate3d(0,0,0); opacity: 0.4; } 50% { transform: translate3d(0,-11px,0); opacity: 0.8; } }
                @keyframes pf-wind-flow { from { stroke-dashoffset: 240; } to { stroke-dashoffset: 0; } }
                @keyframes pf-twinkle { 0%, 100% { opacity: 0.12; } 50% { opacity: 0.7; } }
                @keyframes pf-drift { from { transform: translate3d(-5%, 0, 0); } to { transform: translate3d(5%, 0, 0); } }
                @keyframes pf-drift-slow { from { transform: translate3d(-3.5%, 0, 0); } to { transform: translate3d(4%, 0, 0); } }
                @keyframes pf-rise { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }

                .pf-particle { animation: pf-float ease-in-out infinite; transform-box: fill-box; transform-origin: center; }
                .pf-wind { stroke-dasharray: 8 14; animation: pf-wind-flow linear infinite; }
                .pf-star { animation: pf-twinkle ease-in-out infinite; transform-box: fill-box; transform-origin: center; }
                .pf-cloud-a { animation: pf-drift 60s ease-in-out infinite alternate; }
                .pf-cloud-b { animation: pf-drift-slow 78s ease-in-out infinite alternate; }
                .pf-rise { animation: pf-rise 0.4s cubic-bezier(0.16, 1, 0.3, 1) both; }

                @media (prefers-reduced-motion: reduce) {
                    .pf-particle, .pf-wind, .pf-star, .pf-cloud-a, .pf-cloud-b, .pf-rise { animation: none !important; }
                }
            `}</style>

            <CalmAtmosphere isDark={isDark} />

            <div className="relative z-10 flex min-h-screen flex-col">
                <Navbar />

                <main className="mx-auto w-full max-w-[1160px] flex-1 px-5 pb-20 sm:px-8">
                    {/* ================= ERROR STATE ================= */}
                    {error && !profile && !loading ? (
                        <div className={`mx-auto mt-16 max-w-md ${cardBase} pf-rise flex flex-col items-center gap-3 p-10 text-center`}>
                            <AlertCircle size={22} className="text-[color:var(--bc-danger)]" />
                            <h1 className="pf-display text-lg font-semibold">Unable to load your profile.</h1>
                            <p className="text-sm text-[color:var(--bc-ink-soft)]">{error}</p>
                            <button
                                type="button"
                                onClick={() => dispatch(fetchProfile())}
                                className="mt-1 inline-flex items-center gap-1.5 rounded-lg border border-[color:var(--bc-border)] px-3 py-2 text-xs font-semibold text-[color:var(--bc-ink-soft)] transition-colors hover:border-[color:var(--bc-border-strong)] hover:text-[color:var(--bc-ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--bc-accent)]"
                            >
                                <RotateCcw size={13} />
                                Try Again
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-5 pt-8 lg:grid-cols-12">
                            {/* ============ IDENTITY HERO ============ */}
                            <section aria-label="Account identity" className={`${cardBase} overflow-hidden lg:col-span-5`}>
                                <div className="h-24" style={{ background: "linear-gradient(120deg, var(--bc-grad-1), var(--bc-grad-2))" }} />
                                <div className="-mt-10 px-6 pb-6 sm:px-7">
                                    {loading && !profile ? (
                                        <div className="flex flex-col gap-4">
                                            <SkeletonLine className="h-20 w-20 rounded-2xl" />
                                            <SkeletonLine className="h-6 w-40" />
                                            <SkeletonLine className="h-4 w-28" />
                                            <SkeletonLine className="h-4 w-52" />
                                        </div>
                                    ) : (
                                        <div className="pf-rise">
                                            {/* Generated monogram — no avatar upload */}
                                            <div
                                                className="pf-display flex h-20 w-20 items-center justify-center rounded-2xl text-2xl font-semibold text-[#F4FBF9] ring-4 ring-[color:var(--bc-surface)]"
                                                style={{ background: `linear-gradient(135deg, var(--bc-accent), var(--bc-accent-strong))` }}
                                                aria-label={`Profile monogram for ${user?.fullname ?? user?.username ?? "account"}`}
                                            >
                                                {getInitials(user?.fullname, user?.username)}
                                            </div>

                                            <h1 className="pf-display mt-4 text-2xl font-semibold leading-tight sm:text-[28px]">
                                                {user?.fullname || user?.username || "Your account"}
                                            </h1>
                                            <p className="mt-1 inline-flex items-center gap-1.5 text-sm font-semibold text-[color:var(--bc-accent-strong)]">
                                                <AtSign size={14} aria-hidden="true" />
                                                {user?.username ?? "—"}
                                            </p>
                                            <p className="mt-3 text-sm leading-relaxed text-[color:var(--bc-ink-soft)]">
                                                Your {companyName} environmental workspace — predictions, datasets, and
                                                account context in one calm place.
                                            </p>

                                            <div className="mt-4 flex flex-wrap items-center gap-2">
                                                <span className="inline-flex items-center gap-1.5 rounded-full border border-[color:var(--bc-border)] bg-[color:var(--bc-surface-2)] px-3 py-1 text-xs font-semibold text-[color:var(--bc-ink-soft)]">
                                                    <CalendarDays size={12} aria-hidden="true" />
                                                    Member since {user ? formatMemberSince(user.created_at) : "—"}
                                                </span>
                                                {user?.has_password ? (
                                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-[color:var(--bc-success-bg)] px-3 py-1 text-xs font-semibold text-[color:var(--bc-success)]">
                                                        <KeyRound size={12} aria-hidden="true" />
                                                        Password enabled
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-[color:var(--bc-success-bg)] px-3 py-1 text-xs font-semibold text-[color:var(--bc-accent-strong)]">
                                                        <LogIn size={12} aria-hidden="true" />
                                                        Google sign-in account
                                                    </span>
                                                )}
                                            </div>

                                            <div className="mt-6 flex flex-wrap gap-2">
                                                <Link
                                                    to={SETTINGS_ROUTE} /* TODO: real settings route */
                                                    className="inline-flex items-center gap-2 rounded-lg bg-[color:var(--bc-accent-strong)] px-4 py-2.5 text-sm font-semibold text-[#F4FBF9] shadow-[0_10px_30px_-12px_color-mix(in_srgb,var(--bc-accent-strong)_60%,transparent)] transition-transform hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--bc-accent)]"
                                                >
                                                    <PencilLine size={15} />
                                                    Edit Profile
                                                </Link>
                                                <Link
                                                    to="/history"
                                                    className="inline-flex items-center gap-2 rounded-lg border border-[color:var(--bc-border)] bg-[color:var(--bc-surface)] px-4 py-2.5 text-sm font-semibold text-[color:var(--bc-ink-soft)] transition-colors hover:border-[color:var(--bc-border-strong)] hover:text-[color:var(--bc-ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--bc-accent)]"
                                                >
                                                    View History
                                                    <ArrowUpRight size={14} />
                                                </Link>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </section>

                            {/* ============ ACTIVITY OVERVIEW (STATS) ============ */}
                            <section aria-label="Activity overview" className={`${cardBase} p-6 lg:col-span-7`}>
                                <h2 className="pf-display mb-4 text-base font-semibold">Activity Overview</h2>
                                {loading && !profile ? (
                                    <div className="grid grid-cols-3 gap-3">
                                        <SkeletonLine className="h-24" />
                                        <SkeletonLine className="h-24" />
                                        <SkeletonLine className="h-24" />
                                    </div>
                                ) : (
                                    <div className="pf-rise grid grid-cols-3 gap-3">
                                        <div className="rounded-xl border border-[color:var(--bc-border)] bg-[color:var(--bc-surface-2)] p-4">
                                            <div className="flex items-center gap-2 text-[color:var(--bc-ink-faint)]">
                                                <Gauge size={14} aria-hidden="true" />
                                                <p className="text-[10px] font-bold uppercase tracking-[0.08em]">Predictions</p>
                                            </div>
                                            <p className="pf-display mt-2 text-2xl font-semibold">{formatInt(historyTotal)}</p>
                                        </div>
                                        <div className="rounded-xl border border-[color:var(--bc-border)] bg-[color:var(--bc-surface-2)] p-4">
                                            <div className="flex items-center gap-2 text-[color:var(--bc-ink-faint)]">
                                                <FileSpreadsheet size={14} aria-hidden="true" />
                                                <p className="text-[10px] font-bold uppercase tracking-[0.08em]">Datasets</p>
                                            </div>
                                            <p className="pf-display mt-2 text-2xl font-semibold">{formatInt(filesTotal)}</p>
                                        </div>
                                        <div className="rounded-xl border border-[color:var(--bc-border)] bg-[color:var(--bc-surface-2)] p-4">
                                            <div className="flex items-center gap-2 text-[color:var(--bc-ink-faint)]">
                                                <CloudSun size={14} aria-hidden="true" />
                                                <p className="text-[10px] font-bold uppercase tracking-[0.08em]">Latest AQI</p>
                                            </div>
                                            <div className="mt-2">
                                                {latestPrediction ? (
                                                    <AqiBadge value={latestPrediction.prediction} />
                                                ) : (
                                                    <p className="pf-display text-2xl font-semibold text-[color:var(--bc-ink-faint)]">—</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </section>

                            {/* ============ RECENT ACTIVITY ============ */}
                            <section aria-label="Recent activity" className={`${cardBase} p-6 lg:col-span-7`}>
                                <h2 className="pf-display mb-4 text-base font-semibold">Recent Activity</h2>

                                {loading && !profile ? (
                                    <div className="space-y-3">
                                        <SkeletonLine className="h-14" />
                                        <SkeletonLine className="h-14" />
                                        <SkeletonLine className="h-14" />
                                    </div>
                                ) : bothEmpty ? (
                                    <div className="pf-rise flex flex-col items-center gap-3 py-8 text-center">
                                        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[color:var(--bc-surface-2)] text-[color:var(--bc-accent-strong)]">
                                            <CloudSun size={22} />
                                        </span>
                                        <h3 className="pf-display text-lg font-semibold">Your environmental workspace is ready.</h3>
                                        <p className="max-w-[38ch] text-sm text-[color:var(--bc-ink-soft)]">
                                            Start with a single prediction, or process an entire dataset at once.
                                        </p>
                                        <div className="mt-1 flex flex-wrap justify-center gap-2">
                                            <Link
                                                to="/predict"
                                                className="inline-flex items-center gap-1.5 rounded-lg bg-[color:var(--bc-accent-strong)] px-4 py-2 text-sm font-semibold text-[#F4FBF9] transition-transform hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--bc-accent)]"
                                            >
                                                Make your first prediction
                                                <ArrowRight size={14} />
                                            </Link>
                                            <Link
                                                to="/fileupload"
                                                className="inline-flex items-center gap-1.5 rounded-lg border border-[color:var(--bc-border)] px-4 py-2 text-sm font-semibold text-[color:var(--bc-ink-soft)] transition-colors hover:border-[color:var(--bc-border-strong)] hover:text-[color:var(--bc-ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--bc-accent)]"
                                            >
                                                Upload your first dataset
                                            </Link>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="pf-rise grid gap-6 md:grid-cols-2">
                                        {/* ---- Recent predictions ---- */}
                                        <div className="min-w-0">
                                            <div className="mb-3 flex items-center justify-between gap-2">
                                                <h3 className="text-xs font-bold uppercase tracking-[0.08em] text-[color:var(--bc-ink-faint)]">
                                                    Recent Predictions
                                                </h3>
                                                <Link
                                                    to="/history"
                                                    className="inline-flex items-center gap-1 text-xs font-semibold text-[color:var(--bc-accent-strong)] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--bc-accent)]"
                                                >
                                                    View Full History
                                                    <ArrowUpRight size={12} />
                                                </Link>
                                            </div>
                                            {recentPredictions.length === 0 ? (
                                                <p className="rounded-xl border border-dashed border-[color:var(--bc-border-strong)] px-4 py-5 text-center text-xs text-[color:var(--bc-ink-faint)]">
                                                    No predictions yet —{" "}
                                                    <Link to="/predict" className="font-semibold text-[color:var(--bc-accent-strong)] hover:underline">
                                                        make your first
                                                    </Link>
                                                    .
                                                </p>
                                            ) : (
                                                <ul className="space-y-2">
                                                    {recentPredictions.map((rec: PredictionHistory) => (
                                                        <li
                                                            key={rec.id}
                                                            className="flex items-center justify-between gap-3 rounded-xl border border-[color:var(--bc-border)] bg-[color:var(--bc-surface-2)] px-3.5 py-2.5"
                                                        >
                                                            <div className="min-w-0">
                                                                <AqiBadge value={rec.prediction} />
                                                                <p className="mt-1 truncate text-[11px] text-[color:var(--bc-ink-faint)]">
                                                                    {formatDate(rec.created_at)}
                                                                </p>
                                                            </div>
                                                            <p className="flex shrink-0 items-center gap-2 text-[11px] font-semibold text-[color:var(--bc-ink-soft)]">
                                                                <span className="inline-flex items-center gap-1">
                                                                    <Thermometer size={11} aria-hidden="true" />
                                                                    {fmt(rec.Temperature_C)}°C
                                                                </span>
                                                                <span className="inline-flex items-center gap-1">
                                                                    <Wind size={11} aria-hidden="true" />
                                                                    {fmt(rec.WindSpeed_kmh)} km/h
                                                                </span>
                                                            </p>
                                                        </li>
                                                    ))}
                                                </ul>
                                            )}
                                        </div>

                                        {/* ---- Recent datasets ---- */}
                                        <div className="min-w-0">
                                            <div className="mb-3 flex items-center justify-between gap-2">
                                                <h3 className="text-xs font-bold uppercase tracking-[0.08em] text-[color:var(--bc-ink-faint)]">
                                                    Recent Datasets
                                                </h3>
                                                <Link
                                                    to="/history"
                                                    className="inline-flex items-center gap-1 text-xs font-semibold text-[color:var(--bc-accent-strong)] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--bc-accent)]"
                                                >
                                                    View File History
                                                    <ArrowUpRight size={12} />
                                                </Link>
                                            </div>
                                            {recentFiles.length === 0 ? (
                                                <p className="rounded-xl border border-dashed border-[color:var(--bc-border-strong)] px-4 py-5 text-center text-xs text-[color:var(--bc-ink-faint)]">
                                                    No datasets yet —{" "}
                                                    <Link to="/fileupload" className="font-semibold text-[color:var(--bc-accent-strong)] hover:underline">
                                                        upload a CSV
                                                    </Link>
                                                    .
                                                </p>
                                            ) : (
                                                <ul className="space-y-2">
                                                    {recentFiles.map((file: ProfileFile) => (
                                                        <li
                                                            key={file.id}
                                                            className="flex items-center gap-3 rounded-xl border border-[color:var(--bc-border)] bg-[color:var(--bc-surface-2)] px-3.5 py-2.5"
                                                        >
                                                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[color:var(--bc-surface)] text-[color:var(--bc-accent-strong)]">
                                                                <FileSpreadsheet size={15} />
                                                            </span>
                                                            <div className="min-w-0 flex-1">
                                                                <p className="truncate text-sm font-semibold" title={file.original_name}>
                                                                    {file.original_name}
                                                                </p>
                                                                <p className="truncate text-[11px] text-[color:var(--bc-ink-faint)]">
                                                                    {formatInt(file.row_count)} rows · {formatInt(file.prediction_count)} predictions · {formatBytes(file.file_size)}
                                                                </p>
                                                            </div>
                                                            <p className="shrink-0 text-[11px] text-[color:var(--bc-ink-faint)]">
                                                                {formatDate(file.created_at)}
                                                            </p>
                                                        </li>
                                                    ))}
                                                </ul>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </section>

                            {/* ============ ACCOUNT INFORMATION ============ */}
                            <section aria-label="Account information" className={`${cardBase} lg:col-span-5`}>
                                <h2 className="pf-display px-5 pb-1 pt-5 text-base font-semibold">Account Information</h2>
                                {loading && !profile ? (
                                    <div className="space-y-3 p-5">
                                        <SkeletonLine className="h-10" />
                                        <SkeletonLine className="h-10" />
                                        <SkeletonLine className="h-10" />
                                        <SkeletonLine className="h-10" />
                                    </div>
                                ) : (
                                    <div className="pf-rise divide-y divide-[color:var(--bc-border)]">
                                        <InfoRow icon={<Mail size={14} />} label="Full Name">
                                            <span className="block truncate">{user?.fullname || "—"}</span>
                                        </InfoRow>
                                        <InfoRow icon={<AtSign size={14} />} label="Username">
                                            <span className="block truncate">@{user?.username ?? "—"}</span>
                                        </InfoRow>
                                        <InfoRow icon={<Mail size={14} />} label="Email">
                                            <span className="block truncate">{user?.email ?? "—"}</span>
                                        </InfoRow>
                                        <InfoRow icon={<CalendarDays size={14} />} label="Member Since">
                                            {user ? formatMemberSince(user.created_at) : "—"}
                                        </InfoRow>
                                        <InfoRow icon={user?.has_password ? <KeyRound size={14} /> : <LogIn size={14} />} label="Sign-in">
                                            {user?.has_password ? "Password enabled" : "Google sign-in"}
                                        </InfoRow>

                                        <div className="px-5 py-4">
                                            {user && !user.has_password && (
                                                <p className="mb-3 rounded-xl bg-[color:var(--bc-surface-2)] px-3.5 py-2.5 text-xs leading-relaxed text-[color:var(--bc-ink-soft)]">
                                                    You can set a password from Account Settings for an additional sign-in
                                                    option.
                                                </p>
                                            )}
                                            <Link
                                                to={SETTINGS_ROUTE} /* TODO: real settings route */
                                                className="inline-flex items-center gap-2 rounded-lg border border-[color:var(--bc-border)] px-3.5 py-2 text-xs font-semibold text-[color:var(--bc-ink-soft)] transition-colors hover:border-[color:var(--bc-border-strong)] hover:text-[color:var(--bc-ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--bc-accent)]"
                                            >
                                                <Settings2 size={13} />
                                                {user?.has_password ? "Manage password" : "Add a password"}
                                            </Link>
                                        </div>
                                    </div>
                                )}
                            </section>

                            {/* ============ PRIVACY & LEGAL ============ */}
                            <section aria-label="Privacy and legal" className={`${cardBase} px-6 py-4 lg:col-span-12`}>
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                    <p className="flex items-center gap-2 text-xs text-[color:var(--bc-ink-faint)]">
                                        <Lock size={12} aria-hidden="true" />
                                        Your prediction and upload history is associated with your account.
                                    </p>
                                    <div className="flex items-center gap-4">
                                        <Link
                                            to={PRIVACY_ROUTE}
                                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[color:var(--bc-ink-soft)] transition-colors hover:text-[color:var(--bc-ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--bc-accent)]"
                                        >
                                            <Lock size={12} aria-hidden="true" />
                                            Privacy Policy
                                        </Link>
                                        <Link
                                            to={TERMS_ROUTE}
                                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[color:var(--bc-ink-soft)] transition-colors hover:text-[color:var(--bc-ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--bc-accent)]"
                                        >
                                            <ScrollText size={12} aria-hidden="true" />
                                            Terms &amp; Conditions
                                        </Link>
                                    </div>
                                </div>
                            </section>

                            {/* ============ DANGER ZONE ============ */}
                            <section
                                aria-label="Account removal"
                                className="rounded-2xl border border-[color:var(--bc-danger)] bg-[color:var(--bc-danger-bg)] px-6 py-5 lg:col-span-12"
                            >
                                <div className="flex flex-wrap items-center justify-between gap-4">
                                    <div className="min-w-0">
                                        <h2 className="pf-display text-base font-semibold text-[color:var(--bc-danger)]">Danger Zone</h2>
                                        <p className="mt-1 max-w-[60ch] text-xs leading-relaxed text-[color:var(--bc-ink-soft)]">
                                            Permanently remove your account and associated data. This action cannot be
                                            undone.
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setDeleteOpen(true)}
                                        disabled={deletingAccount}
                                        className="inline-flex items-center gap-2 rounded-lg border border-[color:var(--bc-danger)] bg-transparent px-4 py-2.5 text-sm font-semibold text-[color:var(--bc-danger)] transition-colors hover:bg-[color:var(--bc-danger-bg)] disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--bc-danger)]"
                                    >
                                        <Trash2 size={15} />
                                        Delete Account
                                    </button>
                                </div>
                            </section>
                        </div>
                    )}
                </main>

                <footer className="px-5 pb-8 text-center text-xs text-[color:var(--bc-ink-faint)]">
                    <strong className="font-semibold text-[color:var(--bc-ink-soft)]">{companyName}</strong> · Environmental
                    intelligence, personally yours.
                </footer>
            </div>

            <DeleteModal
                open={deleteOpen}
                busy={deletingAccount}
                onConfirm={() => void handleDeleteConfirm()}
                onClose={() => setDeleteOpen(false)}
            />
        </div>
    );
};

export default Profile;