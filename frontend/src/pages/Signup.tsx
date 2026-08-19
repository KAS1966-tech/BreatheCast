import React, { useEffect, useMemo, useRef, useState } from "react";
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
    Sun,
    Moon,
    Wind,
    ShieldCheck,
} from "lucide-react";

// TODO: adjust to your project's actual paths -----------------------------
import { useAppDispatch, useAppSelector } from "../app/redux";
import { signup, googleLogin, verifySignupOtp } from "../app/features/auth/authSlice";
import { companyName } from "../core/config";
import { useSEO } from "../utils/useSeo";
import { useGoogleFont } from "../utils/useGoogleFont";
import { toggleTheme } from "../app/features/theme/themeSlice";
// ---------------------------------------------------------------------------

type Stage = "form" | "otp";

interface FormValues {
    fullName: string;
    username: string;
    email: string;
    password: string;
    confirmPassword: string;
}

interface FormErrors {
    fullName?: string;
    username?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
}

const EMAIL_PATTERN = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
const USERNAME_PATTERN = /^@[A-Za-z0-9_]{2,49}$/;
const PASSWORD_PATTERN =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&^#()_+\-=[\]{};':"\\|,.<>/?]).{8,}$/;

function normalizeUsername(value: string): string {
    if (!value) return value;
    return value.startsWith("@") ? value : `@${value}`;
}

type StrengthLevel = 0 | 1 | 2 | 3;

