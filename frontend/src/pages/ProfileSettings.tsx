import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
    AtSign,
    Mail,
    CalendarDays,
    KeyRound,
    LogIn,
    Pencil,
    Check,
    X,
    Trash2,
    AlertTriangle,
    Loader2,
    Lock,
    ScrollText,
    Eye,
    EyeOff,
    ShieldCheck,
    User as UserIcon,
    ArrowLeft,
    Info,
} from "lucide-react";
// TODO: adjust to your project's actual paths -----------------------------
import { useAppDispatch, useAppSelector } from "../app/redux";
import {
    fetchProfile,
    updateProfileName,
    updateProfileUsername,
    setProfilePassword,
    changeProfilePassword,
    deleteProfileAccount,
} from "../app/features/profile/profileSlice";
import type { ProfileResponse, ProfileUser } from "../hooks/types/profile.type";
import Navbar from "../components/Navbar";
import { companyName } from "../core/config";
import { useSEO } from "../utils/useSeo";
import { useGoogleFont } from "../utils/useGoogleFont";
// TODO: move these two regex constants to your constraints folder and
// import them as USERNAME_REGEX and PASSWORD_REGEX — kept local here only
// because the existing exports are not visible to this file.
const USERNAME_REGEX = /^[a-zA-Z0-9_]{2,49}$/;
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
const USERNAME_ALLOWED_REGEX = /^[a-zA-Z0-9_]+$/;
// ---------------------------------------------------------------------------

/** TODO: adjust to match your profileSlice state shape. */
interface ProfileSliceState {
    profile: ProfileResponse | null;
    loading: boolean;
    error: string | null;
    updateError: string | null;
    updatingName: boolean;
    updatingUsername: boolean;
    settingPassword: boolean;
    changingPassword: boolean;
    deletingAccount: boolean;
}

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

function asMessage(v: unknown): string | null {
    return typeof v === "string" && v.trim().length > 0 ? v : null;
}

function sanitizeUsername(raw: string): string {
    return raw.replace(/[^a-zA-Z0-9_]/g, "").slice(0, 49);
}

type PwStrength = "none" | "weak" | "fair" | "strong";

function evaluatePasswordStrength(pw: string): { score: number; level: PwStrength; met: string[]; missing: string[] } {
    const checks: { label: string; pass: boolean }[] = [
        { label: "At least 8 characters", pass: pw.length >= 8 },
        { label: "Lowercase letter", pass: /[a-z]/.test(pw) },
        { label: "Uppercase letter", pass: /[A-Z]/.test(pw) },
        { label: "Number", pass: /\d/.test(pw) },
        { label: "Special character", pass: /[^A-Za-z0-9]/.test(pw) },
    ];
    const met = checks.filter((c) => c.pass).map((c) => c.label);
    const missing = checks.filter((c) => !c.pass).map((c) => c.label);
    const score = met.length;
    let level: PwStrength = "none";
    if (score >= 5) level = "strong";
    else if (score >= 3) level = "fair";
    else if (score >= 1) level = "weak";
    return { score, level, met, missing };
}

/* ============================================================================
 * Calm atmospheric background — fixed to the viewport, never scrolls.
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
                    <linearGradient id="pfs-sky" x1="0" y1="0" x2="0" y2="1">
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
                    <radialGradient id="pfs-sun" cx="80%" cy="10%" r="45%">
                        <stop offset="0%" stopColor={isDark ? "#123B39" : "#FEF3C7"} stopOpacity={isDark ? 0.5 : 0.8} />
                        <stop offset="100%" stopColor={isDark ? "#123B39" : "#FEF3C7"} stopOpacity="0" />
                    </radialGradient>
                </defs>
                <rect x="0" y="0" width="480" height="480" fill="url(#pfs-sky)" />
                <rect x="0" y="0" width="480" height="480" fill="url(#pfs-sun)" />
                {isDark &&
                    stars.map((s) => (
                        <circle
                            key={s.id}
                            className="pfs-star"
                            cx={(s.cx / 100) * 480}
                            cy={(s.cy / 100) * 480}
                            r={s.r}
                            fill="#EAF4F2"
                            style={{ animationDuration: `${s.dur}s`, animationDelay: `${s.delay}s` }}
                        />
                    ))}
                <g fill="none" strokeLinecap="round" strokeWidth="2" style={{ stroke: accent, strokeOpacity: isDark ? 0.2 : 0.22 }}>
                    <path className="pfs-wind" style={{ animationDuration: "9s" }} d="M -20 240 C 90 222, 150 258, 260 238 S 470 220, 520 236" />
                    <path className="pfs-wind" style={{ animationDuration: "11s", animationDelay: "-3s" }} d="M -30 280 C 80 296, 170 266, 250 284 S 440 298, 520 278" />
                </g>
                <g className="pfs-cloud-a" opacity={isDark ? 0.45 : 0.85}>
                    <ellipse cx="110" cy="140" rx="110" ry="24" fill={isDark ? "#12222A" : "#FFFFFF"} />
                    <ellipse cx="188" cy="127" rx="72" ry="18" fill={isDark ? "#12222A" : "#FFFFFF"} />
                </g>
                <g className="pfs-cloud-b" opacity={isDark ? 0.35 : 0.65}>
                    <ellipse cx="340" cy="210" rx="130" ry="28" fill={isDark ? "#0E1B21" : "#FFFFFF"} />
                    <ellipse cx="412" cy="195" rx="66" ry="17" fill={isDark ? "#0E1B21" : "#FFFFFF"} />
                </g>
                {particles.map((p) => (
                    <circle
                        key={p.id}
                        className="pfs-particle"
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
 * Local UI pieces
 * ==========================================================================*/
