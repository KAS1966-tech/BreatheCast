import React, { useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import {
    Sun,
    Wind,
    Thermometer,
    Droplets,
    Navigation,
    Gauge,
    CloudRain,
    Factory,
    Activity,
    CalendarDays,
    Calendar,
    CloudSun,
    ChevronDown,
    Check,
    AlertCircle,
    Loader2,
    RotateCcw,
    ArrowRight,
    Sparkles,
} from "lucide-react";

import { useAppDispatch, useAppSelector } from "../app/redux";
import {
    predictAQI,
    setInputState,
    setResultState,
    updateInputField,
    resetState,
} from "../app/features/prediction/aqiSlice";
import { schema as fieldSchema } from "../hooks/schema/aqiSchema";
import type { FieldConfig } from "../hooks/types/field.type";
import type { InputState } from "../hooks/types/aqiSchema.type";
import { companyName } from "../core/config";
import { useSEO } from "../utils/useSeo";
import { useGoogleFont } from "../utils/useGoogleFont";
import Navbar from "../components/Navbar";

// ---------------------------------------------------------------------------
const STORAGE_KEY = "breathecast:aqi-synthesis-form:v1";

interface StoredAqiData {
    inputState: InputState;
    lastPrediction?: number;
    savedAt?: string;
}

type AtmosphereKey =
    | "default"
    | "loading"
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
    description: string;
    color: string | null;
}

type InputRecord = Record<string, number>;

function readField(input: InputState, name: string): number {
    return (input as unknown as InputRecord)[name];
}

function clamp(value: number, min: number, max: number): number {
    if (Number.isNaN(value)) return min;
    return Math.min(max, Math.max(min, value));
}

function formatNumber(value: number, step?: number): string {
    if (!Number.isFinite(value)) return "";
    const decimals = step && step < 1 ? (String(step).split(".")[1]?.length ?? 2) : 0;
    return decimals > 0 ? value.toFixed(Math.min(decimals, 2)) : String(Math.round(value));
}

function selectValueToLabel(
    fieldName: string,
    options: string[] | number[],
    value: number
): string | number {
    const offset = fieldName === "Month" ? 1 : 0;
    return options[value - offset] ?? options[0] ?? "";
}

function selectLabelToValue(
    fieldName: string,
    options: string[] | number[],
    label: string | number
): number {
    const idx = options.indexOf(label as unknown as never);
    const offset = fieldName === "Month" ? 1 : 0;
    return (idx === -1 ? 0 : idx) + offset;
}

function isFieldValid(field: FieldConfig, input: InputState): boolean {
    const raw = readField(input, field.name);

    if (field.type === "number") {
        if (typeof raw !== "number" || Number.isNaN(raw)) return false;
        if (field.min !== undefined && raw < field.min) return false;
        if (field.max !== undefined && raw > field.max) return false;
        return true;
    }

    if (field.type === "select") {
        if (typeof raw !== "number" || Number.isNaN(raw)) return false;
        const count = field.options?.length ?? 0;
        const offset = field.name === "Month" ? 1 : 0;
        return raw >= offset && raw <= count - 1 + offset;
    }

    return true;
}

function isValidStoredInputState(
    candidate: unknown,
    schema: FieldConfig[]
): candidate is InputState {
    if (!candidate || typeof candidate !== "object") return false;
    return schema.every((field) => isFieldValid(field, candidate as InputState));
}

function getAqiCategory(prediction: number): AtmosphereInfo {
    const p = Number.isFinite(prediction) ? prediction : 0;

    if (p < 8) {
        return {
            key: "extreme-clean",
            label: "Ultra-Clean Air",
            shortLabel: "Ultra-clean",
            color: "#10B981",
            description:
                "Exceptionally clear conditions — beyond the platform's typical measured range.",
        };
    }

    if (p <= 50) {
        return {
            key: "clean",
            label: "Pristine & Clean",
            shortLabel: "Pristine",
            color: "#10B981",
            description: "Crisp, high-clarity air with minimal particulate presence.",
        };
    }

    if (p <= 100) {
        return {
            key: "moderate",
            label: "Moderate Haze",
            shortLabel: "Moderate",
            color: "#F59E0B",
            description: "A light atmospheric haze. Air quality is generally acceptable.",
        };
    }

    if (p <= 150) {
        return {
            key: "elevated",
            label: "Elevated Smog",
            shortLabel: "Elevated",
            color: "#F97316",
            description:
                "Noticeable particulate load — sensitive groups should take care outdoors.",
        };
    }

    if (p <= 205) {
        return {
            key: "heavy",
            label: "Heavy Pollution",
            shortLabel: "Heavy",
            color: "#EF4444",
            description: "Dense pollutant concentration across the monitored area.",
        };
    }

    return {
        key: "extreme-heavy",
        label: "Extreme Pollution",
        shortLabel: "Extreme",
        color: "#EF4444",
        description: "Severe conditions, beyond the platform's typical measured range.",
    };
}

const DEFAULT_ATMOSPHERE: AtmosphereInfo = {
    key: "default",
    label: "Standing By",
    shortLabel: "Ready",
    color: null,
    description: "Ready to synthesize environmental conditions from your inputs.",
};

