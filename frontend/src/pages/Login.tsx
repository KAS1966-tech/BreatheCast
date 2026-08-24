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
} from "lucide-react";

// TODO: adjust to your project's actual paths -----------------------------
import { login, googleLogin } from "../app/features/auth/authSlice";
import { companyName } from "../core/config";
import { useSEO } from "../utils/useSeo";
import { useGoogleFont } from "../utils/useGoogleFont";
import { useAppDispatch, useAppSelector } from "../app/redux";
import Navbar from "../components/Navbar";
import { EMAIL_PATTERN } from "../constants/regex.constants";
// ---------------------------------------------------------------------------

interface FieldErrors {
    email?: string;
    password?: string;
}

const Login: React.FC = () => {
    const navigate = useNavigate();
    const dispatch = useAppDispatch();

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
        `Sign in to ${companyName} to track live air quality, weather intelligence, and personalized environmental alerts.`
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

    const validate = (values: { email: string; password: string }): FieldErrors => {
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
            await dispatch(login({ email: email.trim(), password })).unwrap();
            toast.success(`Welcome back to ${companyName}.`);
            navigate("/home");
        } catch {
            // loginError from the slice drives the toast/inline message above.
        }
    };

    const handleGoogleSuccess = async (credentialResponse: CredentialResponse) => {
        if (!credentialResponse.credential) {
            toast.error("Google sign-in didn't return a credential. Please try again.");
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
        []
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
        []
    );

    const emailShellClasses = [
        "relative flex items-center border-[1.5px] rounded-[10px] bg-[var(--bc-surface)] transition-[border-color,box-shadow] duration-[180ms]",
        emailInvalid
            ? "border-[var(--bc-danger)] focus-within:shadow-[0_0_0_4px_color-mix(in_srgb,var(--bc-danger)_22%,transparent)]"
            : "border-[var(--bc-border)] focus-within:border-[var(--bc-accent)] focus-within:shadow-[0_0_0_4px_var(--bc-focus-ring)]",
    ].join(" ");

    const passwordShellClasses = [
        "relative flex items-center border-[1.5px] rounded-[10px] bg-[var(--bc-surface)] transition-[border-color,box-shadow] duration-[180ms]",
        passwordInvalid
            ? "border-[var(--bc-danger)] focus-within:shadow-[0_0_0_4px_color-mix(in_srgb,var(--bc-danger)_22%,transparent)]"
            : "border-[var(--bc-border)] focus-within:border-[var(--bc-accent)] focus-within:shadow-[0_0_0_4px_var(--bc-focus-ring)]",
    ].join(" ");

    return (
        <div
            className="bc-root min-h-screen w-full"
            data-theme={mode}
            style={{ fontFamily: "var(--bc-font-body)" }}
        >
            <style>{`
        .bc-root {
          --bc-radius: 18px;
          --bc-radius-sm: 10px;
          --bc-font-display: 'Fraunces', 'Georgia', serif;
          --bc-font-body: 'Plus Jakarta Sans', 'Inter', system-ui, sans-serif;
          --bc-shadow: 0 20px 60px -25px rgba(9, 30, 34, 0.35);
        }

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

        .bc-google-wrap iframe {
          border-radius: var(--bc-radius-sm) !important;
        }

        @keyframes bc-drift {
          from { transform: translate3d(-6%, 0, 0); }
          to { transform: translate3d(6%, 0, 0); }
        }

        @keyframes bc-drift-slow {
          from { transform: translate3d(-4%, 0, 0); }
          to { transform: translate3d(5%, 0, 0); }
        }

        @keyframes bc-float {
          0%, 100% { transform: translate3d(0, 0, 0); opacity: 0.55; }
          50% { transform: translate3d(0, -14px, 0); opacity: 0.95; }
        }

        @keyframes bc-wind-flow {
          from { stroke-dashoffset: 240; }
          to { stroke-dashoffset: 0; }
        }

        @keyframes bc-twinkle {
          0%, 100% { opacity: 0.15; }
          50% { opacity: 0.9; }
        }

        @keyframes bc-arc-pulse {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }

        @keyframes bc-arc-travel {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .bc-cloud-a {
          animation: bc-drift 46s ease-in-out infinite alternate;
        }

        .bc-cloud-b {
          animation: bc-drift-slow 62s ease-in-out infinite alternate;
        }

        .bc-particle {
          animation: bc-float linear infinite;
          transform-box: fill-box;
          transform-origin: center;
        }

        .bc-wind-path {
          stroke-dasharray: 8 14;
          animation: bc-wind-flow 5.5s linear infinite;
        }

        .bc-star {
          animation: bc-twinkle ease-in-out infinite;
          transform-box: fill-box;
          transform-origin: center;
        }

        .bc-arc-glow {
          animation: bc-arc-pulse 6s ease-in-out infinite;
        }

        .bc-arc-dot-group {
          animation: bc-arc-travel 18s linear infinite;
          transform-origin: 130px 130px;
        }

        @media (prefers-reduced-motion: reduce) {
          .bc-cloud-a,
          .bc-cloud-b,
          .bc-particle,
          .bc-wind-path,
          .bc-star,
          .bc-arc-glow,
          .bc-arc-dot-group {
            animation: none !important;
          }
        }
      `}</style>
            <header>
                <Navbar />
            </header>
            <main className="min-h-screen grid grid-cols-1 bg-(--bc-bg) text-(--bc-ink) transition-colors duration-400 min-[960px]:grid-cols-[minmax(0,5fr)_minmax(0,4fr)]">
                {/* ---------------- Atmospheric panel ---------------- */}
                <div
                    className="relative overflow-hidden bg-[linear-gradient(180deg,var(--bc-panel)_0%,var(--bc-panel-2)_100%)] min-h-55 min-[960px]:min-h-screen"
                    aria-hidden="true"
                >
                    <svg
                        className="absolute inset-0 w-full h-full"
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
                        <g transform="translate(72, 96)" opacity={mode === "day" ? 0.9 : 0.85}>
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

                    <div className="relative z-2 h-full flex flex-col justify-end px-6 py-5 min-[960px]:justify-between min-[960px]:px-14 min-[960px]:pt-14 min-[960px]:pb-16">

                        <div className="max-w-105">
                            <p className="hidden min-[960px]:block text-xs tracking-[0.14em] uppercase text-(--bc-accent-strong) font-semibold m-0 mb-2.5">
                                Environmental intelligence
                            </p>

                            <h2 className="hidden min-[960px]:block font-(--bc-font-display) text-[clamp(28px,3vw,38px)] leading-[1.15] m-0 mb-3.5 text-(--bc-ink)">
                                Clear air, read&nbsp;clearly.
                            </h2>

                            <p className="hidden min-[960px]:block text-[15px] leading-[1.6] text-(--bc-ink-soft) m-0">
                                Sign back in to your environmental dashboard — live AQI, hourly forecasts,
                                and alerts tuned to the air you actually breathe.
                            </p>
                        </div>
                    </div>
                </div>

                {/* ---------------- Form side ---------------- */}
                <div className="flex flex-col bg-(--bc-bg) px-5 pt-7 pb-10 sm:px-12 sm:pt-10 sm:pb-14 min-[960px]:justify-center min-[960px]:px-18 min-[960px]:py-12">

                    <div className="w-full max-w-100 mx-auto mt-8">
                        <h1 className="font-(--bc-font-display) text-[clamp(26px,4vw,30px)] m-0 mb-2 text-(--bc-ink)">
                            Welcome back
                        </h1>

                        <p className="text-[14.5px] text-(--bc-ink-soft) m-0 mb-7 leading-[1.55]">
                            Sign in to keep tracking the air quality and weather that matter to you.
                        </p>

                        {loginError && (
                            <div
                                className="flex items-start gap-2 bg-(--bc-danger-bg) border border-[color-mix(in_srgb,var(--bc-danger)_35%,transparent)] text-(--bc-danger) rounded-[10px] px-3 py-2.5 text-[13px] mb-4.5 leading-normal"
                                role="alert"
                            >
                                <AlertCircle size={16} className="mt-px shrink-0" />
                                <span>{loginError}</span>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} noValidate>
                            <div className="mb-4.5">
                                <label
                                    htmlFor="login-email"
                                    className="block text-[13px] font-semibold text-(--bc-ink) mb-1.75"
                                >
                                    Email
                                </label>

                                <div className={emailShellClasses}>
                                    <span className="inline-flex pl-3.25 text-(--bc-ink-faint) shrink-0">
                                        <Mail size={17} />
                                    </span>

                                    <input
                                        id="login-email"
                                        name="email"
                                        type="email"
                                        autoComplete="email"
                                        inputMode="email"
                                        className="flex-1 border-none bg-transparent outline-none p-3 text-[15px] text-(--bc-ink) font-(--bc-font-body) min-w-0 placeholder:text-(--bc-ink-faint)"
                                        placeholder="you@example.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        onBlur={() => handleBlur("email")}
                                        aria-invalid={emailInvalid}
                                        aria-describedby={emailInvalid ? "login-email-error" : undefined}
                                    />
                                </div>

                                {emailInvalid && (
                                    <p
                                        className="flex items-center gap-1.5 mt-1.75 text-[12.5px] text-(--bc-danger)"
                                        id="login-email-error"
                                    >
                                        <AlertCircle size={13} />
                                        {errors.email}
                                    </p>
                                )}
                            </div>

                            <div className="mb-4.5">
                                <label
                                    htmlFor="login-password"
                                    className="block text-[13px] font-semibold text-(--bc-ink) mb-1.75"
                                >
                                    Password
                                </label>

                                <div className={passwordShellClasses}>
                                    <span className="inline-flex pl-3.25 text-(--bc-ink-faint) shrink-0">
                                        <Lock size={17} />
                                    </span>

                                    <input
                                        id="login-password"
                                        name="password"
                                        type={showPassword ? "text" : "password"}
                                        autoComplete="current-password"
                                        className="flex-1 border-none bg-transparent outline-none p-3 text-[15px] text-(--bc-ink) font-(--bc-font-body) min-w-0 placeholder:text-(--bc-ink-faint)"
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
                                        className="bg-transparent border-none inline-flex px-3 py-2 text-(--bc-ink-faint) cursor-pointer shrink-0 hover:text-(--bc-ink-soft) focus-visible:outline focus-visible:-outline-offset-2 focus-visible:rounded-md"
                                        onClick={() => setShowPassword((s) => !s)}
                                        aria-label={showPassword ? "Hide password" : "Show password"}
                                        aria-pressed={showPassword}
                                    >
                                        {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                                    </button>
                                </div>

                                {passwordInvalid && (
                                    <p
                                        className="flex items-center gap-1.5 mt-1.75 text-[12.5px] text-(--bc-danger)"
                                        id="login-password-error"
                                    >
                                        <AlertCircle size={13} />
                                        {errors.password}
                                    </p>
                                )}
                            </div>

                            <div className="flex items-center justify-end -mt-1.5 mb-5.5">
                                {/* Forgot-password route intentionally omitted — not in scope. */}
                                <span />
                            </div>

                            <button
                                type="submit"
                                className="w-full inline-flex items-center justify-center gap-2 border-none rounded-[10px] bg-(--bc-accent-strong) text-[#F4FBF9] text-[15px] font-semibold px-4 py-3.25 cursor-pointer transition-[transform,box-shadow,opacity,background-color] duration-150 shadow-[0_10px_30px_-12px_color-mix(in_srgb,var(--bc-accent-strong)_60%,transparent)] enabled:hover:-translate-y-px enabled:active:translate-y-0 disabled:opacity-65 disabled:cursor-not-allowed disabled:shadow-none focus-visible:outline focus-visible:outline-offset-[3px] focus-visible:outline-(--bc-ink)"
                                disabled={isBusy}
                            >
                                {loginLoading ? (
                                    <>
                                        <Loader2 size={17} className="animate-[spin_0.8s_linear_infinite]" />
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

                        <div className="flex items-center gap-3 my-6 text-(--bc-ink-faint) text-xs tracking-[0.08em] uppercase before:content-[''] before:block before:flex-1 before:h-px before:bg-(--bc-border) after:content-[''] after:block after:flex-1 after:h-px after:bg-(--bc-border)">
                            or
                        </div>

                        {/* <div className="bc-google-wrap flex justify-center w-full"> */}
                        <GoogleLogin
                            key={`${instanceId}-${mode}`}
                            onSuccess={handleGoogleSuccess}
                            onError={handleGoogleError}
                            shape="rectangular"
                            text="continue_with"
                        />
                        {/* </div> */}

                        <p className="text-center mt-6.5 text-sm text-(--bc-ink-soft)">
                            Don&apos;t have an account?{" "}
                            <Link
                                to="/signup"
                                className="text-[13px] text-(--bc-accent-strong) no-underline font-semibold hover:underline focus-visible:outline focus-visible:outline-offset-2 focus-visible:rounded"
                            >
                                Create one
                            </Link>
                        </p>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default Login;