const SectionCard: React.FC<{
    id?: string;
    title: string;
    description?: string;
    icon?: React.ReactNode;
    children: React.ReactNode;
    variant?: "default" | "danger";
}> = ({ id, title, description, icon, children, variant = "default" }) => {
    const danger = variant === "danger";
    return (
        <section
            id={id}
            aria-labelledby={id ? `${id}-title` : undefined}
            className={`rounded-2xl border backdrop-blur-md shadow-[0_18px_50px_-30px_rgba(9,30,34,0.35)] ${danger
                    ? "border-[color:var(--bc-danger)] bg-[color:var(--bc-danger-bg)]"
                    : "border-[color:var(--bc-border)] bg-[color:var(--bc-surface)]"
                }`}
        >
            <div className="px-5 pb-2 pt-5 sm:px-6">
                <div className="flex items-center gap-2.5">
                    {icon && (
                        <span
                            className={`flex h-8 w-8 items-center justify-center rounded-lg ${danger ? "bg-[color:var(--bc-danger)]/10 text-[color:var(--bc-danger)]" : "bg-[color:var(--bc-surface-2)] text-[color:var(--bc-accent-strong)]"
                                }`}
                            aria-hidden="true"
                        >
                            {icon}
                        </span>
                    )}
                    <h2
                        id={id ? `${id}-title` : undefined}
                        className={`pfs-display text-base font-semibold ${danger ? "text-[color:var(--bc-danger)]" : ""}`}
                    >
                        {title}
                    </h2>
                </div>
                {description && (
                    <p className={`mt-2 max-w-[60ch] text-sm leading-relaxed ${danger ? "text-[color:var(--bc-ink-soft)]" : "text-[color:var(--bc-ink-soft)]"}`}>
                        {description}
                    </p>
                )}
            </div>
            <div className="px-5 pb-5 sm:px-6">{children}</div>
        </section>
    );
};