const LOADING_ATMOSPHERE: AtmosphereInfo = {
    key: "loading",
    label: "Synthesizing",
    shortLabel: "Analyzing",
    color: null,
    description: "Analyzing atmospheric conditions…",
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
        case "loading":
            return {
                particleCount: 12,
                particleDuration: [8, 13],
                mistColor: brandAccent,
                mistOpacity: 0.1,
                windColor: brandAccent,
                windOpacity: 0.42,
                windDuration: 3.2,
                horizonOpacity: 0.62,
                turbulent: false,
            };

        case "extreme-clean":
            return {
                particleCount: 8,
                particleDuration: [20, 30],
                mistColor: "#10B981",
                mistOpacity: 0.04,
                windColor: "#10B981",
                windOpacity: 0.22,
                windDuration: 7.5,
                horizonOpacity: 0.78,
                turbulent: false,
            };

        case "clean":
            return {
                particleCount: 9,
                particleDuration: [17, 27],
                mistColor: "#10B981",
                mistOpacity: 0.07,
                windColor: "#10B981",
                windOpacity: 0.26,
                windDuration: 6.4,
                horizonOpacity: 0.72,
                turbulent: false,
            };

        case "moderate":
            return {
                particleCount: 12,
                particleDuration: [12, 19],
                mistColor: "#E7E2D6",
                mistOpacity: 0.3,
                windColor: "#B8A98C",
                windOpacity: 0.34,
                windDuration: 5,
                horizonOpacity: 0.58,
                turbulent: false,
            };

        case "elevated":
            return {
                particleCount: 15,
                particleDuration: [7, 12],
                mistColor: "#F97316",
                mistOpacity: 0.32,
                windColor: "#F97316",
                windOpacity: 0.4,
                windDuration: 3,
                horizonOpacity: 0.48,
                turbulent: true,
            };

        case "heavy":
            return {
                particleCount: 18,
                particleDuration: [4.5, 8],
                mistColor: "#3B1210",
                mistOpacity: 0.5,
                windColor: "#EF4444",
                windOpacity: 0.48,
                windDuration: 2.1,
                horizonOpacity: 0.4,
                turbulent: true,
            };

        case "extreme-heavy":
            return {
                particleCount: 18,
                particleDuration: [3.4, 6],
                mistColor: "#2B0B0B",
                mistOpacity: 0.62,
                windColor: "#EF4444",
                windOpacity: 0.55,
                windDuration: 1.7,
                horizonOpacity: 0.34,
                turbulent: true,
            };

        default:
            return {
                particleCount: 9,
                particleDuration: [16, 25],
                mistColor: brandAccent,
                mistOpacity: 0,
                windColor: brandAccent,
                windOpacity: 0.28,
                windDuration: 6,
                horizonOpacity: 0.72,
                turbulent: false,
            };
    }
}

const FIELD_GROUPS: { title: string; icon: React.ReactNode; fields: string[] }[] = [
    {
        title: "Weather Conditions",
        icon: <CloudSun size={17} />,
        fields: ["Temperature_C", "Humidity_pct", "WindSpeed_kmh", "WindDirection_deg"],
    },
    {
        title: "Atmospheric Conditions",
        icon: <Gauge size={17} />,
        fields: ["Pressure_hPa", "SolarRadiation_Wm2", "Rainfall_mm"],
    },
    {
        title: "Environmental Factors",
        icon: <Factory size={17} />,
        fields: ["TrafficDensityIndex", "ProximityIndustrialZone_km"],
    },
    {
        title: "Time Context",
        icon: <CalendarDays size={17} />,
        fields: ["DayOfWeek", "Month"],
    },
];

const FIELD_ICONS: Record<string, React.ReactNode> = {
    Temperature_C: <Thermometer size={15} />,
    Humidity_pct: <Droplets size={15} />,
    WindSpeed_kmh: <Wind size={15} />,
    WindDirection_deg: <Navigation size={15} />,
    Pressure_hPa: <Gauge size={15} />,
    SolarRadiation_Wm2: <Sun size={15} />,
    Rainfall_mm: <CloudRain size={15} />,
    TrafficDensityIndex: <Activity size={15} />,
    ProximityIndustrialZone_km: <Factory size={15} />,
    DayOfWeek: <CalendarDays size={15} />,
    Month: <Calendar size={15} />,
};

const btnBase =
    "inline-flex items-center justify-center gap-2 rounded-[10px] text-[14.5px] font-semibold px-[18px] py-[13px] cursor-pointer transition-[transform,box-shadow,opacity,border-color] duration-150";

const ghostBtn = `${btnBase} border-[1.5px] border-(--bc-border) bg-(--bc-surface) text-(--bc-ink-soft) backdrop-blur-sm enabled:hover:text-(--bc-ink) enabled:hover:border-(--bc-border-strong) enabled:hover:bg-(--bc-surface-2) disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--bc-accent)]`;

const primaryBtn = `${btnBase} flex-1 border-none bg-[var(--bc-accent-strong)] text-[#F4FBF9] shadow-[0_10px_30px_-12px_color-mix(in_srgb,var(--bc-accent-strong)_60%,transparent)] enabled:hover:-translate-y-px disabled:opacity-60 disabled:cursor-not-allowed disabled:shadow-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-[var(--bc-ink)]`;

