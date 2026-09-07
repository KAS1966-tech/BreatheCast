import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { GoogleLogin, type CredentialResponse } from "@react-oauth/google";
import toast from "react-hot-toast";
import {
    User,
    AtSign,
    Mail,
    Lock,
    Eye,
    EyeOff,
    Loader2,
    ArrowRight,
    ArrowLeft,
    AlertCircle,
    Check,
    ShieldCheck,
} from "lucide-react";

import { useAppDispatch, useAppSelector } from "../app/redux";
import { signup, googleLogin, verifySignupOtp } from "../app/features/auth/authSlice";
import { companyName } from "../core/config";
import { useSEO } from "../utils/useSeo";
import { useGoogleFont } from "../utils/useGoogleFont";
import Navbar from "../components/Navbar";
import { getPasswordStrength, normalizeUsername,signupValidate as validate } from "../utils/auth.utlis";
import type { FormErrors, FormValues, Stage } from "../hooks/types/auth.type";

const Signup: React.FC = () => {
    const navigate = useNavigate();
    const dispatch = useAppDispatch();

    const {
        signupLoading,
        signupError,
        loading: googleLoading,
        error: googleError,
    } = useAppSelector((state) => state.auth);

    const { mode } = useAppSelector((state) => state.theme);

    useSEO(
        `Create your account — ${companyName}`,
        `Create a free ${companyName} account for live AQI tracking, weather intelligence, and personalized environmental alerts.`
    );

    useGoogleFont("Fraunces");
    useGoogleFont("Plus Jakarta Sans");

    const [stage, setStage] = useState<Stage>("form");
    const [values, setValues] = useState<FormValues>({
        fullName: "",
        username: "",
        email: "",
        password: "",
        confirmPassword: "",
    });
    const [errors, setErrors] = useState<FormErrors>({});
    const [touched, setTouched] = useState<Partial<Record<keyof FormValues, boolean>>>({});
    const [submitAttempted, setSubmitAttempted] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [otp, setOtp] = useState("");
    const [otpError, setOtpError] = useState<string | undefined>();
    const [otpSubmitting, setOtpSubmitting] = useState(false);
    const [pendingEmail, setPendingEmail] = useState("");

    useEffect(() => {
        document.documentElement.setAttribute("data-breathecast-theme", mode);
        window.localStorage.setItem("breathecast-theme", mode);
    }, [mode]);

    const lastSignupErrorRef = useRef<string | null>(null);
    useEffect(() => {
        if (signupError && signupError !== lastSignupErrorRef.current) {
            toast.error(signupError);
            lastSignupErrorRef.current = signupError;
        }
        if (!signupError) lastSignupErrorRef.current = null;
    }, [signupError]);

    const lastGoogleErrorRef = useRef<string | null>(null);
    useEffect(() => {
        if (googleError && googleError !== lastGoogleErrorRef.current) {
            toast.error(googleError);
            lastGoogleErrorRef.current = googleError;
        }
        if (!googleError) lastGoogleErrorRef.current = null;
    }, [googleError]);

    useCallback(() => {
        if (submitAttempted) setErrors(validate(values));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [values]);

    const handleChange = (field: keyof FormValues) => (e: React.ChangeEvent<HTMLInputElement>) => {
        const raw = e.target.value;
        const next = field === "username" ? raw : raw;
        setValues((prev) => ({ ...prev, [field]: next }));
    };

    const handleUsernameBlur = () => {
        setValues((prev) => ({ ...prev, username: normalizeUsername(prev.username.trim()) }));
        setTouched((prev) => ({ ...prev, username: true }));
        setErrors(validate({ ...values, username: normalizeUsername(values.username.trim()) }));
    };

    const handleBlur = (field: keyof FormValues) => () => {
        setTouched((prev) => ({ ...prev, [field]: true }));
        setErrors(validate(values));
    };

    const strength = useMemo(() => getPasswordStrength(values.password), [values.password]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitAttempted(true);

        const nextErrors = validate(values);
        setErrors(nextErrors);

        if (Object.keys(nextErrors).length > 0) {
            setTouched({
                fullName: true,
                username: true,
                email: true,
                password: true,
                confirmPassword: true,
            });
            return;
        }

        try {
            await dispatch(
                signup({
                    fullname: values.fullName.trim(),
                    username: values.username.trim(),
                    email: values.email.trim(),
                    password: values.password,
                })
            ).unwrap();

            setPendingEmail(values.email.trim());
            toast.success("Account created. Check your email to verify your account.");
            setStage("otp");
        } catch {
            // signupError drives the inline/toast message above.
        }
    };

    const handleOtpSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setOtpError(undefined);

        if (!otp.trim() || otp.trim().length < 4) {
            setOtpError("Enter the verification code from your email.");
            return;
        }

        setOtpSubmitting(true);

        try {
            await dispatch(verifySignupOtp({ email: pendingEmail, otp: otp.trim() })).unwrap();
            toast.success("Your account has been verified.");
            navigate("/home");
        } catch (err) {
            const message =
                typeof err === "string" ? err : "That code didn't work. Check it and try again.";
            setOtpError(message);
        } finally {
            setOtpSubmitting(false);
        }
    };

    const handleGoogleSuccess = async (credentialResponse: CredentialResponse) => {
        if (!credentialResponse.credential) {
            toast.error("Google sign-in didn't return a credential. Please try again.");
            return;
        }

        try {
            await dispatch(googleLogin(credentialResponse.credential)).unwrap();
            toast.success(`Welcome to ${companyName}.`);
            navigate("/home");
        } catch {
            // googleError drives the toast above.
        }
    };

    const handleGoogleError = () => {
        toast.error("Google sign-in failed. Please try again.");
    };

    const invalid = (field: keyof FormValues) => Boolean(touched[field] && errors[field]);
    const isBusy = signupLoading || googleLoading;

    const particles = useMemo(
        () =>
            Array.from({ length: 10 }, (_, i) => ({
                id: i,
                cx: 8 + ((i * 43) % 84),
                cy: 12 + ((i * 59) % 76),
                r: 1.4 + (i % 3) * 0.6,
                dur: 15 + (i % 5) * 3,
                delay: -(i * 1.8),
            })),
        []
    );

    const stars = useMemo(
        () =>
            Array.from({ length: 22 }, (_, i) => ({
                id: i,
                cx: (i * 37) % 100,
                cy: (i * 31) % 62,
                r: 0.5 + (i % 3) * 0.35,
                delay: -(i * 1.1),
                dur: 3 + (i % 4),
            })),
        []
    );

    const inputShellClass = (isInvalid: boolean) =>
        [
            "relative flex items-center border-[1.5px] rounded-[10px] bg-[var(--bc-surface)] transition-[border-color,box-shadow] duration-[180ms]",
            isInvalid
                ? "border-[var(--bc-danger)] focus-within:shadow-[0_0_0_4px_color-mix(in_srgb,var(--bc-danger)_22%,transparent)]"
                : "border-[var(--bc-border)] focus-within:border-[var(--bc-accent)] focus-within:shadow-[0_0_0_4px_var(--bc-focus-ring)]",
        ].join(" ");

    const baseInputClass =
        "flex-1 border-none bg-transparent outline-none p-3 text-[15px] text-[var(--bc-ink)] font-[var(--bc-font-body)] min-w-0 placeholder:text-[var(--bc-ink-faint)]";

    const submitClass =
        "w-full inline-flex items-center justify-center gap-2 border-none rounded-[10px] bg-[var(--bc-accent-strong)] text-[#F4FBF9] text-[15px] font-semibold px-4 py-3.25 cursor-pointer mt-1.5 transition-[transform,box-shadow,opacity] duration-150 shadow-[0_10px_30px_-12px_color-mix(in_srgb,var(--bc-accent-strong)_60%,transparent)] enabled:hover:-translate-y-px enabled:active:translate-y-0 disabled:opacity-65 disabled:cursor-not-allowed disabled:shadow-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-[var(--bc-ink)]";

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
            --bc-bg: #EEF5F3;
            --bc-panel: #DCEEEA;
            --bc-panel-2: #C7E6DD;
            --bc-surface: #FFFFFF;
            --bc-ink: #12262B;
            --bc-ink-soft: #4B6169;
            --bc-ink-faint: #7C949A;
            --bc-accent: #1F8A7A;
            --bc-accent-strong: #146357;
            --bc-accent-2: #E8A64C;
            --bc-border: rgba(18, 38, 43, 0.12);
            --bc-border-strong: rgba(18, 38, 43, 0.22);
            --bc-danger: #C7462F;
            --bc-danger-bg: rgba(199, 70, 47, 0.08);
            --bc-focus-ring: rgba(31, 138, 122, 0.35);
            --bc-strength-1: #C7462F;
            --bc-strength-2: #E8A64C;
            --bc-strength-3: #1F8A7A;
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
            --bc-strength-1: #FF6B57;
            --bc-strength-2: #F0B65E;
            --bc-strength-3: #4FD8C4;
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
            animation: bc-drift 50s ease-in-out infinite alternate;
        }

        .bc-cloud-b {
            animation: bc-drift-slow 66s ease-in-out infinite alternate;
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
            animation: bc-arc-travel 20s linear infinite;
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
            <header className="sticky top-0 z-40 border-b border-(--bc-border) bg-[color-mix(in_srgb,var(--bc-bg)_72%,transparent)] backdrop-blur-md">
        <Navbar/>
      </header>
            <main className="min-h-screen grid grid-cols-1 bg-[var(--bc-bg)] text-[var(--bc-ink)] transition-colors duration-400 min-[960px]:grid-cols-[minmax(0,4fr)_minmax(0,5fr)]">
                {/* ---------------- Form side ---------------- */}
                <div className="order-2 flex flex-col bg-[var(--bc-bg)] px-5 pt-7 pb-10 sm:px-12 sm:pt-10 sm:pb-14 min-[960px]:order-1 min-[960px]:justify-center min-[960px]:px-18 min-[960px]:py-12">

                    <div className="w-full max-w-105 mx-auto">
                        {stage === "form" ? (
                            <>
                                <h1 className="font-[var(--bc-font-display)] text-[clamp(26px,4vw,30px)] font-semibold m-0 mb-2 text-[var(--bc-ink)]">
                                    Create your account
                                </h1>

                                <p className="text-[14.5px] text-[var(--bc-ink-soft)] m-0 mb-6.5 leading-[1.55]">
                                    Begin your environmental awareness journey with live AQI and weather
                                    intelligence built around you.
                                </p>

                                {signupError && (
                                    <div
                                        className="flex items-start gap-2 bg-[var(--bc-danger-bg)] border border-[color-mix(in_srgb,var(--bc-danger)_35%,transparent)] text-[var(--bc-danger)] rounded-[10px] px-3 py-2.5 text-3.25 mb-4.5 leading-[1.5]"
                                        role="alert"
                                    >
                                        <AlertCircle size={16} className="mt-px shrink-0" />
                                        <span>{signupError}</span>
                                    </div>
                                )}

                                <form onSubmit={handleSubmit} noValidate>
                                    <div className="mb-4">
                                        <label
                                            htmlFor="signup-name"
                                            className="block text-3.25 font-semibold text-[var(--bc-ink)] mb-1.75"
                                        >
                                            Full name
                                        </label>

                                        <div className={inputShellClass(invalid("fullName"))}>
                                            <span className="inline-flex pl-3.25 text-[var(--bc-ink-faint)] shrink-0">
                                                <User size={17} />
                                            </span>

                                            <input
                                                id="signup-name"
                                                name="fullName"
                                                type="text"
                                                autoComplete="name"
                                                className={baseInputClass}
                                                placeholder="Jordan Rivera"
                                                value={values.fullName}
                                                onChange={handleChange("fullName")}
                                                onBlur={handleBlur("fullName")}
                                                aria-invalid={invalid("fullName")}
                                                aria-describedby={invalid("fullName") ? "signup-name-error" : undefined}
                                            />
                                        </div>

                                        {invalid("fullName") && (
                                            <p
                                                className="flex items-center gap-1.5 mt-1.75 text-[12.5px] text-[var(--bc-danger)]"
                                                id="signup-name-error"
                                            >
                                                <AlertCircle size={13} />
                                                {errors.fullName}
                                            </p>
                                        )}
                                    </div>

                                    <div className="mb-4">
                                        <label
                                            htmlFor="signup-username"
                                            className="block text-3.25 font-semibold text-[var(--bc-ink)] mb-1.75"
                                        >
                                            Username
                                        </label>

                                        <div className={inputShellClass(invalid("username"))}>
                                            <span className="inline-flex pl-3.25 text-[var(--bc-ink-faint)] shrink-0">
                                                <AtSign size={17} />
                                            </span>

                                            <input
                                                id="signup-username"
                                                name="username"
                                                type="text"
                                                autoComplete="username"
                                                className={baseInputClass}
                                                placeholder="@jordanrivera"
                                                value={values.username}
                                                onChange={handleChange("username")}
                                                onBlur={handleUsernameBlur}
                                                aria-invalid={invalid("username")}
                                                aria-describedby="signup-username-hint"
                                            />
                                        </div>

                                        {invalid("username") ? (
                                            <p
                                                className="flex items-center gap-1.5 mt-1.75 text-[12.5px] text-[var(--bc-danger)]"
                                                id="signup-username-hint"
                                            >
                                                <AlertCircle size={13} />
                                                {errors.username}
                                            </p>
                                        ) : (
                                            <p className="mt-1.75 text-xs text-[var(--bc-ink-faint)]" id="signup-username-hint">
                                                Starts with @ · 3–50 letters, numbers, or underscores.
                                            </p>
                                        )}
                                    </div>

                                    <div className="mb-4">
                                        <label
                                            htmlFor="signup-email"
                                            className="block text-3.25 font-semibold text-[var(--bc-ink)] mb-1.75"
                                        >
                                            Email
                                        </label>

                                        <div className={inputShellClass(invalid("email"))}>
                                            <span className="inline-flex pl-3.25 text-[var(--bc-ink-faint)] shrink-0">
                                                <Mail size={17} />
                                            </span>

                                            <input
                                                id="signup-email"
                                                name="email"
                                                type="email"
                                                autoComplete="email"
                                                inputMode="email"
                                                className={baseInputClass}
                                                placeholder="you@example.com"
                                                value={values.email}
                                                onChange={handleChange("email")}
                                                onBlur={handleBlur("email")}
                                                aria-invalid={invalid("email")}
                                                aria-describedby={invalid("email") ? "signup-email-error" : undefined}
                                            />
                                        </div>

                                        {invalid("email") && (
                                            <p
                                                className="flex items-center gap-1.5 mt-1.75 text-[12.5px] text-[var(--bc-danger)]"
                                                id="signup-email-error"
                                            >
                                                <AlertCircle size={13} />
                                                {errors.email}
                                            </p>
                                        )}
                                    </div>

                                    <div className="mb-4">
                                        <label
                                            htmlFor="signup-password"
                                            className="block text-3.25 font-semibold text-[var(--bc-ink)] mb-1.75"
                                        >
                                            Password
                                        </label>

                                        <div className={inputShellClass(invalid("password"))}>
                                            <span className="inline-flex pl-3.25 text-[var(--bc-ink-faint)] shrink-0">
                                                <Lock size={17} />
                                            </span>

                                            <input
                                                id="signup-password"
                                                name="password"
                                                type={showPassword ? "text" : "password"}
                                                autoComplete="new-password"
                                                className={baseInputClass}
                                                placeholder="Create a password"
                                                value={values.password}
                                                onChange={handleChange("password")}
                                                onBlur={handleBlur("password")}
                                                aria-invalid={invalid("password")}
                                                aria-describedby="signup-password-status"
                                            />

                                            <button
                                                type="button"
                                                className="bg-transparent border-none inline-flex px-3 py-2 text-[var(--bc-ink-faint)] cursor-pointer shrink-0 hover:text-[var(--bc-ink-soft)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:rounded-[6px]"
                                                onClick={() => setShowPassword((s) => !s)}
                                                aria-label={showPassword ? "Hide password" : "Show password"}
                                                aria-pressed={showPassword}
                                            >
                                                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                                            </button>
                                        </div>

                                        {values.password && (
                                            <div className="mt-2.5" aria-hidden={false}>
                                                <div className="flex gap-1 h-1">
                                                    {[1, 2, 3].map((seg) => (
                                                        <span
                                                            key={seg}
                                                            className="flex-1 rounded-full bg-[var(--bc-border)] transition-colors duration-250"
                                                            style={{
                                                                background:
                                                                    strength.level >= seg
                                                                        ? strength.level === 1
                                                                            ? "var(--bc-strength-1)"
                                                                            : strength.level === 2
                                                                                ? "var(--bc-strength-2)"
                                                                                : "var(--bc-strength-3)"
                                                                        : undefined,
                                                            }}
                                                        />
                                                    ))}
                                                </div>

                                                <p
                                                    className="flex items-center gap-1.25 mt-1.5 text-xs font-semibold"
                                                    id="signup-password-status"
                                                    style={{
                                                        color:
                                                            strength.level === 1
                                                                ? "var(--bc-strength-1)"
                                                                : strength.level === 2
                                                                    ? "var(--bc-strength-2)"
                                                                    : strength.level === 3
                                                                        ? "var(--bc-strength-3)"
                                                                        : "var(--bc-ink-faint)",
                                                    }}
                                                >
                                                    {strength.level === 3 && <Check size={13} />}
                                                    {strength.label} password
                                                </p>
                                            </div>
                                        )}

                                        {invalid("password") && (
                                            <p className="flex items-center gap-1.5 mt-1.75 text-[12.5px] text-[var(--bc-danger)]">
                                                <AlertCircle size={13} />
                                                {errors.password}
                                            </p>
                                        )}
                                    </div>

                                    <div className="mb-4">
                                        <label
                                            htmlFor="signup-confirm"
                                            className="block text-3.25 font-semibold text-[var(--bc-ink)] mb-1.75"
                                        >
                                            Confirm password
                                        </label>

                                        <div className={inputShellClass(invalid("confirmPassword"))}>
                                            <span className="inline-flex pl-3.25 text-[var(--bc-ink-faint)] shrink-0">
                                                <Lock size={17} />
                                            </span>

                                            <input
                                                id="signup-confirm"
                                                name="confirmPassword"
                                                type={showConfirmPassword ? "text" : "password"}
                                                autoComplete="new-password"
                                                className={baseInputClass}
                                                placeholder="Re-enter your password"
                                                value={values.confirmPassword}
                                                onChange={handleChange("confirmPassword")}
                                                onBlur={handleBlur("confirmPassword")}
                                                aria-invalid={invalid("confirmPassword")}
                                                aria-describedby={
                                                    invalid("confirmPassword") ? "signup-confirm-error" : undefined
                                                }
                                            />

                                            <button
                                                type="button"
                                                className="bg-transparent border-none inline-flex px-3 py-2 text-[var(--bc-ink-faint)] cursor-pointer shrink-0 hover:text-[var(--bc-ink-soft)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:rounded-md"
                                                onClick={() => setShowConfirmPassword((s) => !s)}
                                                aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                                                aria-pressed={showConfirmPassword}
                                            >
                                                {showConfirmPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                                            </button>
                                        </div>

                                        {invalid("confirmPassword") && (
                                            <p
                                                className="flex items-center gap-1.5 mt-1.75 text-[12.5px] text-[var(--bc-danger)]"
                                                id="signup-confirm-error"
                                            >
                                                <AlertCircle size={13} />
                                                {errors.confirmPassword}
                                            </p>
                                        )}
                                    </div>

                                    <button type="submit" className={submitClass} disabled={isBusy}>
                                        {signupLoading ? (
                                            <>
                                                <Loader2 size={17} className="animate-[spin_0.8s_linear_infinite]" />
                                                Creating account…
                                            </>
                                        ) : (
                                            <>
                                                Create account
                                                <ArrowRight size={17} />
                                            </>
                                        )}
                                    </button>
                                </form>

                                <div className="flex items-center gap-3 my-5.5 text-[var(--bc-ink-faint)] text-xs tracking-[0.08em] uppercase before:content-[''] before:block before:flex-1 before:h-px before:bg-[var(--bc-border)] after:content-[''] after:block after:flex-1 after:h-px after:bg-[var(--bc-border)]">
                                    or
                                </div>

                                <GoogleLogin
                                    onSuccess={handleGoogleSuccess}
                                    onError={handleGoogleError}
                                    shape="rectangular"
                                    width="100%"
                                    text="continue_with"
                                />

                                <p className="text-center mt-6 text-sm text-[var(--bc-ink-soft)]">
                                    Already have an account?{" "}
                                    <Link
                                        to="/login"
                                        className="text-[var(--bc-accent-strong)] font-semibold no-underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:rounded-[4px]"
                                    >
                                        Sign in
                                    </Link>
                                </p>
                            </>
                        ) : (
                            <>
                                <button
                                    type="button"
                                    className="inline-flex items-center gap-1.5 bg-transparent border-none text-[var(--bc-ink-soft)] text-3.25 cursor-pointer p-0 mb-4.5 hover:text-[var(--bc-ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:rounded-[4px]"
                                    onClick={() => setStage("form")}
                                >
                                    <ArrowLeft size={14} />
                                    Back
                                </button>

                                <span className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-[color-mix(in_srgb,var(--bc-accent)_14%,transparent)] text-[var(--bc-accent-strong)] mb-4">
                                    <ShieldCheck size={22} />
                                </span>

                                <h1 className="font-[var(--bc-font-display)] text-[clamp(26px,4vw,30px)] font-semibold m-0 mb-2 text-[var(--bc-ink)]">
                                    Verify your email
                                </h1>

                                <p className="text-[14.5px] text-[var(--bc-ink-soft)] m-0 mb-6.5 leading-[1.55]">
                                    We sent a verification code to <strong>{pendingEmail}</strong>. Enter it
                                    below to activate your account.
                                </p>

                                <form onSubmit={handleOtpSubmit} noValidate>
                                    <div className="mb-4">
                                        <label
                                            htmlFor="signup-otp"
                                            className="block text-3.25 font-semibold text-[var(--bc-ink)] mb-1.75"
                                        >
                                            Verification code
                                        </label>

                                        <div className={inputShellClass(Boolean(otpError))}>
                                            <input
                                                id="signup-otp"
                                                name="otp"
                                                type="text"
                                                inputMode="numeric"
                                                autoComplete="one-time-code"
                                                className="flex-1 border-none bg-transparent outline-none p-3 text-[var(--bc-ink)] font-[var(--bc-font-body)] min-w-0 placeholder:text-[var(--bc-ink-faint)] text-center tracking-[0.5em] text-xl font-semibold"
                                                placeholder="••••••"
                                                maxLength={8}
                                                value={otp}
                                                onChange={(e) => setOtp(e.target.value.replace(/\s/g, ""))}
                                                aria-invalid={Boolean(otpError)}
                                                aria-describedby={otpError ? "signup-otp-error" : undefined}
                                            />
                                        </div>

                                        {otpError && (
                                            <p
                                                className="flex items-center gap-1.5 mt-1.75 text-[12.5px] text-[var(--bc-danger)]"
                                                id="signup-otp-error"
                                            >
                                                <AlertCircle size={13} />
                                                {otpError}
                                            </p>
                                        )}
                                    </div>

                                    <button type="submit" className={submitClass} disabled={otpSubmitting}>
                                        {otpSubmitting ? (
                                            <>
                                                <Loader2 size={17} className="animate-[spin_0.8s_linear_infinite]" />
                                                Verifying…
                                            </>
                                        ) : (
                                            <>
                                                Verify account
                                                <ArrowRight size={17} />
                                            </>
                                        )}
                                    </button>
                                </form>

                                <p className="text-center mt-6 text-sm text-[var(--bc-ink-soft)]">
                                    Wrong email?{" "}
                                    <button
                                        type="button"
                                        className="bg-transparent border-none cursor-pointer text-[var(--bc-accent-strong)] font-semibold p-0"
                                        onClick={() => setStage("form")}
                                    >
                                        Start over
                                    </button>
                                </p>
                            </>
                        )}
                    </div>
                </div>

                {/* ---------------- Atmospheric panel ---------------- */}
                <div
                    className="order-1 relative overflow-hidden bg-[linear-gradient(180deg,var(--bc-panel)_0%,var(--bc-panel-2)_100%)] min-h-55 min-[960px]:order-2 min-[960px]:min-h-screen"
                    aria-hidden="true"
                >
                    <svg
                        className="absolute inset-0 w-full h-full"
                        viewBox="0 0 480 640"
                        preserveAspectRatio="xMidYMid slice"
                        focusable="false"
                    >
                        <defs>
                            <linearGradient id="bc-sky-2" x1="0" y1="0" x2="0" y2="1">
                                {mode === "day" ? (
                                    <>
                                        <stop offset="0%" stopColor="#F3F9F6" />
                                        <stop offset="55%" stopColor="#DCEEEA" />
                                        <stop offset="100%" stopColor="#C3E3D8" />
                                    </>
                                ) : (
                                    <>
                                        <stop offset="0%" stopColor="#0C1A1F" />
                                        <stop offset="55%" stopColor="#081216" />
                                        <stop offset="100%" stopColor="#050B0D" />
                                    </>
                                )}
                            </linearGradient>

                            <radialGradient id="bc-glow-2" cx="28%" cy="16%" r="55%">
                                <stop
                                    offset="0%"
                                    stopColor={mode === "day" ? "#FCEBC7" : "#123B39"}
                                    stopOpacity={mode === "day" ? 0.85 : 0.6}
                                />
                                <stop
                                    offset="100%"
                                    stopColor={mode === "day" ? "#FCEBC7" : "#123B39"}
                                    stopOpacity="0"
                                />
                            </radialGradient>
                        </defs>

                        <rect x="0" y="0" width="480" height="640" fill="url(#bc-sky-2)" />
                        <rect x="0" y="0" width="480" height="640" fill="url(#bc-glow-2)" />

                        {mode === "dark" &&
                            stars.map((s) => (
                                <circle
                                    key={s.id}
                                    className="bc-star"
                                    cx={(s.cx / 100) * 480}
                                    cy={(s.cy / 100) * 640}
                                    r={s.r}
                                    fill="#EAF4F2"
                                    style={{ animationDuration: `${s.dur}s`, animationDelay: `${s.delay}s` }}
                                />
                            ))}

                        <g transform="translate(280, 96)" opacity={mode === "day" ? 0.9 : 0.85}>
                            <circle
                                className="bc-arc-glow"
                                cx="130"
                                cy="130"
                                r="104"
                                fill="none"
                                stroke={mode === "day" ? "#1F8A7A" : "#4FD8C4"}
                                strokeOpacity="0.16"
                                strokeWidth="1"
                            />

                            <circle
                                cx="130"
                                cy="130"
                                r="86"
                                fill="none"
                                stroke={mode === "day" ? "#146357" : "#4FD8C4"}
                                strokeOpacity={mode === "day" ? 0.22 : 0.28}
                                strokeWidth="1.5"
                                strokeDasharray="1 7"
                                strokeLinecap="round"
                            />

                            <g className="bc-arc-dot-group">
                                <circle cx="130" cy="44" r="4.5" fill={mode === "day" ? "#E8A64C" : "#F0B65E"} />
                            </g>
                        </g>

                        <g
                            stroke={mode === "day" ? "#146357" : "#4FD8C4"}
                            strokeOpacity={mode === "day" ? 0.28 : 0.32}
                            strokeWidth="2"
                            fill="none"
                            strokeLinecap="round"
                        >
                            <path
                                className="bc-wind-path"
                                d="M -20 220 C 90 202, 150 240, 260 218 S 470 200, 520 216"
                            />
                            <path
                                className="bc-wind-path"
                                style={{ animationDelay: "-2.4s" }}
                                d="M -30 260 C 80 276, 170 246, 250 264 S 440 278, 520 258"
                            />
                            <path
                                className="bc-wind-path"
                                style={{ animationDelay: "-4s" }}
                                d="M -10 296 C 100 308, 190 282, 280 300 S 430 314, 520 294"
                            />
                        </g>

                        <g className="bc-cloud-a" opacity={mode === "day" ? 0.9 : 0.5}>
                            <ellipse cx="150" cy="392" rx="120" ry="26" fill={mode === "day" ? "#FFFFFF" : "#12222A"} />
                            <ellipse cx="235" cy="378" rx="80" ry="20" fill={mode === "day" ? "#FFFFFF" : "#12222A"} />
                        </g>

                        <g className="bc-cloud-b" opacity={mode === "day" ? 0.75 : 0.4}>
                            <ellipse cx="340" cy="460" rx="140" ry="30" fill={mode === "day" ? "#FFFFFF" : "#0E1B21"} />
                            <ellipse cx="420" cy="444" rx="70" ry="18" fill={mode === "day" ? "#FFFFFF" : "#0E1B21"} />
                        </g>

                        {particles.map((p) => (
                            <circle
                                key={p.id}
                                className="bc-particle"
                                cx={(p.cx / 100) * 480}
                                cy={(p.cy / 100) * 640 + 260}
                                r={p.r}
                                fill={mode === "day" ? "#1F8A7A" : "#7EE9DA"}
                                fillOpacity={mode === "day" ? 0.45 : 0.55}
                                style={{ animationDuration: `${p.dur}s`, animationDelay: `${p.delay}s` }}
                            />
                        ))}

                        <path
                            d="M0 524 C 120 506, 360 546, 480 518 L480 640 L0 640 Z"
                            fill={mode === "day" ? "#BFE2D6" : "#081215"}
                            opacity={mode === "day" ? 0.7 : 0.9}
                        />
                    </svg>

                    <div className="relative z-2 h-full flex flex-col justify-end px-6 py-5 min-[960px]:justify-between min-[960px]:px-14 min-[960px]:pt-14 min-[960px]:pb-16">
                        <div className="max-w-105">
                            <p className="hidden min-[960px]:block text-xs tracking-[0.14em] uppercase text-[var(--bc-accent-strong)] font-semibold m-0 mb-2.5">
                                Environmental intelligence
                            </p>

                            <h2 className="hidden min-[960px]:block font-[var(--bc-font-display)] text-[clamp(28px,3vw,38px)] leading-[1.15] font-semibold m-0 mb-3.5 text-[var(--bc-ink)]">
                                Every breath, better understood.
                            </h2>

                            <p className="hidden min-[960px]:block text-[15px] leading-[1.6] text-[var(--bc-ink-soft)] m-0">
                                Join {companyName} for live AQI, hyperlocal forecasts, and alerts that adapt
                                to the air around you — wherever you are.
                            </p>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default Signup;