const PasswordField: React.FC<{
    id: string;
    label: string;
    value: string;
    onChange: (v: string) => void;
    error?: string | null;
    autoComplete?: string;
    disabled?: boolean;
    describedBy?: string;
}> = ({ id, label, value, onChange, error, autoComplete, disabled, describedBy }) => {
    const [show, setShow] = useState(false);
    return (
        <div>
            <label htmlFor={id} className="mb-1.5 block text-xs font-semibold text-[color:var(--bc-ink)]">
                {label}
            </label>
            <div
                className={`flex items-center gap-2 rounded-lg border bg-[color:var(--bc-surface-2)] px-3 transition-colors focus-within:border-[color:var(--bc-accent)] focus-within:ring-2 focus-within:ring-[color:var(--bc-accent)]/20 ${error ? "border-[color:var(--bc-danger)]" : "border-[color:var(--bc-border)]"
                    }`}
            >
                <Lock size={14} className="shrink-0 text-[color:var(--bc-ink-faint)]" aria-hidden="true" />
                <input
                    id={id}
                    type={show ? "text" : "password"}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    autoComplete={autoComplete}
                    disabled={disabled}
                    aria-invalid={Boolean(error)}
                    aria-describedby={describedBy}
                    className="min-w-0 flex-1 bg-transparent py-2.5 text-sm text-[color:var(--bc-ink)] outline-none placeholder:text-[color:var(--bc-ink-faint)] disabled:opacity-60"
                    placeholder="••••••••"
                />
                <button
                    type="button"
                    onClick={() => setShow((s) => !s)}
                    aria-label={show ? `Hide ${label}` : `Show ${label}`}
                    aria-pressed={show}
                    className="shrink-0 rounded-md p-1 text-[color:var(--bc-ink-faint)] transition-colors hover:text-[color:var(--bc-ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--bc-accent)]"
                >
                    {show ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
            </div>
            {error && (
                <p id={`${id}-error`} className="mt-1.5 flex items-center gap-1 text-xs text-[color:var(--bc-danger)]" role="alert">
                    <AlertTriangle size={11} />
                    {error}
                </p>
            )}
        </div>
    );
};

const PasswordStrength: React.FC<{ password: string }> = ({ password }) => {
    const { score, level, met, missing } = evaluatePasswordStrength(password);
    if (password.length === 0) return null;
    const color =
        level === "strong"
            ? "bg-[color:var(--bc-success,#10B981)]"
            : level === "fair"
                ? "bg-[color:var(--bc-warn,#F59E0B)]"
                : "bg-[color:var(--bc-danger)]";
    const label =
        level === "strong" ? "Strong" : level === "fair" ? "Fair" : level === "weak" ? "Weak" : "Too short";

    return (
        <div className="mt-3">
            <div className="mb-2 flex items-center justify-between text-[11px]">
                <span className="font-semibold uppercase tracking-[0.08em] text-[color:var(--bc-ink-faint)]">
                    Strength
                </span>
                <span
                    className={`font-semibold ${level === "strong"
                            ? "text-[color:var(--bc-success,#10B981)]"
                            : level === "fair"
                                ? "text-[color:var(--bc-warn,#F59E0B)]"
                                : "text-[color:var(--bc-danger)]"
                        }`}
                >
                    {label}
                </span>
            </div>
            <div className="flex gap-1" aria-hidden="true">
                {[1, 2, 3, 4, 5].map((i) => (
                    <div
                        key={i}
                        className={`h-1 flex-1 rounded-full transition-all ${i <= score ? color : "bg-[color:var(--bc-track)]"}`}
                    />
                ))}
            </div>
            <ul className="mt-3 grid grid-cols-1 gap-1 text-[11px] sm:grid-cols-2">
                {[
                    ...met.map((m) => ({ m, ok: true })),
                    ...missing.map((m) => ({ m, ok: false })),
                ].map((item, i) => (
                    <li
                        key={i}
                        className={`flex items-center gap-1.5 ${item.ok ? "text-[color:var(--bc-success,#10B981)]" : "text-[color:var(--bc-ink-faint)]"
                            }`}
                    >
                        {item.ok ? <Check size={11} /> : <span className="inline-block h-1 w-1 rounded-full bg-current" aria-hidden="true" />}
                        {item.m}
                    </li>
                ))}
            </ul>
        </div>
    );
};

interface DeleteModalProps {
    open: boolean;
    busy: boolean;
    onConfirm: () => void;
    onClose: () => void;
}

const DeleteModal: React.FC<DeleteModalProps> = ({ open, busy, onConfirm, onClose }) => {
    const [typed, setTyped] = useState("");
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!open) {
            setTyped("");
            return;
        }
        // Focus input when dialog opens
        const id = window.setTimeout(() => inputRef.current?.focus(), 50);
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape" && !busy) onClose();
        };
        document.addEventListener("keydown", onKey);
        return () => {
            window.clearTimeout(id);
            document.removeEventListener("keydown", onKey);
        };
    }, [open, busy, onClose]);

    if (!open) return null;

    const canConfirm = typed === "DELETE" && !busy;

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-5">
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={() => !busy && onClose()}
                aria-hidden="true"
            />
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="pfs-delete-title"
                aria-describedby="pfs-delete-desc"
                className="pfs-rise relative w-full max-w-md rounded-2xl border border-[color:var(--bc-danger)] bg-[color:var(--bc-surface)] p-6 shadow-2xl backdrop-blur-xl"
            >
                <div className="mb-3 flex items-start gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[color:var(--bc-danger-bg)] text-[color:var(--bc-danger)]">
                        <AlertTriangle size={18} />
                    </span>
                    <div>
                        <h3 id="pfs-delete-title" className="pfs-display text-lg font-semibold text-[color:var(--bc-ink)]">
                            Permanently delete your account
                        </h3>
                        <p id="pfs-delete-desc" className="mt-1 text-sm leading-relaxed text-[color:var(--bc-ink-soft)]">
                            This action permanently removes your account and associated prediction and upload
                            history. This cannot be undone.
                        </p>
                    </div>
                </div>

                <div className="mt-5">
                    <label htmlFor="pfs-delete-confirm" className="mb-1.5 block text-xs font-semibold text-[color:var(--bc-ink)]">
                        Type <span className="font-mono text-[color:var(--bc-danger)]">DELETE</span> to confirm
                    </label>
                    <input
                        ref={inputRef}
                        id="pfs-delete-confirm"
                        type="text"
                        value={typed}
                        onChange={(e) => setTyped(e.target.value)}
                        disabled={busy}
                        autoComplete="off"
                        spellCheck={false}
                        className="w-full rounded-lg border border-[color:var(--bc-danger)] bg-transparent px-3 py-2.5 font-mono text-sm text-[color:var(--bc-ink)] outline-none transition-colors focus:ring-2 focus:ring-[color:var(--bc-danger)]/30 disabled:opacity-60"
                        placeholder="DELETE"
                    />
                </div>

                <div className="mt-6 flex justify-end gap-2">
                    <button
                        type="button"
                        disabled={busy}
                        onClick={onClose}
                        className="rounded-lg border border-[color:var(--bc-border)] px-4 py-2 text-sm font-semibold text-[color:var(--bc-ink-soft)] transition-colors hover:border-[color:var(--bc-border-strong)] hover:text-[color:var(--bc-ink)] disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--bc-accent)]"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        disabled={!canConfirm}
                        onClick={onConfirm}
                        aria-busy={busy}
                        className="inline-flex items-center gap-2 rounded-lg bg-[color:var(--bc-danger)] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--bc-danger)]"
                    >
                        {busy && <Loader2 size={15} className="animate-spin" />}
                        {busy ? "Deleting account..." : "Delete Account"}
                    </button>
                </div>
            </div>
        </div>
    );
};

/* ============================================================================
 * Page
 * ==========================================================================*/