/* --------------------------------------------------------------------- */
/* NumberField — schema-driven numeric control with a live range fill.   */
/* --------------------------------------------------------------------- */
interface NumberFieldProps {
    field: FieldConfig;
    value: number;
    showError: boolean;
    onCommit: (value: number) => void;
    onTouch: () => void;
}

const NumberField: React.FC<NumberFieldProps> = ({
    field,
    value,
    showError,
    onCommit,
    onTouch,
}) => {
    const [draft, setDraft] = useState<string | null>(null);

    const min = field.min ?? -Infinity;
    const max = field.max ?? Infinity;
    const step = field.step ?? 1;

    const displayValue = draft ?? formatNumber(value, step);
    const pct =
        max > min ? clamp(((clamp(value, min, max) - min) / (max - min)) * 100, 0, 100) : 0;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const raw = e.target.value;
        setDraft(raw);

        if (raw.trim() === "" || raw === "-") return;

        const parsed = Number(raw);
        if (!Number.isNaN(parsed)) onCommit(parsed);
    };

    const handleBlur = () => {
        onTouch();

        const parsed = draft === null ? NaN : Number(draft);
        if (draft === null || draft.trim() === "" || Number.isNaN(parsed)) {
            setDraft(null);
            return;
        }

        onCommit(clamp(parsed, min, max));
        setDraft(null);
    };

    const shellClasses = [
        "relative flex items-center justify-between rounded-[10px] bg-(--bc-surface-2) min-h-[42px] backdrop-blur-sm border-[1.5px] transition-[border-color,box-shadow,background-color] duration-[180ms] focus-within:outline-none",
        showError
            ? "border-[var(--bc-danger)] focus-within:shadow-[0_0_0_4px_color-mix(in_srgb,var(--bc-danger)_22%,transparent)]"
            : "border-(--bc-border) focus-within:border-[var(--bc-accent)] focus-within:shadow-[0_0_0_4px_var(--bc-focus-ring)]",
    ].join(" ");

    return (
        <div className="min-w-0 relative">
            <label
                htmlFor={`aqi-${field.name}`}
                className="flex items-center gap-1.5 text-[12.5px] font-semibold text-(--bc-ink) mb-1.75"
            >
                <span className="inline-flex text-(--bc-ink-faint)">
                    {FIELD_ICONS[field.name]}
                </span>
                {field.label}
            </label>

            <div className={shellClasses}>
                <input
                    id={`aqi-${field.name}`}
                    name={field.name}
                    type="number"
                    inputMode="decimal"
                    className="aqi-input flex-1 min-w-0 border-none bg-transparent outline-none px-3 text-[14.5px] text-(--bc-ink) h-full"
                    min={field.min}
                    max={field.max}
                    step={step}
                    value={displayValue}
                    onFocus={() => setDraft(formatNumber(value, step))}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    aria-invalid={showError}
                    aria-describedby={showError ? `aqi-${field.name}-error` : undefined}
                />
                <span className="shrink-0 pr-3 text-[11px] text-(--bc-ink-faint) whitespace-nowrap">
                    {field.min}–{field.max}
                </span>
            </div>

            <div
                className="relative h-1 rounded-full bg-(--bc-track) mt-2 overflow-hidden"
                aria-hidden="true"
            >
                <span
                    className="absolute inset-0 bg-(--bc-accent) rounded-full origin-left transition-transform duration-250"
                    style={{ transform: `scaleX(${pct / 100})` }}
                />
            </div>

            {showError && (
                <p
                    className="flex items-center gap-1.5 mt-1.75 text-xs text-(--bc-danger)"
                    id={`aqi-${field.name}-error`}
                >
                    <AlertCircle size={12} />
                    Enter a value between {field.min} and {field.max}.
                </p>
            )}
        </div>
    );
};

/* --------------------------------------------------------------------- */
/* CustomSelect — accessible listbox for Day / Month.                    */
/* --------------------------------------------------------------------- */
interface CustomSelectProps {
    fieldId: string;
    label: string;
    icon: React.ReactNode;
    options: string[] | number[];
    value: string | number;
    onChange: (label: string | number) => void;
}