function getPasswordStrength(password: string): { level: StrengthLevel; label: string } {
    if (!password) return { level: 0, label: "" };
    const rules = [
        /[a-z]/.test(password),
        /[A-Z]/.test(password),
        /\d/.test(password),
        /[@$!%*?&^#()_+\-=[\]{};':"\\|,.<>/?]/.test(password),
        password.length >= 8,
        password.length >= 12,
    ];
    const score = rules.filter(Boolean).length;
    if (score <= 3) return { level: 1, label: "Weak" };
    if (score <= 5) return { level: 2, label: "Fair" };
    return { level: 3, label: "Strong" };
}

const Signup: React.FC = () => {
    const navigate = useNavigate();
    const dispatch = useAppDispatch();

    const {
        signupLoading,
        signupError,
        loading: googleLoading,
        error: googleError,
    } = useAppSelector((state) => state.auth);
    const {mode} = useAppSelector((state) => state.theme);

    useSEO(
        `Create your account — ${companyName}`,
        `Create a free ${companyName} account for live AQI tracking, weather intelligence, and personalized environmental alerts.`
    );
    useGoogleFont("Fraunces");
    useGoogleFont("Plus Jakarta Sans");

    // const [theme, setTheme] = useState<Theme>(getInitialTheme);
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

    const validate = (v: FormValues): FormErrors => {
        const next: FormErrors = {};
        if (!v.fullName.trim()) {
            next.fullName = "Enter your full name.";
        } else if (v.fullName.trim().length < 2) {
            next.fullName = "Full name looks too short.";
        }

        if (!v.username.trim()) {
            next.username = "Choose a username.";
        } else if (!USERNAME_PATTERN.test(v.username.trim())) {
            next.username = "Username must start with @ and use 3–50 letters, numbers, or underscores.";
        }

        if (!v.email.trim()) {
            next.email = "Enter your email address.";
        } else if (!EMAIL_PATTERN.test(v.email.trim())) {
            next.email = "Enter a valid email address.";
        }

        if (!v.password) {
            next.password = "Create a password.";
        } else if (!PASSWORD_PATTERN.test(v.password)) {
            next.password =
                "Password needs an uppercase and lowercase letter, a number, a symbol, and 8+ characters.";
        }

        if (!v.confirmPassword) {
            next.confirmPassword = "Confirm your password.";
        } else if (v.confirmPassword !== v.password) {
            next.confirmPassword = "Passwords do not match.";
        }

        return next;
    };

    useEffect(() => {
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
            await dispatch(
                verifySignupOtp({ email: pendingEmail, otp: otp.trim() })
            ).unwrap();
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

        .bc-shell {
          min-height: 100vh;
          display: grid;
          grid-template-columns: 1fr;
          background: var(--bc-bg);
          color: var(--bc-ink);
          transition: background 0.4s ease, color 0.4s ease;
        }
        @media (min-width: 960px) {
          .bc-shell { grid-template-columns: minmax(0, 4fr) minmax(0, 5fr); }
        }
        /* Mirrored order: form first on desktop, scene second. */
        .bc-form-side { order: 2; }
        .bc-scene { order: 1; }
        @media (min-width: 960px) {
          .bc-form-side { order: 1; }
          .bc-scene { order: 2; }
        }

        .bc-scene {
          position: relative;
          overflow: hidden;
          background: linear-gradient(180deg, var(--bc-panel) 0%, var(--bc-panel-2) 100%);
          min-height: 220px;
        }
        @media (min-width: 960px) {
          .bc-scene { min-height: 100vh; }
        }
        .bc-scene-svg { position: absolute; inset: 0; width: 100%; height: 100%; }
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

        .bc-brand { display: inline-flex; align-items: center; gap: 10px; }
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
        @media (min-width: 960px) { .bc-scene-eyebrow { display: block; } }
        .bc-scene-heading {
          display: none;
          font-family: var(--bc-font-display);
          font-size: clamp(28px, 3vw, 38px);
          line-height: 1.15;
          font-weight: 600;
          margin: 0 0 14px;
          color: var(--bc-ink);
        }
        @media (min-width: 960px) { .bc-scene-heading { display: block; } }
        .bc-scene-sub { display: none; font-size: 15px; line-height: 1.6; color: var(--bc-ink-soft); margin: 0; }
        @media (min-width: 960px) { .bc-scene-sub { display: block; } }

        .bc-form-side {
          display: flex;
          flex-direction: column;
          background: var(--bc-bg);
          padding: 28px 20px 40px;
        }
        @media (min-width: 640px) { .bc-form-side { padding: 40px 48px 56px; } }
        @media (min-width: 960px) { .bc-form-side { justify-content: center; padding: 48px 72px; } }

        .bc-topbar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 28px; }
        @media (min-width: 960px) { .bc-topbar { justify-content: flex-end; margin-bottom: 40px; } }

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
        .bc-theme-toggle:focus-visible { outline: 2px solid var(--bc-accent); outline-offset: 2px; }

        .bc-form-wrap { width: 100%; max-width: 420px; margin: 0 auto; }

        .bc-heading {
          font-family: var(--bc-font-display);
          font-size: clamp(26px, 4vw, 30px);
          font-weight: 600;
          margin: 0 0 8px;
          color: var(--bc-ink);
        }
        .bc-subtext { font-size: 14.5px; color: var(--bc-ink-soft); margin: 0 0 26px; line-height: 1.55; }

        .bc-field { margin-bottom: 16px; }
        .bc-label { display: block; font-size: 13px; font-weight: 600; color: var(--bc-ink); margin-bottom: 7px; }
        .bc-input-shell {
          position: relative;
          display: flex;
          align-items: center;
          border: 1.5px solid var(--bc-border);
          border-radius: var(--bc-radius-sm);
          background: var(--bc-surface);
          transition: border-color 0.18s ease, box-shadow 0.18s ease;
        }
        .bc-input-shell:focus-within { border-color: var(--bc-accent); box-shadow: 0 0 0 4px var(--bc-focus-ring); }
        .bc-input-shell.is-invalid { border-color: var(--bc-danger); }
        .bc-input-shell.is-invalid:focus-within {
          box-shadow: 0 0 0 4px color-mix(in srgb, var(--bc-danger) 22%, transparent);
        }
        .bc-input-icon { display: inline-flex; padding-left: 13px; color: var(--bc-ink-faint); flex-shrink: 0; }
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
        .bc-input-toggle:focus-visible { outline: 2px solid var(--bc-accent); outline-offset: -2px; border-radius: 6px; }

        .bc-field-error {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-top: 7px;
          font-size: 12.5px;
          color: var(--bc-danger);
        }
        .bc-field-hint { margin-top: 7px; font-size: 12px; color: var(--bc-ink-faint); }

        .bc-strength { margin-top: 10px; }
        .bc-strength-track {
          display: flex;
          gap: 4px;
          height: 4px;
        }
        .bc-strength-seg {
          flex: 1;
          border-radius: 999px;
          background: var(--bc-border);
          transition: background 0.25s ease;
        }
        .bc-strength-label {
          display: flex;
          align-items: center;
          gap: 5px;
          margin-top: 6px;
          font-size: 12px;
          font-weight: 600;
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
          margin-top: 6px;
          transition: transform 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease;
          box-shadow: 0 10px 30px -12px color-mix(in srgb, var(--bc-accent-strong) 60%, transparent);
        }
        .bc-submit:hover:not(:disabled) { transform: translateY(-1px); }
        .bc-submit:active:not(:disabled) { transform: translateY(0); }
        .bc-submit:disabled { opacity: 0.65; cursor: not-allowed; box-shadow: none; }
        .bc-submit:focus-visible { outline: 2px solid var(--bc-ink); outline-offset: 3px; }

        .bc-submit-ghost {
          width: 100%;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          border: 1.5px solid var(--bc-border);
          border-radius: var(--bc-radius-sm);
          background: transparent;
          color: var(--bc-ink-soft);
          font-size: 14px;
          font-weight: 600;
          padding: 11px 16px;
          cursor: pointer;
          margin-top: 10px;
          transition: border-color 0.2s ease, color 0.2s ease;
        }
        .bc-submit-ghost:hover { color: var(--bc-ink); border-color: var(--bc-border-strong); }
        .bc-submit-ghost:focus-visible { outline: 2px solid var(--bc-accent); outline-offset: 2px; }

        .bc-divider {
          display: flex;
          align-items: center;
          gap: 12px;
          margin: 22px 0;
          color: var(--bc-ink-faint);
          font-size: 12px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }
        .bc-divider::before, .bc-divider::after { content: ''; flex: 1; height: 1px; background: var(--bc-border); }

        .bc-google-wrap { display: flex; justify-content: center; width: 100%; }

        .bc-footer-line { text-align: center; margin-top: 24px; font-size: 14px; color: var(--bc-ink-soft); }

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

        /* OTP stage */
        .bc-otp-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 44px;
          height: 44px;
          border-radius: 12px;
          background: color-mix(in srgb, var(--bc-accent) 14%, transparent);
          color: var(--bc-accent-strong);
          margin-bottom: 16px;
        }
        .bc-otp-input {
          text-align: center;
          letter-spacing: 0.5em;
          font-size: 20px;
          font-weight: 600;
        }
        .bc-back-link {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: none;
          border: none;
          color: var(--bc-ink-soft);
          font-size: 13px;
          cursor: pointer;
          padding: 0;
          margin-bottom: 18px;
        }
        .bc-back-link:hover { color: var(--bc-ink); }
        .bc-back-link:focus-visible { outline: 2px solid var(--bc-accent); outline-offset: 3px; border-radius: 4px; }

        /* Motion */
        @keyframes bc-drift { from { transform: translate3d(-6%, 0, 0); } to { transform: translate3d(6%, 0, 0); } }
        @keyframes bc-drift-slow { from { transform: translate3d(-4%, 0, 0); } to { transform: translate3d(5%, 0, 0); } }
        @keyframes bc-float {
          0%, 100% { transform: translate3d(0, 0, 0); opacity: 0.55; }
          50% { transform: translate3d(0, -14px, 0); opacity: 0.95; }
        }
        @keyframes bc-wind-flow { from { stroke-dashoffset: 240; } to { stroke-dashoffset: 0; } }
        @keyframes bc-twinkle { 0%, 100% { opacity: 0.15; } 50% { opacity: 0.9; } }
        @keyframes bc-arc-pulse { 0%, 100% { opacity: 0.5; } 50% { opacity: 1; } }
        @keyframes bc-arc-travel { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

        .bc-cloud-a { animation: bc-drift 50s ease-in-out infinite alternate; }
        .bc-cloud-b { animation: bc-drift-slow 66s ease-in-out infinite alternate; }
        .bc-particle { animation: bc-float linear infinite; transform-box: fill-box; transform-origin: center; }
        .bc-wind-path { stroke-dasharray: 8 14; animation: bc-wind-flow 5.5s linear infinite; }
        .bc-star { animation: bc-twinkle ease-in-out infinite; transform-box: fill-box; transform-origin: center; }
        .bc-arc-glow { animation: bc-arc-pulse 6s ease-in-out infinite; }
        .bc-arc-dot-group { animation: bc-arc-travel 20s linear infinite; transform-origin: 130px 130px; }

        @media (prefers-reduced-motion: reduce) {
          .bc-cloud-a, .bc-cloud-b, .bc-particle, .bc-wind-path,
          .bc-star, .bc-arc-glow, .bc-arc-dot-group { animation: none !important; }
        }
      `}</style>

            <div className="bc-shell">
                {/* ---------------- Form side ---------------- */}
                <div className="bc-form-side">
                    <div className="bc-topbar">
                        <button
                            type="button"
                            className="bc-theme-toggle"
                            onClick={() => dispatch(toggleTheme())}
                            aria-label={mode === "day" ? "Switch to dark theme" : "Switch to day theme"}
                        >
                            {mode === "day" ? <Moon size={14} /> : <Sun size={14} />}
                            {mode === "day" ? "Dark" : "Day"}
                        </button>
                    </div>

                    <div className="bc-form-wrap">
                        {stage === "form" ? (
                            <>
                                <h1 className="bc-heading">Create your account</h1>
                                <p className="bc-subtext">
                                    Begin your environmental awareness journey with live AQI and weather
                                    intelligence built around you.
                                </p>

                                {signupError && (
                                    <div className="bc-general-error" role="alert">
                                        <AlertCircle size={16} style={{ marginTop: 1, flexShrink: 0 }} />
                                        <span>{signupError}</span>
                                    </div>
                                )}

                                <form onSubmit={handleSubmit} noValidate>
                                    <div className="bc-field">
                                        <label htmlFor="signup-name" className="bc-label">
                                            Full name
                                        </label>
                                        <div className={`bc-input-shell${invalid("fullName") ? " is-invalid" : ""}`}>
                                            <span className="bc-input-icon">
                                                <User size={17} />
                                            </span>
                                            <input
                                                id="signup-name"
                                                name="fullName"
                                                type="text"
                                                autoComplete="name"
                                                className="bc-input"
                                                placeholder="Jordan Rivera"
                                                value={values.fullName}
                                                onChange={handleChange("fullName")}
                                                onBlur={handleBlur("fullName")}
                                                aria-invalid={invalid("fullName")}
                                                aria-describedby={invalid("fullName") ? "signup-name-error" : undefined}
                                            />
                                        </div>
                                        {invalid("fullName") && (
                                            <p className="bc-field-error" id="signup-name-error">
                                                <AlertCircle size={13} />
                                                {errors.fullName}
                                            </p>
                                        )}
                                    </div>

                                    <div className="bc-field">
                                        <label htmlFor="signup-username" className="bc-label">
                                            Username
                                        </label>
                                        <div className={`bc-input-shell${invalid("username") ? " is-invalid" : ""}`}>
                                            <span className="bc-input-icon">
                                                <AtSign size={17} />
                                            </span>
                                            <input
                                                id="signup-username"
                                                name="username"
                                                type="text"
                                                autoComplete="username"
                                                className="bc-input"
                                                placeholder="@jordanrivera"
                                                value={values.username}
                                                onChange={handleChange("username")}
                                                onBlur={handleUsernameBlur}
                                                aria-invalid={invalid("username")}
                                                aria-describedby="signup-username-hint"
                                            />
                                        </div>
                                        {invalid("username") ? (
                                            <p className="bc-field-error" id="signup-username-hint">
                                                <AlertCircle size={13} />
                                                {errors.username}
                                            </p>
                                        ) : (
                                            <p className="bc-field-hint" id="signup-username-hint">
                                                Starts with @ · 3–50 letters, numbers, or underscores.
                                            </p>
                                        )}
                                    </div>

                                    <div className="bc-field">
                                        <label htmlFor="signup-email" className="bc-label">
                                            Email
                                        </label>
                                        <div className={`bc-input-shell${invalid("email") ? " is-invalid" : ""}`}>
                                            <span className="bc-input-icon">
                                                <Mail size={17} />
                                            </span>
                                            <input
                                                id="signup-email"
                                                name="email"
                                                type="email"
                                                autoComplete="email"
                                                inputMode="email"
                                                className="bc-input"
                                                placeholder="you@example.com"
                                                value={values.email}
                                                onChange={handleChange("email")}
                                                onBlur={handleBlur("email")}
                                                aria-invalid={invalid("email")}
                                                aria-describedby={invalid("email") ? "signup-email-error" : undefined}
                                            />
                                        </div>
                                        {invalid("email") && (
                                            <p className="bc-field-error" id="signup-email-error">
                                                <AlertCircle size={13} />
                                                {errors.email}
                                            </p>
                                        )}
                                    </div>

                                    <div className="bc-field">
                                        <label htmlFor="signup-password" className="bc-label">
                                            Password
                                        </label>
                                        <div className={`bc-input-shell${invalid("password") ? " is-invalid" : ""}`}>
                                            <span className="bc-input-icon">
                                                <Lock size={17} />
                                            </span>
                                            <input
                                                id="signup-password"
                                                name="password"
                                                type={showPassword ? "text" : "password"}
                                                autoComplete="new-password"
                                                className="bc-input"
                                                placeholder="Create a password"
                                                value={values.password}
                                                onChange={handleChange("password")}
                                                onBlur={handleBlur("password")}
                                                aria-invalid={invalid("password")}
                                                aria-describedby="signup-password-status"
                                            />
                                            <button
                                                type="button"
                                                className="bc-input-toggle"
                                                onClick={() => setShowPassword((s) => !s)}
                                                aria-label={showPassword ? "Hide password" : "Show password"}
                                                aria-pressed={showPassword}
                                            >
                                                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                                            </button>
                                        </div>

                                        {values.password && (
                                            <div className="bc-strength" aria-hidden={false}>
                                                <div className="bc-strength-track">
                                                    {[1, 2, 3].map((seg) => (
                                                        <span
                                                            key={seg}
                                                            className="bc-strength-seg"
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
                                                    className="bc-strength-label"
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
                                            <p className="bc-field-error">
                                                <AlertCircle size={13} />
                                                {errors.password}
                                            </p>
                                        )}
                                    </div>

                                    <div className="bc-field">
                                        <label htmlFor="signup-confirm" className="bc-label">
                                            Confirm password
                                        </label>
                                        <div className={`bc-input-shell${invalid("confirmPassword") ? " is-invalid" : ""}`}>
                                            <span className="bc-input-icon">
                                                <Lock size={17} />
                                            </span>
                                            <input
                                                id="signup-confirm"
                                                name="confirmPassword"
                                                type={showConfirmPassword ? "text" : "password"}
                                                autoComplete="new-password"
                                                className="bc-input"
                                                placeholder="Re-enter your password"
                                                value={values.confirmPassword}
                                                onChange={handleChange("confirmPassword")}
                                                onBlur={handleBlur("confirmPassword")}
                                                aria-invalid={invalid("confirmPassword")}
                                                aria-describedby={invalid("confirmPassword") ? "signup-confirm-error" : undefined}
                                            />
                                            <button
                                                type="button"
                                                className="bc-input-toggle"
                                                onClick={() => setShowConfirmPassword((s) => !s)}
                                                aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                                                aria-pressed={showConfirmPassword}
                                            >
                                                {showConfirmPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                                            </button>
                                        </div>
                                        {invalid("confirmPassword") && (
                                            <p className="bc-field-error" id="signup-confirm-error">
                                                <AlertCircle size={13} />
                                                {errors.confirmPassword}
                                            </p>
                                        )}
                                    </div>

                                    <button type="submit" className="bc-submit" disabled={isBusy}>
                                        {signupLoading ? (
                                            <>
                                                <Loader2 size={17} style={{ animation: "spin 0.8s linear infinite" }} />
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

                                <div className="bc-divider">or</div>

                                    <GoogleLogin
                                        onSuccess={handleGoogleSuccess}
                                        onError={handleGoogleError}
                                        shape="rectangular"
                                        width="100%"
                                        text="continue_with"
                                    />

                                <p className="bc-footer-line">
                                    Already have an account?{" "}
                                    <Link to="/login" className="bc-link-quiet" style={{ color: "var(--bc-accent-strong)", fontWeight: 600, textDecoration: "none" }}>
                                        Sign in
                                    </Link>
                                </p>
                            </>
                        ) : (
                            <>
                                <button
                                    type="button"
                                    className="bc-back-link"
                                    onClick={() => setStage("form")}
                                >
                                    <ArrowLeft size={14} />
                                    Back
                                </button>

                                <span className="bc-otp-icon">
                                    <ShieldCheck size={22} />
                                </span>

                                <h1 className="bc-heading">Verify your email</h1>
                                <p className="bc-subtext">
                                    We sent a verification code to <strong>{pendingEmail}</strong>. Enter it
                                    below to activate your account.
                                </p>

                                <form onSubmit={handleOtpSubmit} noValidate>
                                    <div className="bc-field">
                                        <label htmlFor="signup-otp" className="bc-label">
                                            Verification code
                                        </label>
                                        <div className={`bc-input-shell${otpError ? " is-invalid" : ""}`}>
                                            <input
                                                id="signup-otp"
                                                name="otp"
                                                type="text"
                                                inputMode="numeric"
                                                autoComplete="one-time-code"
                                                className="bc-input bc-otp-input"
                                                placeholder="••••••"
                                                maxLength={8}
                                                value={otp}
                                                onChange={(e) => setOtp(e.target.value.replace(/\s/g, ""))}
                                                aria-invalid={Boolean(otpError)}
                                                aria-describedby={otpError ? "signup-otp-error" : undefined}
                                            />
                                        </div>
                                        {otpError && (
                                            <p className="bc-field-error" id="signup-otp-error">
                                                <AlertCircle size={13} />
                                                {otpError}
                                            </p>
                                        )}
                                    </div>

                                    <button type="submit" className="bc-submit" disabled={otpSubmitting}>
                                        {otpSubmitting ? (
                                            <>
                                                <Loader2 size={17} style={{ animation: "spin 0.8s linear infinite" }} />
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

                                <p className="bc-footer-line">
                                    Wrong email?{" "}
                                    <button
                                        type="button"
                                        className="bc-link-quiet"
                                        style={{
                                            background: "none",
                                            border: "none",
                                            cursor: "pointer",
                                            color: "var(--bc-accent-strong)",
                                            fontWeight: 600,
                                        }}
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
                <div className="bc-scene" aria-hidden="true">
                    <svg
                        className="bc-scene-svg"
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
                                <stop offset="100%" stopColor={mode === "day" ? "#FCEBC7" : "#123B39"} stopOpacity="0" />
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
                            <path className="bc-wind-path" d="M -20 220 C 90 202, 150 240, 260 218 S 470 200, 520 216" />
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

                    <div className="bc-scene-content">
                        <div className="bc-brand">
                            <span className="bc-brand-mark">
                                <Wind size={18} strokeWidth={2.25} />
                            </span>
                            <span className="bc-brand-name">{companyName}</span>
                        </div>

                        <div className="bc-scene-copy">
                            <p className="bc-scene-eyebrow">Environmental intelligence</p>
                            <h2 className="bc-scene-heading">Every breath, better understood.</h2>
                            <p className="bc-scene-sub">
                                Join {companyName} for live AQI, hyperlocal forecasts, and alerts that adapt
                                to the air around you — wherever you are.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Signup;