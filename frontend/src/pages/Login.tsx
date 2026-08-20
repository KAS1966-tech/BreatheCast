import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { GoogleLogin, type CredentialResponse } from "@react-oauth/google";
import toast from "react-hot-toast";
import {
    Mail,
    Lock,
    Eye,
    EyeOff,
    Loader2,
    ArrowRight,
    AlertCircle,
    Sun,
    Moon,
    Wind,
} from "lucide-react";

// TODO: adjust to your project's actual paths -----------------------------
import { login, googleLogin } from "../app/features/auth/authSlice"; // existing thunks, not recreated
import { companyName } from "../core/config"; // existing companyName export
import { useSEO } from "../utils/useSeo"; // existing SEO hook
import { useGoogleFont } from "../utils/useGoogleFont"; // existing font loader
import { useAppDispatch, useAppSelector } from "../app/redux";
import { toggleTheme } from "../app/features/theme/themeSlice";
// ---------------------------------------------------------------------------

interface FieldErrors {
    email?: string;
    password?: string;
}

const EMAIL_PATTERN = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

const Login: React.FC = () => {
    const navigate = useNavigate();
    const dispatch = useAppDispatch();

    // Existing Redux auth state — not duplicated locally.
    const {
        loginLoading,
        loginError,
        loading: googleLoading,
        error: googleError,
    } = useAppSelector((state) => state.auth);
    const { mode } = useAppSelector((state) => state.theme);
    const instanceId = useId();

    useSEO(
        `Sign in — ${companyName}`,
        `Sign in to ${companyName} to track live air quality, weather intelligence, and personalized environmental alerts.`,
    );
    useGoogleFont("Fraunces");
    useGoogleFont("Plus Jakarta Sans");

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [errors, setErrors] = useState<FieldErrors>({});
    const [touched, setTouched] = useState<{
        email?: boolean;
        password?: boolean;
    }>({});
    const [submitAttempted, setSubmitAttempted] = useState(false);

    useEffect(() => {
        document.documentElement.setAttribute("data-breathecast-theme", mode);
        window.localStorage.setItem("breathecast-theme", mode);
    }, [mode]);

    // Surface backend errors as a single toast, not one per render.
    const lastLoginErrorRef = useRef<string | null>(null);
    useEffect(() => {
        if (loginError && loginError !== lastLoginErrorRef.current) {
            toast.error(loginError);
            lastLoginErrorRef.current = loginError;
        }
        if (!loginError) lastLoginErrorRef.current = null;
    }, [loginError]);

    const lastGoogleErrorRef = useRef<string | null>(null);
    useEffect(() => {
        if (googleError && googleError !== lastGoogleErrorRef.current) {
            toast.error(googleError);
            lastGoogleErrorRef.current = googleError;
        }
        if (!googleError) lastGoogleErrorRef.current = null;
    }, [googleError]);

    const validate = (values: {
        email: string;
        password: string;
    }): FieldErrors => {
        const next: FieldErrors = {};
        if (!values.email.trim()) {
            next.email = "Enter your email address.";
        } else if (!EMAIL_PATTERN.test(values.email.trim())) {
            next.email = "Enter a valid email address.";
        }
        if (!values.password) {
            next.password = "Enter your password.";
        }
        return next;
    };

    useCallback(() => {
        if (submitAttempted) {
            setErrors(validate({ email, password }));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [email, password]);

    const handleBlur = (field: "email" | "password") => {
        setTouched((prev) => ({ ...prev, [field]: true }));
        setErrors(validate({ email, password }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitAttempted(true);
        const nextErrors = validate({ email, password });
        setErrors(nextErrors);
        if (Object.keys(nextErrors).length > 0) {
            setTouched({ email: true, password: true });
            return;
        }

        try {
            // Existing thunk handles the API call; UI only reacts to the result.
            await dispatch(login({ email: email.trim(), password })).unwrap();
            toast.success(`Welcome back to ${companyName}.`);
            navigate("/home");
        } catch {
            // loginError from the slice drives the toast/inline message above;
            // nothing further to do here.
        }
    };

    const handleGoogleSuccess = async (
        credentialResponse: CredentialResponse,
    ) => {
        if (!credentialResponse.credential) {
            toast.error(
                "Google sign-in didn't return a credential. Please try again.",
            );
            return;
        }
        try {
            await dispatch(googleLogin(credentialResponse.credential)).unwrap();
            toast.success(`Welcome back to ${companyName}.`);
            navigate("/home");
        } catch {
            // googleError drives the toast above.
        }
    };

    const handleGoogleError = () => {
        toast.error("Google sign-in failed. Please try again.");
    };

    const emailInvalid = Boolean(touched.email && errors.email);
    const passwordInvalid = Boolean(touched.password && errors.password);
    const isBusy = loginLoading || googleLoading;

    const particles = useMemo(
        () =>
            Array.from({ length: 10 }, (_, i) => ({
                id: i,
                cx: 8 + ((i * 37) % 84),
                cy: 12 + ((i * 53) % 76),
                r: 1.4 + (i % 3) * 0.6,
                dur: 14 + (i % 5) * 3,
                delay: -(i * 2.1),
            })),
        [],
    );

    const stars = useMemo(
        () =>
            Array.from({ length: 22 }, (_, i) => ({
                id: i,
                cx: (i * 41) % 100,
                cy: (i * 29) % 62,
                r: 0.5 + (i % 3) * 0.35,
                delay: -(i * 1.3),
                dur: 3 + (i % 4),
            })),
        [],
    );

    return (
        <div className="bc-root" data-theme={mode}>
            <style>{`
        .bc-root {
          --bc-radius: 18px;
          --bc-radius-sm: 10px;
          --bc-font-display: 'Fraunces', 'Georgia', serif;
          --bc-font-body: 'Plus Jakarta Sans', 'Inter', system-ui, sans-serif;
          --bc-shadow: 0 20px 60px -25px rgba(9, 30, 34, 0.35);
          min-height: 100vh;
          width: 100%;
          font-family: var(--bc-font-body);
        }
        
        /* ✨ UPDATED FRESH "CLEAN AIR" DAY THEME ✨ */
        .bc-root[data-theme='day'] {
          --bc-bg: #F8FAFC;
          --bc-panel: #F0FDF4;
          --bc-panel-2: #DCFCE7;
          --bc-surface: #FFFFFF;
          --bc-ink: #0F2827;
          --bc-ink-soft: #4A6665;
          --bc-ink-faint: #8DA3A2;
          --bc-accent: #10B981;
          --bc-accent-strong: #059669;
          --bc-accent-2: #F59E0B;
          --bc-border: rgba(16, 185, 129, 0.15);
          --bc-border-strong: rgba(16, 185, 129, 0.35);
          --bc-danger: #DC2626;
          --bc-danger-bg: rgba(220, 38, 38, 0.08);
          --bc-focus-ring: rgba(16, 185, 129, 0.35);
        }
        
        /* Dark theme remains exactly as it was */
        .bc-root[data-theme='dark'] {
          --bc-bg: #0A1418;
          --bc-panel: #071013;
          --bc-panel-2: #0C1A1E;
          --bc-surface: #101C21;
          --bc-ink: #E7F1F0;
          --bc-ink-soft: #93ACB0;
          --bc-ink-faint: #5E767B;
          --bc-accent: #4FD8C4;
          --bc-accent-strong: #7EE9DA;
          --bc-accent-2: #F0B65E;
          --bc-border: rgba(231, 241, 240, 0.12);
          --bc-border-strong: rgba(231, 241, 240, 0.22);
          --bc-danger: #FF6B57;
          --bc-danger-bg: rgba(255, 107, 87, 0.1);
          --bc-focus-ring: rgba(79, 216, 196, 0.4);
        }

        .bc-shell {
          min-height: 100vh;
          display: grid;
          grid-template-columns: 1fr;
          background: var(--bc-bg);
          color: var(--bc-ink);
          transition: background 0.4s ease, color 0.4s ease;
        }
        @media (min-width: 960px) {
          .bc-shell { grid-template-columns: minmax(0, 5fr) minmax(0, 4fr); }
        }

        /* ---------- Atmospheric panel ---------- */
        .bc-scene {
          position: relative;
          overflow: hidden;
          background: linear-gradient(180deg, var(--bc-panel) 0%, var(--bc-panel-2) 100%);
          min-height: 220px;
        }
        @media (min-width: 960px) {
          .bc-scene { min-height: 100vh; }
        }
        .bc-scene-svg {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
        }
        .bc-scene-content {
          position: relative;
          z-index: 2;
          height: 100%;
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
          padding: 20px 24px;
        }
        @media (min-width: 960px) {
          .bc-scene-content { justify-content: space-between; padding: 56px 56px 64px; }
        }

        .bc-brand {
          display: inline-flex;
          align-items: center;
          gap: 10px;
        }
        .bc-brand-mark {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 34px;
          height: 34px;
          border-radius: 10px;
          background: color-mix(in srgb, var(--bc-accent) 16%, transparent);
          color: var(--bc-accent-strong);
        }
        .bc-brand-name {
            font-family: var(--bc-font-display);
            font-size: 20px;
            font-weight: 600;
            letter-spacing: 0.01em;
            color: var(--bc-ink);
        }

        .bc-scene-copy { max-width: 420px; }
        .bc-scene-eyebrow {
            font-size: 12px;
            letter-spacing: 0.14em;
            text-transform: uppercase;
            color: var(--bc-accent-strong);
            font-weight: 600;
            margin: 0 0 10px;
            display: none;
        }
        @media (min-width: 960px) {
            .bc-scene-eyebrow { display: block; }
        }
        .bc-scene-heading {
            display: none;
            font-family: var(--bc-font-display);
            font-size: clamp(28px, 3vw, 38px);
            line-height: 1.15;
            font-weight: 600;
            margin: 0 0 14px;
            color: var(--bc-ink);
        }
        @media (min-width: 960px) {
            .bc-scene-heading { display: block; }
        }
        .bc-scene-sub {
            display: none;
            font-size: 15px;
            line-height: 1.6;
            color: var(--bc-ink-soft);
            margin: 0;
        }
        @media (min-width: 960px) {
            .bc-scene-sub { display: block; }
        }

        /* ---------- Form side ---------- */
        .bc-form-side {
            display: flex;
            flex-direction: column;
            background: var(--bc-bg);
            padding: 28px 20px 40px;
        }
        @media (min-width: 640px) {
            .bc-form-side { padding: 40px 48px 56px; }
        }
        @media (min-width: 960px) {
            .bc-form-side { justify-content: center; padding: 48px 72px; }
        }

        .bc-topbar {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 28px;
        }
        @media (min-width: 960px) {
            .bc-topbar { justify-content: flex-end; margin-bottom: 40px; }
        }

        .bc-theme-toggle {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            border: 1px solid var(--bc-border);
            background: var(--bc-surface);
            color: var(--bc-ink-soft);
            border-radius: 999px;
            padding: 6px 12px;
            font-size: 13px;
            cursor: pointer;
            transition: border-color 0.2s ease, color 0.2s ease, transform 0.15s ease;
        }
        .bc-theme-toggle:hover { color: var(--bc-ink); border-color: var(--bc-border-strong); }
        .bc-theme-toggle:active { transform: scale(0.97); }
        .bc-theme-toggle:focus-visible {
            outline: 2px solid var(--bc-accent);
            outline-offset: 2px;
        }

        .bc-form-wrap { width: 100%; max-width: 400px; margin: 0 auto; }

        .bc-heading {
            font-family: var(--bc-font-display);
            font-size: clamp(26px, 4vw, 30px);
            font-weight: 600;
            margin: 0 0 8px;
            color: var(--bc-ink);
        }
        .bc-subtext {
            font-size: 14.5px;
            color: var(--bc-ink-soft);
            margin: 0 0 28px;
            line-height: 1.55;
        }

        .bc-field { margin-bottom: 18px; }
        .bc-label {
            display: block;
            font-size: 13px;
            font-weight: 600;
            color: var(--bc-ink);
            margin-bottom: 7px;
        }
        .bc-input-shell {
            position: relative;
            display: flex;
            align-items: center;
            border: 1.5px solid var(--bc-border);
            border-radius: var(--bc-radius-sm);
            background: var(--bc-surface);
            transition: border-color 0.18s ease, box-shadow 0.18s ease;
        }
        .bc-input-shell:focus-within {
            border-color: var(--bc-accent);
            box-shadow: 0 0 0 4px var(--bc-focus-ring);
        }
        .bc-input-shell.is-invalid {
          border-color: var(--bc-danger);
        }
        .bc-input-shell.is-invalid:focus-within {
          box-shadow: 0 0 0 4px color-mix(in srgb, var(--bc-danger) 22%, transparent);
        }
        .bc-input-icon {
            display: inline-flex;
            padding-left: 13px;
            color: var(--bc-ink-faint);
            flex-shrink: 0;
        }
        .bc-input {
            flex: 1;
            border: none;
            background: transparent;
            outline: none;
            padding: 12px 12px;
            font-size: 15px;
            color: var(--bc-ink);
            font-family: var(--bc-font-body);
            min-width: 0;
        }
        .bc-input::placeholder { color: var(--bc-ink-faint); }
        .bc-input-toggle {
            background: none;
            border: none;
            display: inline-flex;
            padding: 8px 12px;
            color: var(--bc-ink-faint);
            cursor: pointer;
            flex-shrink: 0;
        }
        .bc-input-toggle:hover { color: var(--bc-ink-soft); }
        .bc-input-toggle:focus-visible {
            outline: 2px solid var(--bc-accent);
            outline-offset: -2px;
            border-radius: 6px;
        }

        .bc-field-error {
            display: flex;
            align-items: center;
            gap: 6px;
            margin-top: 7px;
            font-size: 12.5px;
            color: var(--bc-danger);
        }

        .bc-row-between {
            display: flex;
            align-items: center;
            justify-content: flex-end;
            margin: -6px 0 22px;
        }
        .bc-link-quiet {
            font-size: 13px;
            color: var(--bc-accent-strong);
            text-decoration: none;
            font-weight: 600;
        }
        .bc-link-quiet:hover { text-decoration: underline; }
        .bc-link-quiet:focus-visible {
            outline: 2px solid var(--bc-accent);
            outline-offset: 2px;
            border-radius: 4px;
        }

        .bc-submit {
            width: 100%;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            border: none;
            border-radius: var(--bc-radius-sm);
            background: var(--bc-accent-strong);
            color: #F4FBF9;
            font-size: 15px;
            font-weight: 600;
            padding: 13px 16px;
            cursor: pointer;
            transition: transform 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease, background 0.2s ease;
            box-shadow: 0 10px 30px -12px color-mix(in srgb, var(--bc-accent-strong) 60%, transparent);
        }
        .bc-submit:hover:not(:disabled) { transform: translateY(-1px); }
        .bc-submit:active:not(:disabled) { transform: translateY(0); }
        .bc-submit:disabled { opacity: 0.65; cursor: not-allowed; box-shadow: none; }
        .bc-submit:focus-visible { outline: 2px solid var(--bc-ink); outline-offset: 3px; }

        .bc-divider {
            display: flex;
            align-items: center;
            gap: 12px;
            margin: 24px 0;
            color: var(--bc-ink-faint);
            font-size: 12px;
            letter-spacing: 0.08em;
            text-transform: uppercase;
        }
        .bc-divider::before,
        .bc-divider::after {
            content: '';
            flex: 1;
            height: 1px;
            background: var(--bc-border);
        }

        .bc-google-wrap {
            display: flex;
            justify-content: center;
            width: 100%;
        }
        .bc-google-wrap :global(iframe) { border-radius: var(--bc-radius-sm) !important; }

        .bc-footer-line {
            text-align: center;
            margin-top: 26px;
            font-size: 14px;
            color: var(--bc-ink-soft);
        }

        .bc-general-error {
            display: flex;
            align-items: flex-start;
            gap: 8px;
            background: var(--bc-danger-bg);
            border: 1px solid color-mix(in srgb, var(--bc-danger) 35%, transparent);
            color: var(--bc-danger);
            border-radius: var(--bc-radius-sm);
            padding: 10px 12px;
            font-size: 13px;
            margin-bottom: 18px;
            line-height: 1.5;
        }

        /* ---------- Motion: clouds, particles, wind, arc ---------- */
        @keyframes bc-drift {
            from { transform: translate3d(-6%, 0, 0); }
            to   { transform: translate3d(6%, 0, 0); }
        }
        @keyframes bc-drift-slow {
            from { transform: translate3d(-4%, 0, 0); }
            to   { transform: translate3d(5%, 0, 0); }
        }
        @keyframes bc-float {
            0%, 100% { transform: translate3d(0, 0, 0); opacity: 0.55; }
            50%      { transform: translate3d(0, -14px, 0); opacity: 0.95; }
        }
        @keyframes bc-wind-flow {
            from { stroke-dashoffset: 240; }
            to   { stroke-dashoffset: 0; }
        }
        @keyframes bc-twinkle {
            0%, 100% { opacity: 0.15; }
            50%      { opacity: 0.9; }
        }
        @keyframes bc-arc-pulse {
            0%, 100% { opacity: 0.5; }
            50%      { opacity: 1; }
        }
        @keyframes bc-arc-travel {
            from { transform: rotate(0deg); }
            to   { transform: rotate(360deg); }
        }

        .bc-cloud-a { animation: bc-drift 46s ease-in-out infinite alternate; }
        .bc-cloud-b { animation: bc-drift-slow 62s ease-in-out infinite alternate; }
        .bc-particle { animation: bc-float linear infinite; transform-box: fill-box; transform-origin: center; }
        .bc-wind-path { stroke-dasharray: 8 14; animation: bc-wind-flow 5.5s linear infinite; }
        .bc-star { animation: bc-twinkle ease-in-out infinite; transform-box: fill-box; transform-origin: center; }
        .bc-arc-glow { animation: bc-arc-pulse 6s ease-in-out infinite; }
        .bc-arc-dot-group { animation: bc-arc-travel 18s linear infinite; transform-origin: 130px 130px; }

        @media (prefers-reduced-motion: reduce) {
            .bc-cloud-a, .bc-cloud-b, .bc-particle, .bc-wind-path,
            .bc-star, .bc-arc-glow, .bc-arc-dot-group {
            animation: none !important;
            }
        }
        `}</style>

            <div className="bc-shell">
                {/* ---------------- Atmospheric panel ---------------- */}
                <div className="bc-scene" aria-hidden="true">
                    <svg
                        className="bc-scene-svg"
                        viewBox="0 0 480 640"
                        preserveAspectRatio="xMidYMid slice"
                        focusable="false"
                    >
                        <defs>
                            <linearGradient id="bc-sky" x1="0" y1="0" x2="0" y2="1">
                                {mode === "day" ? (
                                    <>
                                        <stop offset="0%" stopColor="#F0FDFA" />
                                        <stop offset="55%" stopColor="#CCFBF1" />
                                        <stop offset="100%" stopColor="#99F6E4" />
                                    </>
                                ) : (
                                    <>
                                        <stop offset="0%" stopColor="#0C1A1F" />
                                        <stop offset="55%" stopColor="#081216" />
                                        <stop offset="100%" stopColor="#050B0D" />
                                    </>
                                )}
                            </linearGradient>
                            <radialGradient id="bc-glow" cx="72%" cy="18%" r="55%">
                                <stop
                                    offset="0%"
                                    stopColor={mode === "day" ? "#FEF3C7" : "#123B39"}
                                    stopOpacity={mode === "day" ? 0.85 : 0.6}
                                />
                                <stop
                                    offset="100%"
                                    stopColor={mode === "day" ? "#FEF3C7" : "#123B39"}
                                    stopOpacity="0"
                                />
                            </radialGradient>
                        </defs>

                        <rect x="0" y="0" width="480" height="640" fill="url(#bc-sky)" />
                        <rect x="0" y="0" width="480" height="640" fill="url(#bc-glow)" />

                        {/* Dark mode: quiet field of stars */}
                        {mode === "dark" &&
                            stars.map((s) => (
                                <circle
                                    key={s.id}
                                    className="bc-star"
                                    cx={(s.cx / 100) * 480}
                                    cy={(s.cy / 100) * 640}
                                    r={s.r}
                                    fill="#EAF4F2"
                                    style={{
                                        animationDuration: `${s.dur}s`,
                                        animationDelay: `${s.delay}s`,
                                    }}
                                />
                            ))}

                        {/* Signature element: the AQI horizon arc */}
                        <g
                            transform="translate(72, 96)"
                            opacity={mode === "day" ? 0.9 : 0.85}
                        >
                            <circle
                                className="bc-arc-glow"
                                cx="130"
                                cy="130"
                                r="104"
                                fill="none"
                                stroke={mode === "day" ? "#10B981" : "#4FD8C4"}
                                strokeOpacity="0.16"
                                strokeWidth="1"
                            />
                            <circle
                                cx="130"
                                cy="130"
                                r="86"
                                fill="none"
                                stroke={mode === "day" ? "#059669" : "#4FD8C4"}
                                strokeOpacity={mode === "day" ? 0.22 : 0.28}
                                strokeWidth="1.5"
                                strokeDasharray="1 7"
                                strokeLinecap="round"
                            />
                            <g className="bc-arc-dot-group">
                                <circle
                                    cx="130"
                                    cy="44"
                                    r="4.5"
                                    fill={mode === "day" ? "#F59E0B" : "#F0B65E"}
                                />
                            </g>
                        </g>

                        {/* Wind-flow lines */}
                        <g
                            stroke={mode === "day" ? "#059669" : "#4FD8C4"}
                            strokeOpacity={mode === "day" ? 0.28 : 0.32}
                            strokeWidth="2"
                            fill="none"
                            strokeLinecap="round"
                        >
                            <path
                                className="bc-wind-path"
                                d="M -20 210 C 90 190, 150 230, 260 208 S 470 190, 520 205"
                            />
                            <path
                                className="bc-wind-path"
                                style={{ animationDelay: "-2s" }}
                                d="M -30 252 C 80 268, 170 236, 250 256 S 440 270, 520 250"
                            />
                            <path
                                className="bc-wind-path"
                                style={{ animationDelay: "-3.6s" }}
                                d="M -10 288 C 100 300, 190 274, 280 292 S 430 306, 520 286"
                            />
                        </g>

                        {/* Drifting cloud bands */}
                        <g className="bc-cloud-a" opacity={mode === "day" ? 0.9 : 0.5}>
                            <ellipse
                                cx="120"
                                cy="380"
                                rx="120"
                                ry="26"
                                fill={mode === "day" ? "#FFFFFF" : "#12222A"}
                            />
                            <ellipse
                                cx="205"
                                cy="366"
                                rx="80"
                                ry="20"
                                fill={mode === "day" ? "#FFFFFF" : "#12222A"}
                            />
                        </g>
                        <g className="bc-cloud-b" opacity={mode === "day" ? 0.75 : 0.4}>
                            <ellipse
                                cx="330"
                                cy="452"
                                rx="140"
                                ry="30"
                                fill={mode === "day" ? "#FFFFFF" : "#0E1B21"}
                            />
                            <ellipse
                                cx="410"
                                cy="436"
                                rx="70"
                                ry="18"
                                fill={mode === "day" ? "#FFFFFF" : "#0E1B21"}
                            />
                        </g>

                        {/* Clean-air / AQI particles */}
                        {particles.map((p) => (
                            <circle
                                key={p.id}
                                className="bc-particle"
                                cx={(p.cx / 100) * 480}
                                cy={(p.cy / 100) * 640 + 260}
                                r={p.r}
                                fill={mode === "day" ? "#10B981" : "#7EE9DA"}
                                fillOpacity={mode === "day" ? 0.45 : 0.55}
                                style={{
                                    animationDuration: `${p.dur}s`,
                                    animationDelay: `${p.delay}s`,
                                }}
                            />
                        ))}

                        {/* Horizon line */}
                        <path
                            d="M0 520 C 120 500, 360 542, 480 512 L480 640 L0 640 Z"
                            fill={mode === "day" ? "#A7F3D0" : "#081215"}
                            opacity={mode === "day" ? 0.7 : 0.9}
                        />
                    </svg>

                    <div className="bc-scene-content">
                        <div className="bc-brand">
                            <span className="bc-brand-mark">
                                <Wind size={18} strokeWidth={2.25} />
                            </span>
                            <span className="bc-brand-name">{companyName}</span>
                        </div>

                        <div className="bc-scene-copy">
                            <p className="bc-scene-eyebrow">Environmental intelligence</p>
                            <h2 className="bc-scene-heading">
                                Clear air, read&nbsp;clearly.
                            </h2>
                            <p className="bc-scene-sub">
                                Sign back in to your environmental dashboard — live AQI, hourly
                                forecasts, and alerts tuned to the air you actually breathe.
                            </p>
                        </div>
                    </div>
                </div>

                {/* ---------------- Form side ---------------- */}
                <div className="bc-form-side">
                    <div className="bc-topbar">
                        <button
                            type="button"
                            className="bc-theme-toggle"
                            onClick={() => dispatch(toggleTheme())}
                            aria-label={
                                mode === "day" ? "Switch to dark theme" : "Switch to day theme"
                            }
                        >
                            {mode === "day" ? <Moon size={14} /> : <Sun size={14} />}
                            {mode === "day" ? "Dark" : "Day"}
                        </button>
                    </div>

                    <div className="bc-form-wrap">
                        <h1 className="bc-heading">Welcome back</h1>
                        <p className="bc-subtext">
                            Sign in to keep tracking the air quality and weather that matter
                            to you.
                        </p>

                        {loginError && (
                            <div className="bc-general-error" role="alert">
                                <AlertCircle
                                    size={16}
                                    style={{ marginTop: 1, flexShrink: 0 }}
                                />
                                <span>{loginError}</span>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} noValidate>
                            <div className="bc-field">
                                <label htmlFor="login-email" className="bc-label">
                                    Email
                                </label>
                                <div
                                    className={`bc-input-shell${emailInvalid ? " is-invalid" : ""}`}
                                >
                                    <span className="bc-input-icon">
                                        <Mail size={17} />
                                    </span>
                                    <input
                                        id="login-email"
                                        name="email"
                                        type="email"
                                        autoComplete="email"
                                        inputMode="email"
                                        className="bc-input"
                                        placeholder="you@example.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        onBlur={() => handleBlur("email")}
                                        aria-invalid={emailInvalid}
                                        aria-describedby={
                                            emailInvalid ? "login-email-error" : undefined
                                        }
                                    />
                                </div>
                                {emailInvalid && (
                                    <p className="bc-field-error" id="login-email-error">
                                        <AlertCircle size={13} />
                                        {errors.email}
                                    </p>
                                )}
                            </div>

                            <div className="bc-field">
                                <label htmlFor="login-password" className="bc-label">
                                    Password
                                </label>
                                <div
                                    className={`bc-input-shell${passwordInvalid ? " is-invalid" : ""}`}
                                >
                                    <span className="bc-input-icon">
                                        <Lock size={17} />
                                    </span>
                                    <input
                                        id="login-password"
                                        name="password"
                                        type={showPassword ? "text" : "password"}
                                        autoComplete="current-password"
                                        className="bc-input"
                                        placeholder="Enter your password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        onBlur={() => handleBlur("password")}
                                        aria-invalid={passwordInvalid}
                                        aria-describedby={
                                            passwordInvalid ? "login-password-error" : undefined
                                        }
                                    />
                                    <button
                                        type="button"
                                        className="bc-input-toggle"
                                        onClick={() => setShowPassword((s) => !s)}
                                        aria-label={
                                            showPassword ? "Hide password" : "Show password"
                                        }
                                        aria-pressed={showPassword}
                                    >
                                        {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                                    </button>
                                </div>
                                {passwordInvalid && (
                                    <p className="bc-field-error" id="login-password-error">
                                        <AlertCircle size={13} />
                                        {errors.password}
                                    </p>
                                )}
                            </div>

                            <div className="bc-row-between">
                                {/* Forgot-password route intentionally omitted — not in scope. */}
                                <span />
                            </div>

                            <button type="submit" className="bc-submit" disabled={isBusy}>
                                {loginLoading ? (
                                    <>
                                        <Loader2
                                            size={17}
                                            className="bc-spin"
                                            style={{ animation: "spin 0.8s linear infinite" }}
                                        />
                                        Signing in…
                                    </>
                                ) : (
                                    <>
                                        Sign in
                                        <ArrowRight size={17} />
                                    </>
                                )}
                            </button>
                        </form>

                        <div className="bc-divider">or</div>

                        <GoogleLogin
                            key={`${instanceId}-${mode}`}
                            onSuccess={handleGoogleSuccess}
                            onError={handleGoogleError}
                            shape="rectangular"
                            text="continue_with"
                        />

                        <p className="bc-footer-line">
                            Don&apos;t have an account?{" "}
                            <Link to="/" className="bc-link-quiet">
                                Create one
                            </Link>
                        </p>
                    </div>
                </div>
            </div>

            <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        `}</style>
        </div>
    );
};

export default Login;