const CustomSelect: React.FC<CustomSelectProps> = ({
    fieldId,
    label,
    icon,
    options,
    value,
    onChange,
}) => {
    const [open, setOpen] = useState(false);
    const [activeIndex, setActiveIndex] = useState(() =>
        Math.max(0, options.indexOf(value as unknown as never))
    );
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;

        const handleClick = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, [open]);

    const commit = (index: number) => {
        const next = options[index];
        if (next !== undefined) onChange(next);
        setOpen(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (!open) {
            if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setOpen(true);
            }
            return;
        }

        if (e.key === "ArrowDown") {
            e.preventDefault();
            setActiveIndex((i) => Math.min(options.length - 1, i + 1));
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActiveIndex((i) => Math.max(0, i - 1));
        } else if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            commit(activeIndex);
        } else if (e.key === "Escape") {
            e.preventDefault();
            setOpen(false);
        }
    };

    const triggerClasses = [
        "aqi-select-trigger relative flex w-full items-center justify-between rounded-[10px] bg-(--bc-surface-2) min-h-[42px] backdrop-blur-sm px-3 text-[14.5px] text-(--bc-ink) cursor-pointer outline-none border-[1.5px] transition-[border-color,box-shadow,background-color] duration-[180ms]",
        open
            ? "is-open border-[var(--bc-accent)] shadow-[0_0_0_4px_var(--bc-focus-ring)]"
            : "border-(--bc-border) hover:border-(--bc-border-strong) hover:bg-(--bc-surface) focus-visible:border-[var(--bc-accent)] focus-visible:shadow-[0_0_0_4px_var(--bc-focus-ring)]",
    ].join(" ");

    return (
        <div className="min-w-0 relative" ref={containerRef}>
            <span
                id={`${fieldId}-label`}
                className="flex items-center gap-1.5 text-[12.5px] font-semibold text-(--bc-ink) mb-1.75"
            >
                <span className="inline-flex text-(--bc-ink-faint)">{icon}</span>
                {label}
            </span>

            <button
                type="button"
                id={fieldId}
                className={triggerClasses}
                onClick={() => {
                    setOpen((o) => {
                        const nextOpen = !o;
                        if (nextOpen) {
                            setActiveIndex(Math.max(0, options.indexOf(value as unknown as never)));
                        }
                        return nextOpen;
                    });
                }}
                onKeyDown={handleKeyDown}
                aria-haspopup="listbox"
                aria-expanded={open}
                aria-labelledby={`${fieldId}-label ${fieldId}`}
            >
                <span>{value}</span>
                <ChevronDown
                    size={16}
                    className={`shrink-0 text-(--bc-ink-faint) transition-transform duration-200 ease-in-out ${open ? "rotate-180" : ""
                        }`}
                />
            </button>

            {open && (
                <ul
                    className="aqi-select-list absolute z-1000 top-full left-0 right-0 mt-1.5 p-1.5 list-none w-full max-h-60 overflow-y-auto bg-(--bc-surface) border border-(--bc-border-strong) rounded-[10px] shadow-[0_18px_40px_-20px_rgba(9,30,34,0.25)] animate-[aqi-dropdown-in_0.15s_cubic-bezier(0.16,1,0.3,1)] backdrop-blur-md [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-(--bc-border-strong) [&::-webkit-scrollbar-thumb]:rounded-full"
                    role="listbox"
                    aria-labelledby={`${fieldId}-label`}
                    tabIndex={-1}
                >
                    {options.map((opt, index) => {
                        const optionClasses = [
                            "aqi-select-option flex items-center gap-2 px-2.5 py-2 rounded-[7px] text-sm cursor-pointer transition-[background-color,color] duration-[150ms]",
                            index === activeIndex
                                ? "is-active bg-(--bc-accent) text-white"
                                : opt === value
                                    ? "is-selected text-(--bc-accent-strong) font-semibold bg-[color-mix(in_srgb,var(--bc-accent)_8%,transparent)]"
                                    : "text-(--bc-ink-soft) hover:bg-(--bc-surface-2) hover:text-(--bc-ink)",
                        ].join(" ");

                        return (
                            <li
                                key={opt}
                                role="option"
                                aria-selected={opt === value}
                                className={optionClasses}
                                onMouseEnter={() => setActiveIndex(index)}
                                onClick={() => commit(index)}
                            >
                                {opt === value ? <Check size={14} /> : <span className="inline-block w-3.5" />}
                                <span>{opt}</span>
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
};

/* --------------------------------------------------------------------- */
/* AtmosphereScene — the manually built SVG environment.                 */
/* --------------------------------------------------------------------- */
interface AtmosphereSceneProps {
    isDark: boolean;
    atmosphere: AtmosphereInfo;
    isLoading: boolean;
    progressPct: number;
    compact?: boolean;
}

const RADIUS = 90;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const AtmosphereScene: React.FC<AtmosphereSceneProps> = ({
    isDark,
    atmosphere,
    isLoading,
    progressPct,
}) => {
    const visual = getAtmosphereVisual(atmosphere.key, isDark);
    const gaugeColor = atmosphere.color ?? (isDark ? "#4FD8C4" : "#10B981");
    const showGauge = atmosphere.key !== "default" && atmosphere.key !== "loading";
    const dashOffset =
        CIRCUMFERENCE * (1 - (showGauge ? clamp(progressPct, 0, 100) : 0) / 100);

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
                delay: -(i * 1.2),
                dur: 3 + (i % 4),
            })),
        []
    );

    return (
        <div
            className="aqi-scene relative overflow-hidden w-full h-full"
            data-atmosphere={atmosphere.key}
            aria-hidden="true"
        >
            <svg
                className="aqi-scene-svg absolute inset-0 w-full h-full"
                viewBox="0 0 480 480"
                preserveAspectRatio="xMidYMid slice"
                focusable="false"
            >
                <defs>
                    <linearGradient id="aqi-sky" x1="0" y1="0" x2="0" y2="1">
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
                </defs>

                <rect x="0" y="0" width="480" height="480" fill="url(#aqi-sky)" />
                <rect
                    x="0"
                    y="0"
                    width="480"
                    height="480"
                    style={{
                        fill: visual.mistColor,
                        opacity: visual.mistOpacity,
                        transition: "fill 1.1s ease, opacity 1.1s ease",
                    }}
                />

                {isDark &&
                    stars.map((s) => (
                        <circle
                            key={s.id}
                            className="aqi-star"
                            cx={(s.cx / 100) * 480}
                            cy={(s.cy / 100) * 480}
                            r={s.r}
                            fill="#EAF4F2"
                            style={{ animationDuration: `${s.dur}s`, animationDelay: `${s.delay}s` }}
                        />
                    ))}

                {/* Signature element: the AQI horizon arc, now a live gauge */}
                <g transform="translate(150, 60)">
                    <circle
                        cx="90"
                        cy="90"
                        r={RADIUS + 14}
                        fill="none"
                        stroke={gaugeColor}
                        strokeOpacity="0.14"
                        strokeWidth="1"
                        className="aqi-arc-glow"
                    />
                    <circle
                        cx="90"
                        cy="90"
                        r={RADIUS}
                        fill="none"
                        stroke={gaugeColor}
                        strokeOpacity="0.16"
                        strokeWidth="10"
                    />
                    <circle
                        cx="90"
                        cy="90"
                        r={RADIUS}
                        fill="none"
                        stroke={gaugeColor}
                        strokeWidth="10"
                        strokeLinecap="round"
                        transform="rotate(-90 90 90)"
                        style={{
                            strokeDasharray: CIRCUMFERENCE,
                            strokeDashoffset: dashOffset,
                            transition: "stroke-dashoffset 1.1s ease, stroke 0.8s ease",
                            opacity: showGauge ? 1 : 0,
                        }}
                    />

                    {isLoading && (
                        <circle
                            cx="90"
                            cy="90"
                            r={RADIUS}
                            fill="none"
                            stroke={gaugeColor}
                            strokeWidth="10"
                            strokeLinecap="round"
                            strokeDasharray={`${CIRCUMFERENCE * 0.16} ${CIRCUMFERENCE}`}
                            className="aqi-arc-scan"
                            transform="rotate(-90 90 90)"
                        />
                    )}
                </g>

                {/* Wind-flow lines */}
                <g
                    fill="none"
                    strokeLinecap="round"
                    strokeWidth="2"
                    style={{
                        stroke: visual.windColor,
                        strokeOpacity: visual.windOpacity,
                        transition: "stroke 1s ease, stroke-opacity 1s ease",
                    }}
                >
                    <path
                        className="aqi-wind"
                        style={{ animationDuration: `${visual.windDuration}s` }}
                        d="M -20 250 C 90 232, 150 268, 260 248 S 470 230, 520 246"
                    />
                    <path
                        className="aqi-wind"
                        style={{
                            animationDuration: `${visual.windDuration}s`,
                            animationDelay: "-1.4s",
                        }}
                        d="M -30 288 C 80 302, 170 274, 250 292 S 440 306, 520 286"
                    />

                    {visual.turbulent && (
                        <path
                            className="aqi-wind"
                            style={{
                                animationDuration: `${visual.windDuration * 0.8}s`,
                                animationDelay: "-0.6s",
                            }}
                            d="M -10 318 C 70 340, 140 300, 220 326 S 400 344, 520 314"
                        />
                    )}
                </g>

                {/* Clean-air / AQI particles */}
                {particles.slice(0, visual.particleCount).map((p) => {
                    const [minDur, maxDur] = visual.particleDuration;
                    const dur = minDur + (((p.id * 13) % 100) / 100) * (maxDur - minDur);

                    return (
                        <circle
                            key={p.id}
                            className="aqi-particle"
                            cx={(p.cx / 100) * 480}
                            cy={(p.cy / 100) * 480}
                            r={p.r}
                            style={{
                                fill: gaugeColor,
                                fillOpacity: 0.55,
                                animationDuration: `${dur}s`,
                                animationDelay: `${p.delay}s`,
                                transition: "fill 1s ease",
                            }}
                        />
                    );
                })}

                {/* Horizon */}
                <path
                    d="M0 360 C 120 340, 360 380, 480 352 L480 480 L0 480 Z"
                    style={{
                        fill: gaugeColor,
                        opacity: visual.horizonOpacity * 0.28,
                        transition: "opacity 1.1s ease, fill 1s ease",
                    }}
                />
                <path
                    d="M0 380 C 120 362, 360 398, 480 372 L480 480 L0 480 Z"
                    fill={isDark ? "#081215" : "#A7F3D0"}
                    opacity={isDark ? 0.85 : 0.65}
                />
            </svg>
        </div>
    );
};

/* --------------------------------------------------------------------- */
/* Main page component                                                   */
/* --------------------------------------------------------------------- */
const AqiPrediction: React.FC = () => {
    const dispatch = useAppDispatch();
    const mode = useAppSelector((state) => state.theme.mode);
    const inputState = useAppSelector((state) => state.aqi.inputState) as InputState;
    const { result, error, loading } = useAppSelector((state) => state.aqi);
    const isDark = mode === "dark";

    useSEO(
        `Atmospheric Synthesis Engine — ${companyName}`,
        `Ingest multi-variable environmental data in ${companyName} to project real-time AQI predictions and visualize the resulting atmosphere.`
    );

    useGoogleFont("Fraunces");
    useGoogleFont("Plus Jakarta Sans");

    const [touched, setTouched] = useState<Record<string, boolean>>({});
    const [submitAttempted, setSubmitAttempted] = useState(false);
    const [resultSource, setResultSource] = useState<"restored" | "fresh" | null>(null);

    const fieldByName = useMemo(() => {
        const map: Record<string, FieldConfig> = {};
        fieldSchema.forEach((f) => {
            map[f.name] = f;
        });
        return map;
    }, []);

    // ---- Restore from localStorage on mount ----
    useEffect(() => {
        try {
            const raw = window.localStorage.getItem(STORAGE_KEY);
            if (!raw) return;

            const parsed = JSON.parse(raw) as Partial<StoredAqiData>;

            if (isValidStoredInputState(parsed.inputState, fieldSchema)) {
                dispatch(setInputState(parsed.inputState));

                if (
                    typeof parsed.lastPrediction === "number" &&
                    Number.isFinite(parsed.lastPrediction)
                ) {
                    dispatch(setResultState({ prediction: parsed.lastPrediction }));
                    setResultSource("restored");
                }
            }
        } catch {
            // Malformed storage — fall back to Redux defaults silently.
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ---- Keep localStorage in sync with the latest inputs / prediction ----
    useEffect(() => {
        try {
            const payload: StoredAqiData = {
                inputState,
                lastPrediction: result?.prediction,
                savedAt: new Date().toISOString(),
            };

            window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
        } catch {
            // Storage unavailable (e.g. private browsing) — safe to ignore.
        }
    }, [inputState, result]);

    // ---- Toast once per loading -> settled transition ----
    const prevLoadingRef = useRef(loading);

    useEffect(() => {
        if (prevLoadingRef.current && !loading) {
            if (error) {
                toast.error(error);
            } else if (result) {
                toast.success("Air quality analysis complete.");
                setResultSource("fresh");
            }
        }

        prevLoadingRef.current = loading;
    }, [loading, error, result]);

    const isFormValid = useMemo(
        () => fieldSchema.every((field) => isFieldValid(field, inputState)),
        [inputState]
    );

    const handleNumberCommit = (name: keyof InputState, value: number) => {
        dispatch(updateInputField({ field: name, value }));
    };

    const handleSelectCommit = (field: FieldConfig, label: string | number) => {
        const value = selectLabelToValue(field.name, field.options ?? [], label);
        dispatch(updateInputField({ field: field.name as keyof InputState, value }));
    };

    const handleTouch = (name: string) =>
        setTouched((prev) => ({ ...prev, [name]: true }));

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitAttempted(true);

        if (!isFormValid) {
            const allTouched: Record<string, boolean> = {};
            fieldSchema.forEach((f) => {
                allTouched[f.name] = true;
            });
            setTouched(allTouched);
            toast.error("Check the highlighted fields before analyzing.");
            return;
        }

        if (loading) return;
        dispatch(predictAQI(inputState));
    };

    const handleReset = () => {
        dispatch(resetState());
        setTouched({});
        setSubmitAttempted(false);
        setResultSource(null);
        toast.success("Form reset to default conditions.");
    };

    const atmosphere: AtmosphereInfo = loading
        ? LOADING_ATMOSPHERE
        : result
            ? getAqiCategory(result.prediction)
            : DEFAULT_ATMOSPHERE;

    const progressPct = result ? clamp((result.prediction / 205) * 100, 4, 100) : 0;

    const summaryChips = [
        {
            label: "Temp",
            value: `${formatNumber(readField(inputState, "Temperature_C"), 0.1)}°C`,
        },
        {
            label: "Humidity",
            value: `${formatNumber(readField(inputState, "Humidity_pct"), 0.1)}%`,
        },
        {
            label: "Wind",
            value: `${formatNumber(readField(inputState, "WindSpeed_kmh"), 0.1)} km/h`,
        },
        {
            label: "When",
            value: `${selectValueToLabel(
                "DayOfWeek",
                fieldByName.DayOfWeek?.options ?? [],
                readField(inputState, "DayOfWeek")
            )}, ${selectValueToLabel(
                "Month",
                fieldByName.Month?.options ?? [],
                readField(inputState, "Month")
            )}`,
        },
    ];

    return (
        <div
            className="aqi-root min-h-screen w-full"
            data-theme={isDark ? "dark" : "day"}
            style={{ fontFamily: "var(--bc-font-body)" }}
        >
            <style>{`
        .aqi-root *,
        .aqi-root *::before,
        .aqi-root *::after {
          box-sizing: border-box;
        }

        .aqi-root[data-theme='day'] {
          --bc-bg: #F8FAFC;
          --bc-surface: rgba(255, 255, 255, 0.85);
          --bc-surface-2: rgba(240, 253, 244, 0.85);
          --bc-ink: #0F2827;
          --bc-ink-soft: #4A6665;
          --bc-ink-faint: #8DA3A2;
          --bc-accent: #10B981;
          --bc-accent-strong: #059669;
          --bc-border: rgba(16, 185, 129, 0.25);
          --bc-border-strong: rgba(16, 185, 129, 0.45);
          --bc-danger: #DC2626;
          --bc-danger-bg: rgba(220, 38, 38, 0.08);
          --bc-focus-ring: rgba(16, 185, 129, 0.35);
          --bc-track: rgba(16, 185, 129, 0.12);
        }

        .aqi-root[data-theme='dark'] {
          --bc-bg: #0A1418;
          --bc-surface: rgba(16, 28, 33, 0.85);
          --bc-surface-2: rgba(12, 26, 30, 0.85);
          --bc-ink: #E7F1F0;
          --bc-ink-soft: #93ACB0;
          --bc-ink-faint: #5E767B;
          --bc-accent: #4FD8C4;
          --bc-accent-strong: #7EE9DA;
          --bc-border: rgba(231, 241, 240, 0.2);
          --bc-border-strong: rgba(231, 241, 240, 0.35);
          --bc-danger: #FF6B57;
          --bc-danger-bg: rgba(255, 107, 87, 0.1);
          --bc-focus-ring: rgba(79, 216, 196, 0.38);
          --bc-track: rgba(231, 241, 240, 0.1);
        }

        @keyframes aqi-dropdown-in {
          from {
            opacity: 0;
            transform: translateY(-8px) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes aqi-float {
          0%, 100% {
            transform: translate3d(0, 0, 0);
            opacity: 0.5;
          }
          50% {
            transform: translate3d(0, -13px, 0);
            opacity: 0.95;
          }
        }

        @keyframes aqi-wind-flow {
          from {
            stroke-dashoffset: 240;
          }
          to {
            stroke-dashoffset: 0;
          }
        }

        @keyframes aqi-twinkle {
          0%, 100% {
            opacity: 0.15;
          }
          50% {
            opacity: 0.9;
          }
        }

        @keyframes aqi-arc-pulse {
          0%, 100% {
            opacity: 0.45;
          }
          50% {
            opacity: 0.9;
          }
        }

        @keyframes aqi-scan-rotate {
          from {
            transform: rotate(-90deg);
          }
          to {
            transform: rotate(270deg);
          }
        }

        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        .aqi-particle {
          animation-name: aqi-float;
          animation-timing-function: ease-in-out;
          animation-iteration-count: infinite;
          transform-box: fill-box;
          transform-origin: center;
        }

        .aqi-wind {
          stroke-dasharray: 8 14;
          animation-name: aqi-wind-flow;
          animation-timing-function: linear;
          animation-iteration-count: infinite;
        }

        .aqi-star {
          animation: aqi-twinkle ease-in-out infinite;
          transform-box: fill-box;
          transform-origin: center;
        }

        .aqi-arc-glow {
          animation: aqi-arc-pulse 5s ease-in-out infinite;
        }

        .aqi-arc-scan {
          transform-box: fill-box;
          transform-origin: center;
          animation: aqi-scan-rotate 1.6s linear infinite;
          opacity: 0.85;
        }

        .aqi-input::-webkit-outer-spin-button,
        .aqi-input::-webkit-inner-spin-button {
          opacity: 0.6;
        }

        .aqi-group:has(.is-open) {
          position: relative;
          z-index: 10;
        }

        @media (prefers-reduced-motion: reduce) {
          .aqi-particle,
          .aqi-wind,
          .aqi-star,
          .aqi-arc-glow,
          .aqi-arc-scan,
          .aqi-select-list {
            animation: none !important;
          }
        }
      `}</style>
            <header>
                <Navbar />
            </header>
            <main className="bg-(--bc-bg) text-(--bc-ink) min-h-screen transition-colors duration-400">
                {/* ✨ FULL-SCREEN BACKGROUND ANIMATION ✨ */}
                <div className="fixed inset-0 z-0 w-screen h-screen pointer-events-none">
                    <AtmosphereScene
                        isDark={isDark}
                        atmosphere={atmosphere}
                        isLoading={loading}
                        progressPct={progressPct}
                    />
                </div>

                {/* ✨ FOREGROUND CONTENT (Sits above background) ✨ */}
                <div className="relative z-1">

                    <section className="max-w-310 mx-auto px-5 pt-2 pb-5 md:px-10 md:pb-8 md:max-w-190">
                        <p className="text-xs tracking-[0.14em] uppercase text-(--bc-accent-strong) font-semibold m-0 mb-2.5">
                            Environmental Intelligence
                        </p>
                        <h1 className="font-semibold text-[clamp(26px,4vw,38px)] leading-[1.15] m-0 mb-3">
                            Atmospheric Synthesis Engine
                        </h1>
                        <p className="text-[15px] leading-[1.6] text-(--bc-ink-soft) m-0 max-w-[60ch]">
                            Enter the environmental conditions below and {companyName} will synthesize a
                            real-time air quality prediction — and transform the atmosphere around it to
                            match.
                        </p>
                    </section>

                    <div className="max-w-310 mx-auto px-5 pt-2 pb-16 grid grid-cols-1 gap-7 sm:px-10 sm:pb-18 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-9 lg:items-start">
                        <div className="min-w-0">
                            <form onSubmit={handleSubmit} noValidate>
                                <fieldset className="border-none p-0 m-0 min-w-0 disabled:opacity-70" disabled={loading}>
                                    {FIELD_GROUPS.map((group) => (
                                        <section
                                            key={group.title}
                                            className="aqi-group bg-(--bc-surface) border border-(--bc-border) rounded-[18px] p-5 mb-4.5 backdrop-blur-md"
                                        >
                                            <div className="flex items-center gap-2.25 mb-4 text-(--bc-ink)">
                                                <span className="inline-flex text-(--bc-accent-strong)">
                                                    {group.icon}
                                                </span>
                                                <h2 className="text-[15px] font-bold m-0">{group.title}</h2>
                                            </div>

                                            <div className="grid grid-cols-1 gap-4 min-[560px]:grid-cols-2">
                                                {group.fields.map((name) => {
                                                    const field = fieldByName[name];
                                                    if (!field) return null;

                                                    const showError = Boolean(
                                                        (touched[name] || submitAttempted) &&
                                                        !isFieldValid(field, inputState)
                                                    );

                                                    if (field.type === "select") {
                                                        const currentLabel = selectValueToLabel(
                                                            field.name,
                                                            field.options ?? [],
                                                            readField(inputState, field.name)
                                                        );

                                                        return (
                                                            <CustomSelect
                                                                key={field.name}
                                                                fieldId={`aqi-${field.name}`}
                                                                label={field.label}
                                                                icon={FIELD_ICONS[field.name]}
                                                                options={field.options ?? []}
                                                                value={currentLabel}
                                                                onChange={(label) => handleSelectCommit(field, label)}
                                                            />
                                                        );
                                                    }

                                                    return (
                                                        <NumberField
                                                            key={field.name}
                                                            field={field}
                                                            value={readField(inputState, field.name)}
                                                            showError={showError}
                                                            onCommit={(value) =>
                                                                handleNumberCommit(field.name as keyof InputState, value)
                                                            }
                                                            onTouch={() => handleTouch(field.name)}
                                                        />
                                                    );
                                                })}
                                            </div>
                                        </section>
                                    ))}

                                    {error && (
                                        <div
                                            className="flex items-start gap-2 bg-(--bc-danger-bg) border border-[color-mix(in_srgb,var(--bc-danger)_35%,transparent)] text-(--bc-danger) rounded-[10px] px-3 py-2.5 text-[13px] mb-4.5 backdrop-blur-sm"
                                            role="alert"
                                        >
                                            <AlertCircle size={16} className="mt-px shrink-0" />
                                            <span>{error}</span>
                                        </div>
                                    )}

                                    <div className="flex gap-3 mt-1.5">
                                        <button type="button" className={ghostBtn} onClick={handleReset}>
                                            <RotateCcw size={16} />
                                            Reset
                                        </button>

                                        <button
                                            type="submit"
                                            className={primaryBtn}
                                            disabled={loading || !isFormValid}
                                        >
                                            {loading ? (
                                                <>
                                                    <Loader2
                                                        size={17}
                                                        className="animate-[spin_0.8s_linear_infinite]"
                                                    />
                                                    Analyzing…
                                                </>
                                            ) : (
                                                <>
                                                    Analyze Air Quality
                                                    <ArrowRight size={17} />
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </fieldset>
                            </form>
                        </div>

                        <aside className="relative lg:sticky lg:top-6">
                            <div
                                className="bg-(--bc-surface) border border-(--bc-border) rounded-[18px] p-5.5 text-center backdrop-blur-lg shadow-[0_20px_40px_-12px_rgba(0,0,0,0.1)]"
                                aria-live="polite"
                            >
                                {result && !loading ? (
                                    <>
                                        <span
                                            className="inline-flex items-center gap-1.5 text-xs font-bold tracking-[0.06em] uppercase px-2.5 py-1 rounded-full bg-[color-mix(in_srgb,currentColor_14%,transparent)]"
                                            style={{ color: atmosphere.color ?? undefined }}
                                        >
                                            {atmosphere.shortLabel}
                                        </span>

                                        <p className="text-[44px] font-semibold mt-3 mb-1 leading-none">
                                            {Math.round(result.prediction)}
                                            <span className="text-[15px] font-semibold text-(--bc-ink-faint) ml-1.5">
                                                AQI
                                            </span>
                                        </p>

                                        <p className="text-[13.5px] text-(--bc-ink-soft) m-0 mb-1.5 leading-normal">
                                            {atmosphere.description}
                                        </p>

                                        {resultSource === "restored" && (
                                            <p className="text-[11.5px] text-(--bc-ink-faint) m-0 mb-2.5 italic">
                                                Restored from your last analysis
                                            </p>
                                        )}

                                        <div className="flex flex-wrap gap-2 justify-center mt-3.5">
                                            {summaryChips.map((chip) => (
                                                <span
                                                    key={chip.label}
                                                    className="inline-flex flex-col items-center gap-0.5 border border-(--bc-border) rounded-[10px] px-2.5 py-1.75 min-w-17 bg-(--bc-surface-2)"
                                                >
                                                    <span className="text-[10px] uppercase tracking-wider text-(--bc-ink-faint)">
                                                        {chip.label}
                                                    </span>
                                                    <span className="text-[12.5px] font-semibold text-(--bc-ink)">
                                                        {chip.value}
                                                    </span>
                                                </span>
                                            ))}
                                        </div>
                                    </>
                                ) : loading ? (
                                    <p className="text-sm text-(--bc-ink-soft) mt-2.5 m-0">
                                        Analyzing atmospheric conditions…
                                    </p>
                                ) : (
                                    <>
                                        <Sparkles size={20} className="text-(--bc-accent-strong)" />
                                        <p className="text-sm text-(--bc-ink-soft) mt-2.5 m-0">
                                            Ready to synthesize environmental conditions.
                                        </p>
                                    </>
                                )}
                            </div>
                        </aside>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default AqiPrediction;