const ProfileSettings: React.FC = () => {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const mode = useAppSelector((state) => state.theme.mode);
    const isDark = mode === "dark";

    // TODO: adjust selector to match your profileSlice state shape.
    const {
        profile,
        loading,
        updatingName,
        updatingUsername,
        settingPassword,
        changingPassword,
        deletingAccount,
        updateError,
    } = useAppSelector((state) => (state as unknown as { profile: ProfileSliceState }).profile);

    const user: ProfileUser | null = profile?.user ?? null;
    const hasPassword = user?.has_password ?? false;

    useSEO(
        `Account Settings | ${companyName}`,
        `Manage your ${companyName} account — edit your name, username, sign-in password, and privacy preferences.`
    );
    useGoogleFont("Fraunces");
    useGoogleFont("Plus Jakarta Sans");

    /* ---- local edit state ---- */
    const [editingName, setEditingName] = useState(false);
    const [draftName, setDraftName] = useState("");
    const [nameError, setNameError] = useState<string | null>(null);

    const [editingUsername, setEditingUsername] = useState(false);
    const [draftUsername, setDraftUsername] = useState("");
    const [usernameError, setUsernameError] = useState<string | null>(null);

    /* ---- password form state ---- */
    const [currentPw, setCurrentPw] = useState("");
    const [newPw, setNewPw] = useState("");
    const [confirmPw, setConfirmPw] = useState("");
    const [pwErrors, setPwErrors] = useState<{ current?: string; newPw?: string; confirm?: string }>({});

    /* ---- delete dialog ---- */
    const [deleteOpen, setDeleteOpen] = useState(false);

    /* ---- initial load ---- */
    useEffect(() => {
        if (!profile) dispatch(fetchProfile());
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    /* ---- backend update error toast (deduplicated) ---- */
    const lastUpdateErrorRef = useRef<string | null>(null);
    useEffect(() => {
        if (updateError && updateError !== lastUpdateErrorRef.current) {
            toast.error(updateError);
            lastUpdateErrorRef.current = updateError;
        }
        if (!updateError) lastUpdateErrorRef.current = null;
    }, [updateError]);

    /* ---- derived ---- */
    const initials = getInitials(user?.fullname, user?.username);
    const savedUsernameBody = (user?.username ?? "").replace(/^@/, "");

    /* ======================================================================
     * Name handlers
     * ====================================================================*/
    const openNameEdit = () => {
        setDraftName(user?.fullname ?? "");
        setNameError(null);
        setEditingName(true);
    };
    const cancelNameEdit = () => {
        setEditingName(false);
        setDraftName("");
        setNameError(null);
    };
    const saveName = async () => {
        const trimmed = draftName.trim();
        if (!trimmed) {
            setNameError("Full name is required.");
            return;
        }
        if (trimmed.length > 100) {
            setNameError("Name must be 100 characters or fewer.");
            return;
        }
        setNameError(null);
        const res = await dispatch(updateProfileName(trimmed));
        if (updateProfileName.fulfilled.match(res)) {
            toast.success("Name updated.");
            setEditingName(false);
            setDraftName("");
        } else {
            setNameError(asMessage(res.payload) ?? "Unable to update name.");
        }
    };

    /* ======================================================================
     * Username handlers
     * ====================================================================*/
    const openUsernameEdit = () => {
        setDraftUsername(savedUsernameBody);
        setUsernameError(null);
        setEditingUsername(true);
    };
    const cancelUsernameEdit = () => {
        setEditingUsername(false);
        setDraftUsername("");
        setUsernameError(null);
    };
    const handleUsernameChange = (raw: string) => {
        const sanitized = sanitizeUsername(raw);
        setDraftUsername(sanitized);
        if (usernameError) setUsernameError(null);
    };
    const saveUsername = async () => {
        if (!draftUsername) {
            setUsernameError("Username is required.");
            return;
        }
        if (!USERNAME_REGEX.test(draftUsername)) {
            setUsernameError("2–49 characters: letters, numbers, and underscores only.");
            return;
        }
        setUsernameError(null);
        const res = await dispatch(updateProfileUsername(draftUsername));
        if (updateProfileUsername.fulfilled.match(res)) {
            toast.success("Username updated.");
            setEditingUsername(false);
            setDraftUsername("");
        } else {
            setUsernameError(asMessage(res.payload) ?? "Unable to update username.");
        }
    };

    /* ======================================================================
     * Password handlers (Set vs Change)
     * ====================================================================*/
    const resetPasswordForm = () => {
        setCurrentPw("");
        setNewPw("");
        setConfirmPw("");
        setPwErrors({});
    };

    const validatePasswordCommon = (): boolean => {
        const next: typeof pwErrors = {};
        if (!PASSWORD_REGEX.test(newPw)) {
            next.newPw = "Must be 8+ chars with uppercase, lowercase, number, and special character.";
        }
        if (confirmPw !== newPw) {
            next.confirm = "Passwords do not match.";
        }
        setPwErrors(next);
        return Object.keys(next).length === 0;
    };

    const submitSetPassword = async () => {
        if (!newPw) {
            setPwErrors({ newPw: "Password is required." });
            return;
        }
        if (!validatePasswordCommon()) return;
        const res = await dispatch(setProfilePassword(newPw));
        if (setProfilePassword.fulfilled.match(res)) {
            toast.success("Password added. You can now sign in with email + password.");
            resetPasswordForm();
            // Refresh profile so has_password flips to true in Redux
            dispatch(fetchProfile());
        } else {
            const msg = asMessage(res.payload) ?? "Unable to set password.";
            toast.error(msg);
            setPwErrors({ newPw: msg });
        }
    };

    const submitChangePassword = async () => {
        const next: typeof pwErrors = {};
        if (!currentPw) next.current = "Current password is required.";
        setPwErrors(next);
        if (Object.keys(next).length > 0) return;
        if (!validatePasswordCommon()) return;
        const res = await dispatch(changeProfilePassword({ currentPassword: currentPw, newPassword: newPw }));
        if (changeProfilePassword.fulfilled.match(res)) {
            toast.success("Password changed successfully.");
            resetPasswordForm();
        } else {
            const msg = asMessage(res.payload) ?? "Unable to change password.";
            toast.error(msg);
            setPwErrors({ current: msg });
        }
    };

    /* ======================================================================
     * Delete account
     * ====================================================================*/
    const handleDeleteConfirm = async () => {
        if (deletingAccount) return;
        const res = await dispatch(deleteProfileAccount());
        if (deleteProfileAccount.fulfilled.match(res)) {
            toast.success("Your account has been deleted.");
            setDeleteOpen(false);
            navigate("/"); // TODO: adjust to your public route
        } else {
            toast.error(asMessage(res.payload) ?? "Unable to delete your account.");
        }
    };

    /* ======================================================================
     * Common styles
     * ====================================================================*/
    const inputShell =
        "w-full rounded-lg border border-[color:var(--bc-border)] bg-[color:var(--bc-surface-2)] px-3 py-2.5 text-sm text-[color:var(--bc-ink)] outline-none transition-colors focus:border-[color:var(--bc-accent)] focus:ring-2 focus:ring-[color:var(--bc-accent)]/20 disabled:opacity-60";

    return (
        <div
            className="pfs-root relative min-h-screen bg-[color:var(--bc-bg)] text-[color:var(--bc-ink)] transition-colors duration-500"
            data-theme={isDark ? "dark" : "day"}
        >
            <style>{`
                .pfs-root {
                    --bc-font-display: 'Fraunces', 'Georgia', serif;
                    --bc-font-body: 'Plus Jakarta Sans', 'Inter', system-ui, sans-serif;
                    font-family: var(--bc-font-body);
                }
                .pfs-root[data-theme='day'] {
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
                .pfs-root[data-theme='dark'] {
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
                .pfs-display { font-family: var(--bc-font-display); }

                @keyframes pfs-float { 0%, 100% { transform: translate3d(0,0,0); opacity: 0.4; } 50% { transform: translate3d(0,-11px,0); opacity: 0.8; } }
                @keyframes pfs-wind-flow { from { stroke-dashoffset: 240; } to { stroke-dashoffset: 0; } }
                @keyframes pfs-twinkle { 0%, 100% { opacity: 0.12; } 50% { opacity: 0.7; } }
                @keyframes pfs-drift { from { transform: translate3d(-5%, 0, 0); } to { transform: translate3d(5%, 0, 0); } }
                @keyframes pfs-drift-slow { from { transform: translate3d(-3.5%, 0, 0); } to { transform: translate3d(4%, 0, 0); } }
                @keyframes pfs-rise { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }

                .pfs-particle { animation: pfs-float ease-in-out infinite; transform-box: fill-box; transform-origin: center; }
                .pfs-wind { stroke-dasharray: 8 14; animation: pfs-wind-flow linear infinite; }
                .pfs-star { animation: pfs-twinkle ease-in-out infinite; transform-box: fill-box; transform-origin: center; }
                .pfs-cloud-a { animation: pfs-drift 60s ease-in-out infinite alternate; }
                .pfs-cloud-b { animation: pfs-drift-slow 78s ease-in-out infinite alternate; }
                .pfs-rise { animation: pfs-rise 0.4s cubic-bezier(0.16, 1, 0.3, 1) both; }

                @media (prefers-reduced-motion: reduce) {
                    .pfs-particle, .pfs-wind, .pfs-star, .pfs-cloud-a, .pfs-cloud-b, .pfs-rise { animation: none !important; }
                }
            `}</style>

            <CalmAtmosphere isDark={isDark} />

            <div className="relative z-10 flex min-h-screen flex-col">
                <Navbar />

                <main className="mx-auto w-full max-w-[1160px] flex-1 px-5 pb-20 sm:px-8">
                    {/* ================= Page header ================= */}
                    <div className="pt-6 sm:pt-8">
                        <Link
                            to="/profile"
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[color:var(--bc-ink-faint)] transition-colors hover:text-[color:var(--bc-ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--bc-accent)]"
                        >
                            <ArrowLeft size={13} />
                            Back to Profile
                        </Link>
                        <div className="mt-3">
                            <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-[color:var(--bc-accent-strong)]">
                                Account Management
                            </p>
                            <h1 className="pfs-display text-2xl font-semibold leading-tight sm:text-3xl">
                                Account Settings
                            </h1>
                            <p className="mt-1.5 max-w-[60ch] text-sm leading-relaxed text-[color:var(--bc-ink-soft)]">
                                Manage your identity, sign-in options, and account preferences inside {companyName}.
                            </p>
                        </div>
                    </div>

                    {loading && !profile ? (
                        <div className="mt-8 grid gap-5 lg:grid-cols-12">
                            <div className="rounded-2xl border border-[color:var(--bc-border)] bg-[color:var(--bc-surface)] p-6 lg:col-span-4">
                                <div className="h-20 w-20 animate-pulse rounded-2xl bg-[color:var(--bc-track)]" aria-hidden="true" />
                                <div className="mt-4 h-5 w-3/4 animate-pulse rounded-md bg-[color:var(--bc-track)]" aria-hidden="true" />
                                <div className="mt-2 h-4 w-1/2 animate-pulse rounded-md bg-[color:var(--bc-track)]" aria-hidden="true" />
                            </div>
                            <div className="space-y-5 lg:col-span-8">
                                {[1, 2, 3].map((i) => (
                                    <div key={i} className="h-32 animate-pulse rounded-2xl border border-[color:var(--bc-border)] bg-[color:var(--bc-surface)]" aria-hidden="true" />
                                ))}
                            </div>
                        </div>
                    ) : !profile ? (
                        <div className="mt-10 rounded-2xl border border-[color:var(--bc-border)] bg-[color:var(--bc-surface)] p-10 text-center">
                            <p className="text-sm text-[color:var(--bc-ink-soft)]">Unable to load your account information.</p>
                            <button
                                type="button"
                                onClick={() => dispatch(fetchProfile())}
                                className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-[color:var(--bc-accent-strong)] px-4 py-2 text-sm font-semibold text-[#F4FBF9] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--bc-accent)]"
                            >
                                Retry
                            </button>
                        </div>
                    ) : (
                        <div className="mt-8 grid gap-5 lg:grid-cols-12">
                            {/* ================= Identity sidebar ================= */}
                            <aside className="lg:col-span-4">
                                <div className="lg:sticky lg:top-24">
                                    <div className="overflow-hidden rounded-2xl border border-[color:var(--bc-border)] bg-[color:var(--bc-surface)] shadow-[0_18px_50px_-30px_rgba(9,30,34,0.35)] backdrop-blur-md">
                                        <div className="h-20" style={{ background: "linear-gradient(120deg, var(--bc-grad-1), var(--bc-grad-2))" }} />
                                        <div className="-mt-10 px-6 pb-6">
                                            <div
                                                className="pfs-display flex h-20 w-20 items-center justify-center rounded-2xl text-2xl font-semibold text-[#F4FBF9] ring-4 ring-[color:var(--bc-surface)]"
                                                style={{ background: "linear-gradient(135deg, var(--bc-accent), var(--bc-accent-strong))" }}
                                                aria-hidden="true"
                                            >
                                                {initials}
                                            </div>
                                            <h2 className="pfs-display mt-4 text-xl font-semibold leading-tight">
                                                {user?.fullname || user?.username || "Your account"}
                                            </h2>
                                            <p className="mt-1 inline-flex items-center gap-1.5 text-sm font-semibold text-[color:var(--bc-accent-strong)]">
                                                {user?.username ?? "—"}
                                            </p>
                                            <dl className="mt-5 space-y-3 border-t border-[color:var(--bc-border)] pt-5 text-sm">
                                                <div className="flex items-center gap-2.5">
                                                    <Mail size={14} className="text-[color:var(--bc-ink-faint)]" aria-hidden="true" />
                                                    <div className="min-w-0">
                                                        <dt className="text-[10px] font-bold uppercase tracking-[0.06em] text-[color:var(--bc-ink-faint)]">Email</dt>
                                                        <dd className="truncate font-medium">{user?.email ?? "—"}</dd>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2.5">
                                                    <CalendarDays size={14} className="text-[color:var(--bc-ink-faint)]" aria-hidden="true" />
                                                    <div className="min-w-0">
                                                        <dt className="text-[10px] font-bold uppercase tracking-[0.06em] text-[color:var(--bc-ink-faint)]">Member since</dt>
                                                        <dd className="font-medium">
                                                            {user?.created_at ? formatMemberSince(user.created_at) : "—"}
                                                        </dd>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2.5">
                                                    {hasPassword ? (
                                                        <KeyRound size={14} className="text-[color:var(--bc-ink-faint)]" aria-hidden="true" />
                                                    ) : (
                                                        <LogIn size={14} className="text-[color:var(--bc-ink-faint)]" aria-hidden="true" />
                                                    )}
                                                    <div className="min-w-0">
                                                        <dt className="text-[10px] font-bold uppercase tracking-[0.06em] text-[color:var(--bc-ink-faint)]">Sign-in</dt>
                                                        <dd className="font-medium">{hasPassword ? "Password enabled" : "Google sign-in"}</dd>
                                                    </div>
                                                </div>
                                            </dl>
                                        </div>
                                    </div>

                                    {/* Legal */}
                                    <div className="mt-4 rounded-2xl border border-[color:var(--bc-border)] bg-[color:var(--bc-surface)] px-5 py-4 backdrop-blur-md">
                                        <p className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.08em] text-[color:var(--bc-ink-faint)]">
                                            <ScrollText size={12} />
                                            Legal
                                        </p>
                                        <ul className="space-y-2 text-sm">
                                            <li>
                                                <Link
                                                    to="/privacy-policy"
                                                    className="inline-flex items-center gap-2 font-medium text-[color:var(--bc-ink-soft)] transition-colors hover:text-[color:var(--bc-accent-strong)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--bc-accent)]"
                                                >
                                                    <Lock size={13} aria-hidden="true" />
                                                    Privacy Policy
                                                </Link>
                                            </li>
                                            <li>
                                                <Link
                                                    to="/terms-and-conditions"
                                                    className="inline-flex items-center gap-2 font-medium text-[color:var(--bc-ink-soft)] transition-colors hover:text-[color:var(--bc-accent-strong)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--bc-accent)]"
                                                >
                                                    <ScrollText size={13} aria-hidden="true" />
                                                    Terms &amp; Conditions
                                                </Link>
                                            </li>
                                        </ul>
                                    </div>
                                </div>
                            </aside>

                            {/* ================= Main column ================= */}
                            <div className="space-y-5 lg:col-span-8">
                                {/* -------- Profile Information -------- */}
                                <SectionCard
                                    id="profile-info"
                                    title="Profile Information"
                                    description="The details shown on your public-facing account card."
                                    icon={<UserIcon size={15} />}
                                >
                                    {/* Full Name */}
                                    <div className="rounded-xl border border-[color:var(--bc-border)] bg-[color:var(--bc-surface-2)] p-4">
                                        <div className="mb-2 flex items-center justify-between gap-3">
                                            <label htmlFor="ps-fullname" className="text-[10px] font-bold uppercase tracking-[0.06em] text-[color:var(--bc-ink-faint)]">
                                                Full Name
                                            </label>
                                            {!editingName && (
                                                <button
                                                    type="button"
                                                    onClick={openNameEdit}
                                                    className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-[color:var(--bc-accent-strong)] transition-colors hover:bg-[color:var(--bc-surface)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--bc-accent)]"
                                                >
                                                    <Pencil size={12} />
                                                    Edit
                                                </button>
                                            )}
                                        </div>
                                        {editingName ? (
                                            <div className="pfs-rise">
                                                <input
                                                    id="ps-fullname"
                                                    type="text"
                                                    value={draftName}
                                                    onChange={(e) => {
                                                        setDraftName(e.target.value);
                                                        if (nameError) setNameError(null);
                                                    }}
                                                    maxLength={100}
                                                    disabled={updatingName}
                                                    aria-invalid={Boolean(nameError)}
                                                    aria-describedby={nameError ? "ps-name-error" : undefined}
                                                    className={`${inputShell} ${nameError ? "border-[color:var(--bc-danger)]" : ""}`}
                                                    placeholder="Your full name"
                                                    onKeyDown={(e) => {
                                                        if (e.key === "Enter") { e.preventDefault(); void saveName(); }
                                                        if (e.key === "Escape") cancelNameEdit();
                                                    }}
                                                />
                                                {nameError && (
                                                    <p id="ps-name-error" className="mt-1.5 flex items-center gap-1 text-xs text-[color:var(--bc-danger)]" role="alert">
                                                        <AlertTriangle size={11} />
                                                        {nameError}
                                                    </p>
                                                )}
                                                <div className="mt-3 flex items-center justify-end gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={cancelNameEdit}
                                                        disabled={updatingName}
                                                        className="rounded-lg border border-[color:var(--bc-border)] px-3 py-1.5 text-xs font-semibold text-[color:var(--bc-ink-soft)] transition-colors hover:text-[color:var(--bc-ink)] disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--bc-accent)]"
                                                    >
                                                        Cancel
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => void saveName()}
                                                        disabled={updatingName}
                                                        aria-busy={updatingName}
                                                        className="inline-flex items-center gap-1.5 rounded-lg bg-[color:var(--bc-accent-strong)] px-3.5 py-1.5 text-xs font-semibold text-[#F4FBF9] transition-opacity hover:opacity-90 disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--bc-accent)]"
                                                    >
                                                        {updatingName ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                                                        {updatingName ? "Saving..." : "Save"}
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <p id="ps-fullname" className="truncate text-sm font-medium text-[color:var(--bc-ink)]">
                                                {user?.fullname || <span className="text-[color:var(--bc-ink-faint)]">Not set — tap Edit to add one.</span>}
                                            </p>
                                        )}
                                    </div>

                                    {/* Username */}
                                    <div className="mt-3 rounded-xl border border-[color:var(--bc-border)] bg-[color:var(--bc-surface-2)] p-4">
                                        <div className="mb-2 flex items-center justify-between gap-3">
                                            <label htmlFor="ps-username" className="text-[10px] font-bold uppercase tracking-[0.06em] text-[color:var(--bc-ink-faint)]">
                                                Username
                                            </label>
                                            {!editingUsername && (
                                                <button
                                                    type="button"
                                                    onClick={openUsernameEdit}
                                                    className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-[color:var(--bc-accent-strong)] transition-colors hover:bg-[color:var(--bc-surface)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--bc-accent)]"
                                                >
                                                    <Pencil size={12} />
                                                    Edit
                                                </button>
                                            )}
                                        </div>
                                        {editingUsername ? (
                                            <div className="pfs-rise">
                                                <div
                                                    className={`flex items-stretch overflow-hidden rounded-lg border bg-[color:var(--bc-surface-2)] focus-within:border-[color:var(--bc-accent)] focus-within:ring-2 focus-within:ring-[color:var(--bc-accent)]/20 ${usernameError ? "border-[color:var(--bc-danger)]" : "border-[color:var(--bc-border)]"
                                                        }`}
                                                >
                                                    <span className="flex items-center justify-center border-r border-[color:var(--bc-border)] bg-[color:var(--bc-surface)] px-3 text-sm font-semibold text-[color:var(--bc-accent-strong)]">
                                                        @
                                                    </span>
                                                    <input
                                                        id="ps-username"
                                                        type="text"
                                                        inputMode="text"
                                                        autoCapitalize="none"
                                                        autoCorrect="off"
                                                        spellCheck={false}
                                                        value={draftUsername}
                                                        onChange={(e) => handleUsernameChange(e.target.value)}
                                                        disabled={updatingUsername}
                                                        aria-invalid={Boolean(usernameError)}
                                                        aria-describedby="ps-username-hint ps-username-error"
                                                        className="min-w-0 flex-1 bg-transparent py-2.5 pr-3 text-sm text-[color:var(--bc-ink)] outline-none placeholder:text-[color:var(--bc-ink-faint)] disabled:opacity-60"
                                                        placeholder="your_username"
                                                        onKeyDown={(e) => {
                                                            if (e.key === "Enter") { e.preventDefault(); void saveUsername(); }
                                                            if (e.key === "Escape") cancelUsernameEdit();
                                                        }}
                                                    />
                                                </div>
                                                <p id="ps-username-hint" className="mt-1.5 text-[11px] text-[color:var(--bc-ink-faint)]">
                                                    2–49 characters · letters, numbers, and underscores only.
                                                </p>
                                                {usernameError && (
                                                    <p id="ps-username-error" className="mt-1 flex items-center gap-1 text-xs text-[color:var(--bc-danger)]" role="alert">
                                                        <AlertTriangle size={11} />
                                                        {usernameError}
                                                    </p>
                                                )}
                                                <div className="mt-3 flex items-center justify-end gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={cancelUsernameEdit}
                                                        disabled={updatingUsername}
                                                        className="rounded-lg border border-[color:var(--bc-border)] px-3 py-1.5 text-xs font-semibold text-[color:var(--bc-ink-soft)] transition-colors hover:text-[color:var(--bc-ink)] disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--bc-accent)]"
                                                    >
                                                        Cancel
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => void saveUsername()}
                                                        disabled={updatingUsername}
                                                        aria-busy={updatingUsername}
                                                        className="inline-flex items-center gap-1.5 rounded-lg bg-[color:var(--bc-accent-strong)] px-3.5 py-1.5 text-xs font-semibold text-[#F4FBF9] transition-opacity hover:opacity-90 disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--bc-accent)]"
                                                    >
                                                        {updatingUsername ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                                                        {updatingUsername ? "Saving..." : "Save"}
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <p className="truncate text-sm font-medium text-[color:var(--bc-ink)]">
                                                @{user?.username?.replace(/^@/, "") ?? <span className="text-[color:var(--bc-ink-faint)]">Not set</span>}
                                            </p>
                                        )}
                                    </div>

                                    {/* Email — read-only */}
                                    <div className="mt-3 rounded-xl border border-[color:var(--bc-border)] bg-[color:var(--bc-surface-2)] p-4">
                                        <div className="mb-2 flex items-center justify-between gap-3">
                                            <label htmlFor="ps-email" className="text-[10px] font-bold uppercase tracking-[0.06em] text-[color:var(--bc-ink-faint)]">
                                                Email
                                            </label>
                                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.06em] text-[color:var(--bc-ink-faint)]">
                                                <Lock size={10} aria-hidden="true" />
                                                Read-only
                                            </span>
                                        </div>
                                        <p id="ps-email" className="truncate text-sm font-medium text-[color:var(--bc-ink)]">
                                            {user?.email ?? "—"}
                                        </p>
                                        <p className="mt-1 flex items-center gap-1.5 text-[11px] text-[color:var(--bc-ink-faint)]">
                                            <Info size={11} aria-hidden="true" />
                                            Email changes are currently unavailable.
                                        </p>
                                    </div>
                                </SectionCard>

                                {/* -------- Security / Password -------- */}
                                <SectionCard
                                    id="security"
                                    title={hasPassword ? "Change Password" : "Set Password"}
                                    description={
                                        hasPassword
                                            ? "Password sign-in is enabled for this account. Choose a new password to replace your current one."
                                            : "You're currently using Google sign-in. Add a password to enable password-based sign-in as an additional option."
                                    }
                                    icon={<ShieldCheck size={15} />}
                                >
                                    <div className="space-y-4">
                                        {hasPassword && (
                                            <PasswordField
                                                id="ps-current-pw"
                                                label="Current Password"
                                                value={currentPw}
                                                onChange={(v) => {
                                                    setCurrentPw(v);
                                                    if (pwErrors.current) setPwErrors((p) => ({ ...p, current: undefined }));
                                                }}
                                                error={pwErrors.current}
                                                autoComplete="current-password"
                                                disabled={changingPassword}
                                            />
                                        )}
                                        <PasswordField
                                            id="ps-new-pw"
                                            label={hasPassword ? "New Password" : "Password"}
                                            value={newPw}
                                            onChange={(v) => {
                                                setNewPw(v);
                                                if (pwErrors.newPw) setPwErrors((p) => ({ ...p, newPw: undefined }));
                                            }}
                                            error={pwErrors.newPw}
                                            autoComplete={hasPassword ? "new-password" : "new-password"}
                                            disabled={hasPassword ? changingPassword : settingPassword}
                                        />
                                        <PasswordStrength password={newPw} />
                                        <PasswordField
                                            id="ps-confirm-pw"
                                            label="Confirm Password"
                                            value={confirmPw}
                                            onChange={(v) => {
                                                setConfirmPw(v);
                                                if (pwErrors.confirm) setPwErrors((p) => ({ ...p, confirm: undefined }));
                                            }}
                                            error={pwErrors.confirm}
                                            autoComplete="new-password"
                                            disabled={hasPassword ? changingPassword : settingPassword}
                                        />

                                        <div className="flex items-center justify-end pt-2">
                                            <button
                                                type="button"
                                                onClick={() => (hasPassword ? void submitChangePassword() : void submitSetPassword())}
                                                disabled={hasPassword ? changingPassword : settingPassword}
                                                aria-busy={hasPassword ? changingPassword : settingPassword}
                                                className="inline-flex items-center gap-2 rounded-lg bg-[color:var(--bc-accent-strong)] px-4 py-2.5 text-sm font-semibold text-[#F4FBF9] transition-opacity hover:opacity-90 disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--bc-accent)]"
                                            >
                                                {(hasPassword ? changingPassword : settingPassword) && (
                                                    <Loader2 size={14} className="animate-spin" />
                                                )}
                                                {hasPassword
                                                    ? changingPassword
                                                        ? "Updating..."
                                                        : "Update Password"
                                                    : settingPassword
                                                        ? "Saving..."
                                                        : "Set Password"}
                                            </button>
                                        </div>
                                    </div>
                                </SectionCard>

                                {/* -------- Danger Zone -------- */}
                                <SectionCard
                                    id="danger"
                                    title="Danger Zone"
                                    description="Permanently remove your account and associated data. This action cannot be undone."
                                    icon={<Trash2 size={15} />}
                                    variant="danger"
                                >
                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                        <p className="text-xs leading-relaxed text-[color:var(--bc-ink-soft)]">
                                            Once deleted, your prediction and upload history cannot be recovered.
                                        </p>
                                        <button
                                            type="button"
                                            onClick={() => setDeleteOpen(true)}
                                            disabled={deletingAccount}
                                            className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-[color:var(--bc-danger)] bg-transparent px-4 py-2.5 text-sm font-semibold text-[color:var(--bc-danger)] transition-colors hover:bg-[color:var(--bc-danger-bg)] disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--bc-danger)]"
                                        >
                                            <Trash2 size={14} />
                                            Delete Account
                                        </button>
                                    </div>
                                </SectionCard>
                            </div>
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

export default ProfileSettings;