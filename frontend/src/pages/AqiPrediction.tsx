import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import {
    Sun,
    Moon,
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
import { toggleTheme } from "../app/features/theme/themeSlice";
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
import { AqiMark } from "../hooks/font/aqiLogo";
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

function selectValueToLabel(fieldName: string, options: string[] | number[], value: number): string | number {
    const offset = fieldName === "Month" ? 1 : 0;
    return options[value - offset] ?? options[0] ?? "";
}

function selectLabelToValue(fieldName: string, options: string[] | number[], label: string | number): number {
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

function isValidStoredInputState(candidate: unknown, schema: FieldConfig[]): candidate is InputState {
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
            description: "Exceptionally clear conditions — beyond the platform's typical measured range.",
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
            description: "Noticeable particulate load — sensitive groups should take care outdoors.",
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

const NumberField: React.FC<NumberFieldProps> = ({ field, value, showError, onCommit, onTouch }) => {
    const [draft, setDraft] = useState<string | null>(null);
    const min = field.min ?? -Infinity;
    const max = field.max ?? Infinity;
    const step = field.step ?? 1;
    const displayValue = draft ?? formatNumber(value, step);
    const pct = max > min ? clamp(((clamp(value, min, max) - min) / (max - min)) * 100, 0, 100) : 0;

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

    return (
        <div className="aqi-field">
            <label htmlFor={`aqi-${field.name}`} className="aqi-label">
                <span className="aqi-label-icon">{FIELD_ICONS[field.name]}</span>
                {field.label}
            </label>
            <div className={`aqi-input-shell${showError ? " is-invalid" : ""}`}>
                <input
                    id={`aqi-${field.name}`}
                    name={field.name}
                    type="number"
                    inputMode="decimal"
                    className="aqi-input"
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
                <span className="aqi-input-hint">
                    {field.min}–{field.max}
                </span>
            </div>
            <div className="aqi-range-track" aria-hidden="true">
                <span className="aqi-range-fill" style={{ transform: `scaleX(${pct / 100})` }} />
            </div>
            {showError && (
                <p className="aqi-field-error" id={`aqi-${field.name}-error`}>
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

const CustomSelect: React.FC<CustomSelectProps> = ({ fieldId, label, icon, options, value, onChange }) => {
    const [open, setOpen] = useState(false);
    const [activeIndex, setActiveIndex] = useState(() => Math.max(0, options.indexOf(value as unknown as never)));
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

    return (
        <div className="aqi-field" ref={containerRef}>
            <span id={`${fieldId}-label`} className="aqi-label">
                <span className="aqi-label-icon">{icon}</span>
                {label}
            </span>
            <button
                type="button"
                id={fieldId}
                className={`aqi-select-trigger${open ? " is-open" : ""}`}
                onClick={() => {
                    setOpen((o) => {
                        const nextOpen = !o;
                        if (nextOpen) setActiveIndex(Math.max(0, options.indexOf(value as unknown as never)));
                        return nextOpen;
                    });
                }}
                onKeyDown={handleKeyDown}
                aria-haspopup="listbox"
                aria-expanded={open}
                aria-labelledby={`${fieldId}-label ${fieldId}`}
            >
                <span>{value}</span>
                <ChevronDown size={16} className="aqi-select-chevron" />
            </button>
            {open && (
                <ul
                    className="aqi-select-list"
                    role="listbox"
                    aria-labelledby={`${fieldId}-label`}
                    tabIndex={-1}
                >
                    {options.map((opt, index) => (
                        <li
                            key={opt}
                            role="option"
                            aria-selected={opt === value}
                            className={`aqi-select-option${index === activeIndex ? " is-active" : ""}${opt === value ? " is-selected" : ""
                                }`}
                            onMouseEnter={() => setActiveIndex(index)}
                            onClick={() => commit(index)}
                        >
                            {opt === value ? <Check size={14} /> : <span className="aqi-select-spacer" />}
                            <span>{opt}</span>
                        </li>
                    ))}
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

const AtmosphereScene: React.FC<AtmosphereSceneProps> = ({ isDark, atmosphere, isLoading, progressPct }) => {
    const visual = getAtmosphereVisual(atmosphere.key, isDark);
    const gaugeColor = atmosphere.color ?? (isDark ? "#4FD8C4" : "#10B981");
    const showGauge = atmosphere.key !== "default" && atmosphere.key !== "loading";
    const dashOffset = CIRCUMFERENCE * (1 - (showGauge ? clamp(progressPct, 0, 100) : 0) / 100);

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
        <div className="aqi-scene" data-atmosphere={atmosphere.key} aria-hidden="true">
            <svg className="aqi-scene-svg" viewBox="0 0 480 480" preserveAspectRatio="xMidYMid slice" focusable="false">
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
                    style={{ fill: visual.mistColor, opacity: visual.mistOpacity, transition: "fill 1.1s ease, opacity 1.1s ease" }}
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
                    <circle cx="90" cy="90" r={RADIUS} fill="none" stroke={gaugeColor} strokeOpacity="0.16" strokeWidth="10" />
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
                    style={{ stroke: visual.windColor, strokeOpacity: visual.windOpacity, transition: "stroke 1s ease, stroke-opacity 1s ease" }}
                    strokeWidth="2"
                >
                    <path className="aqi-wind" style={{ animationDuration: `${visual.windDuration}s` }} d="M -20 250 C 90 232, 150 268, 260 248 S 470 230, 520 246" />
                    <path
                        className="aqi-wind"
                        style={{ animationDuration: `${visual.windDuration}s`, animationDelay: "-1.4s" }}
                        d="M -30 288 C 80 302, 170 274, 250 292 S 440 306, 520 286"
                    />
                    {visual.turbulent && (
                        <path
                            className="aqi-wind"
                            style={{ animationDuration: `${visual.windDuration * 0.8}s`, animationDelay: "-0.6s" }}
                            d="M -10 318 C 70 340, 140 300, 220 326 S 400 344, 520 314"
                        />
                    )}
                </g>

                {/* Clean-air / AQI particles */}
                {particles.slice(0, visual.particleCount).map((p) => {
                    const [minDur, maxDur] = visual.particleDuration;
                    const dur = minDur + ((p.id * 13) % 100) / 100 * (maxDur - minDur);
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
                    style={{ fill: gaugeColor, opacity: visual.horizonOpacity * 0.28, transition: "opacity 1.1s ease, fill 1s ease" }}
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
    useCallback(() => {
        try {
            const raw = window.localStorage.getItem(STORAGE_KEY);
            if (!raw) return;
            const parsed = JSON.parse(raw) as Partial<StoredAqiData>;
            if (isValidStoredInputState(parsed.inputState, fieldSchema)) {
                dispatch(setInputState(parsed.inputState));
                if (typeof parsed.lastPrediction === "number" && Number.isFinite(parsed.lastPrediction)) {
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
    useCallback(() => {
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

    const handleTouch = (name: string) => setTouched((prev) => ({ ...prev, [name]: true }));

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
        { label: "Temp", value: `${formatNumber(readField(inputState, "Temperature_C"), 0.1)}°C` },
        { label: "Humidity", value: `${formatNumber(readField(inputState, "Humidity_pct"), 0.1)}%` },
        { label: "Wind", value: `${formatNumber(readField(inputState, "WindSpeed_kmh"), 0.1)} km/h` },
        {
            label: "When",
            value: `${selectValueToLabel(
                "DayOfWeek",
                fieldByName.DayOfWeek?.options ?? [],
                readField(inputState, "DayOfWeek")
            )}, ${selectValueToLabel("Month", fieldByName.Month?.options ?? [], readField(inputState, "Month"))}`,
        },
    ];

    return (
        <div className="aqi-root" data-theme={isDark ? "dark" : "day"}>
            <style>{`
        .aqi-root {
            --bc-radius: 18px;
            --bc-radius-sm: 10px;
            --bc-font-display: 'Fraunces', 'Georgia', serif;
            --bc-font-body: 'Plus Jakarta Sans', 'Inter', system-ui, sans-serif;
            min-height: 100vh;
            width: 100%;
            font-family: var(--bc-font-body);
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

        /* Full-screen background scene */
        .aqi-bg-scene {
            position: fixed;
            inset: 0;
            z-index: 0;
            width: 100vw;
            height: 100vh;
            pointer-events: none; /* Allows clicks to pass through to the form */
        }
        .aqi-scene {
            position: relative;
            overflow: hidden;
            width: 100%;
            height: 100%;
        }
        .aqi-scene-svg {
            position: absolute;
            inset: 0;
            width: 100%;
            height: 100%;
        }

        /* Foreground content sits above the background */
        .aqi-foreground {
            position: relative;
            z-index: 1;
        }

        .aqi-shell { background: var(--bc-bg); color: var(--bc-ink); min-height: 100vh; transition: background 0.4s ease, color 0.4s ease; }
        .aqi-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 18px 20px;
            max-width: 1240px;
            margin: 0 auto;
        }
        @media (min-width: 768px) { .aqi-header { padding: 24px 40px; } }
        .aqi-brand { display: inline-flex; align-items: center; gap: 10px; }
        .aqi-brand-mark {
            display: inline-flex; align-items: center; justify-content: center;
            width: 32px; height: 32px; border-radius: 9px;
            background: color-mix(in srgb, var(--bc-accent) 16%, transparent);
            color: var(--bc-accent-strong);
        }
        .aqi-brand-name { font-family: var(--bc-font-display); font-size: 18px; font-weight: 600; }
        .aqi-theme-toggle {
            display: inline-flex; align-items: center; gap: 6px;
            border: 1px solid var(--bc-border); background: var(--bc-surface);
            color: var(--bc-ink-soft); border-radius: 999px; padding: 6px 12px;
            font-size: 13px; cursor: pointer;
            transition: border-color 0.2s ease, color 0.2s ease, transform 0.15s ease;
            backdrop-filter: blur(8px);
        }
        .aqi-theme-toggle:hover { color: var(--bc-ink); border-color: var(--bc-border-strong); }
        .aqi-theme-toggle:active { transform: scale(0.97); }
        .aqi-theme-toggle:focus-visible { outline: 2px solid var(--bc-accent); outline-offset: 2px; }
        
        .aqi-hero { max-width: 1240px; margin: 0 auto; padding: 8px 20px 20px; }
        @media (min-width: 768px) { .aqi-hero { padding: 8px 40px 32px; max-width: 760px; } }
        .aqi-eyebrow {
            font-size: 12px; letter-spacing: 0.14em; text-transform: uppercase;
            color: var(--bc-accent-strong); font-weight: 600; margin: 0 0 10px;
        }
        .aqi-title {
            font-family: var(--bc-font-display); font-weight: 600;
            font-size: clamp(26px, 4vw, 38px); line-height: 1.15; margin: 0 0 12px;
        }
        .aqi-subtitle { font-size: 15px; line-height: 1.6; color: var(--bc-ink-soft); margin: 0; max-width: 60ch; }
        
        .aqi-main-grid {
            max-width: 1240px; margin: 0 auto; padding: 8px 20px 64px;
            display: grid; grid-template-columns: 1fr; gap: 28px;
        }
        @media (min-width: 640px) { .aqi-main-grid { padding: 8px 40px 72px; } }
        @media (min-width: 1024px) { .aqi-main-grid { grid-template-columns: minmax(0, 7fr) minmax(0, 5fr); gap: 36px; align-items: start; } }
        
        .aqi-group { 
            background: var(--bc-surface); 
            border: 1px solid var(--bc-border); 
            border-radius: var(--bc-radius); 
            padding: 20px; 
            margin-bottom: 18px; 
            backdrop-filter: blur(12px);
        }
        .aqi-group-header { display: flex; align-items: center; gap: 9px; margin-bottom: 16px; color: var(--bc-ink); }
        .aqi-group-header h2 { font-size: 15px; font-weight: 700; margin: 0; }
        .aqi-group-icon { display: inline-flex; color: var(--bc-accent-strong); }
        .aqi-group-grid { display: grid; grid-template-columns: 1fr; gap: 16px; }
        .aqi-group:has(.aqi-select-trigger.is-open) {
    position: relative;
    z-index: 10;
}
        @media (min-width: 560px) { .aqi-group-grid { grid-template-columns: 1fr 1fr; } }
        
        .aqi-fieldset { border: none; padding: 0; margin: 0; min-width: 0; }
        .aqi-fieldset:disabled { opacity: 0.7; }
        .aqi-field { min-width: 0; position: relative; }
        .aqi-label { display: flex; align-items: center; gap: 6px; font-size: 12.5px; font-weight: 600; color: var(--bc-ink); margin-bottom: 7px; }
        .aqi-label-icon { display: inline-flex; color: var(--bc-ink-faint); }
        
        .aqi-input-shell, .aqi-select-trigger {
            position: relative; display: flex; align-items: center; justify-content: space-between;
            border: 1.5px solid var(--bc-border); border-radius: var(--bc-radius-sm);
            background: var(--bc-surface-2); transition: border-color 0.18s ease, box-shadow 0.18s ease, background-color 0.18s ease;
            min-height: 42px;
            backdrop-filter: blur(8px);
        }
        .aqi-input-shell:focus-within, .aqi-select-trigger:focus-visible, .aqi-select-trigger.is-open { 
            border-color: var(--bc-accent); box-shadow: 0 0 0 4px var(--bc-focus-ring); outline: none; 
        }
        .aqi-input-shell.is-invalid { border-color: var(--bc-danger); }
        .aqi-input-shell.is-invalid:focus-within { box-shadow: 0 0 0 4px color-mix(in srgb, var(--bc-danger) 22%, transparent); }
        
        .aqi-input {
            flex: 1; min-width: 0; border: none; background: transparent; outline: none;
            padding: 0 12px; font-size: 14.5px; color: var(--bc-ink); font-family: var(--bc-font-body); height: 100%;
        }
        .aqi-input::-webkit-outer-spin-button, .aqi-input::-webkit-inner-spin-button { opacity: 0.6; }
        .aqi-input-hint { flex-shrink: 0; padding-right: 12px; font-size: 11px; color: var(--bc-ink-faint); white-space: nowrap; }
        
        .aqi-range-track { position: relative; height: 4px; border-radius: 999px; background: var(--bc-track); margin-top: 8px; overflow: hidden; }
        .aqi-range-fill { position: absolute; inset: 0; background: var(--bc-accent); border-radius: 999px; transform-origin: left center; transition: transform 0.25s ease; }
        .aqi-field-error { display: flex; align-items: center; gap: 6px; margin-top: 7px; font-size: 12px; color: var(--bc-danger); }
        
        .aqi-select-trigger { width: 100%; color: var(--bc-ink); font-size: 14.5px; padding: 0 12px; cursor: pointer; font-family: var(--bc-font-body); }
        .aqi-select-trigger:hover { border-color: var(--bc-border-strong); background: var(--bc-surface); }
        .aqi-select-chevron { color: var(--bc-ink-faint); transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1); flex-shrink: 0; }
        .aqi-select-trigger.is-open .aqi-select-chevron { transform: rotate(180deg); }
        
        @keyframes aqi-dropdown-in {
            from { opacity: 0; transform: translateY(-8px) scale(0.98); }
            to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .aqi-select-list {
            position: absolute; z-index: 1000;top: 100%; left: 0;right: 0;
            margin: 6px 0 0; padding: 6px; list-style: none;
            width: 100%; max-height: 240px; overflow-y: auto;
            background: var(--bc-surface); border: 1px solid var(--bc-border-strong); border-radius: var(--bc-radius-sm);
            box-shadow: 0 18px 40px -20px rgba(9, 30, 34, 0.25);
            animation: aqi-dropdown-in 0.15s cubic-bezier(0.16, 1, 0.3, 1);
            backdrop-filter: blur(12px);
        }
        .aqi-select-list::-webkit-scrollbar { width: 6px; }
        .aqi-select-list::-webkit-scrollbar-track { background: transparent; }
        .aqi-select-list::-webkit-scrollbar-thumb { background: var(--bc-border-strong); border-radius: 999px; }
        
        .aqi-select-option {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 10px;
    border-radius: 7px;
    font-size: 14px;
    color: var(--bc-ink-soft);
    cursor: pointer;
    transition: background-color 0.15s ease, color 0.15s ease;
}

.aqi-select-option:hover {
    background: var(--bc-surface-2);
    color: var(--bc-ink);
}

.aqi-select-option.is-selected {
    color: var(--bc-accent-strong);
    font-weight: 600;
    background: color-mix(in srgb, var(--bc-accent) 8%, transparent);
}

/* Keyboard / mouse active option */
.aqi-select-option.is-active {
    background: var(--bc-accent);
    color: #ffffff;
}

/* Make active selected option use the active appearance too */
.aqi-select-option.is-active.is-selected {
    background: var(--bc-accent);
    color: #ffffff;
}
        .aqi-select-spacer { width: 14px; display: inline-block; }
        
        .aqi-general-error {
            display: flex; align-items: flex-start; gap: 8px;
            background: var(--bc-danger-bg); border: 1px solid color-mix(in srgb, var(--bc-danger) 35%, transparent);
            color: var(--bc-danger); border-radius: var(--bc-radius-sm); padding: 10px 12px; font-size: 13px; margin-bottom: 18px;
            backdrop-filter: blur(8px);
        }
        .aqi-actions { display: flex; gap: 12px; margin-top: 6px; }
        .aqi-btn-primary, .aqi-btn-ghost {
            display: inline-flex; align-items: center; justify-content: center; gap: 8px;
            border-radius: var(--bc-radius-sm); font-size: 14.5px; font-weight: 600; padding: 13px 18px;
            cursor: pointer; transition: transform 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease, border-color 0.2s ease;
        }
        .aqi-btn-primary {
            flex: 1; border: none; background: var(--bc-accent-strong); color: #F4FBF9;
            box-shadow: 0 10px 30px -12px color-mix(in srgb, var(--bc-accent-strong) 60%, transparent);
        }
        .aqi-btn-primary:hover:not(:disabled) { transform: translateY(-1px); }
        .aqi-btn-primary:disabled { opacity: 0.6; cursor: not-allowed; box-shadow: none; }
        .aqi-btn-primary:focus-visible { outline: 2px solid var(--bc-ink); outline-offset: 3px; }
        .aqi-btn-ghost { border: 1.5px solid var(--bc-border); background: var(--bc-surface); color: var(--bc-ink-soft); backdrop-filter: blur(8px); }
        .aqi-btn-ghost:hover:not(:disabled) { color: var(--bc-ink); border-color: var(--bc-border-strong); background: var(--bc-surface-2); }
        .aqi-btn-ghost:disabled { opacity: 0.5; cursor: not-allowed; }
        .aqi-btn-ghost:focus-visible { outline: 2px solid var(--bc-accent); outline-offset: 2px; }
        
        .aqi-result-col { position: relative; }
        @media (min-width: 1024px) { 
            .aqi-result-col { position: sticky; top: 24px; } 
        }
        .aqi-result-panel {
            background: var(--bc-surface); border: 1px solid var(--bc-border); border-radius: var(--bc-radius);
            padding: 22px; text-align: center;
            backdrop-filter: blur(16px);
            box-shadow: 0 20px 40px -12px rgba(0, 0, 0, 0.1);
        }
        .aqi-result-badge {
            display: inline-flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 700;
            letter-spacing: 0.06em; text-transform: uppercase; padding: 4px 10px; border-radius: 999px;
            background: color-mix(in srgb, currentColor 14%, transparent);
        }
        .aqi-result-value { font-family: var(--bc-font-display); font-size: 44px; font-weight: 600; margin: 12px 0 4px; line-height: 1; }
        .aqi-result-value span { font-size: 15px; font-weight: 600; color: var(--bc-ink-faint); margin-left: 6px; font-family: var(--bc-font-body); }
        .aqi-result-desc { font-size: 13.5px; color: var(--bc-ink-soft); margin: 0 0 6px; line-height: 1.5; }
        .aqi-restored-note { font-size: 11.5px; color: var(--bc-ink-faint); margin: 0 0 10px; font-style: italic; }
        .aqi-result-status { font-size: 14px; color: var(--bc-ink-soft); margin: 10px 0 0; }
        .aqi-result-icon { color: var(--bc-accent-strong); }
        .aqi-summary-chips { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; margin-top: 14px; }
        .aqi-chip {
            display: inline-flex; flex-direction: column; align-items: center; gap: 2px;
            border: 1px solid var(--bc-border); border-radius: 10px; padding: 7px 10px; min-width: 68px;
            background: var(--bc-surface-2);
        }
        .aqi-chip span:first-child { font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--bc-ink-faint); }
        .aqi-chip span:last-child { font-size: 12.5px; font-weight: 600; color: var(--bc-ink); }
        
        /* Motion */
        @keyframes aqi-float { 0%, 100% { transform: translate3d(0,0,0); opacity: 0.5; } 50% { transform: translate3d(0,-13px,0); opacity: 0.95; } }
        @keyframes aqi-wind-flow { from { stroke-dashoffset: 240; } to { stroke-dashoffset: 0; } }
        @keyframes aqi-twinkle { 0%, 100% { opacity: 0.15; } 50% { opacity: 0.9; } }
        @keyframes aqi-arc-pulse { 0%, 100% { opacity: 0.45; } 50% { opacity: 0.9; } }
        @keyframes aqi-scan-rotate { from { transform: rotate(-90deg); } to { transform: rotate(270deg); } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .aqi-particle { animation-name: aqi-float; animation-timing-function: ease-in-out; animation-iteration-count: infinite; transform-box: fill-box; transform-origin: center; }
        .aqi-wind { stroke-dasharray: 8 14; animation-name: aqi-wind-flow; animation-timing-function: linear; animation-iteration-count: infinite; }
        .aqi-star { animation: aqi-twinkle ease-in-out infinite; transform-box: fill-box; transform-origin: center; }
        .aqi-arc-glow { animation: aqi-arc-pulse 5s ease-in-out infinite; }
        .aqi-arc-scan { transform-box: fill-box; transform-origin: center; animation: aqi-scan-rotate 1.6s linear infinite; opacity: 0.85; }
        @media (prefers-reduced-motion: reduce) {
            .aqi-particle, .aqi-wind, .aqi-star, .aqi-arc-glow, .aqi-arc-scan, .aqi-select-list { animation: none !important; }
        }
        `}</style>

            <div className="aqi-shell">
                {/* ✨ FULL-SCREEN BACKGROUND ANIMATION ✨ */}
                <div className="aqi-bg-scene">
                    <AtmosphereScene isDark={isDark} atmosphere={atmosphere} isLoading={loading} progressPct={progressPct} />
                </div>

                {/* ✨ FOREGROUND CONTENT (Sits above background) ✨ */}
                <div className="aqi-foreground">
                    <header className="aqi-header">
                        <div className="aqi-brand">
                            <span className="aqi-brand-mark">
                                <AqiMark className="h-4.5 w-4.5 text-current" />
                            </span>
                            <span className="aqi-brand-name">{companyName}</span>
                        </div>
                        <button
                            type="button"
                            className="aqi-theme-toggle"
                            onClick={() => dispatch(toggleTheme())}
                            aria-label={isDark ? "Switch to day theme" : "Switch to dark theme"}
                        >
                            {isDark ? <Sun size={14} /> : <Moon size={14} />}
                            {isDark ? "Day" : "Dark"}
                        </button>
                    </header>

                    <section className="aqi-hero">
                        <p className="aqi-eyebrow">Environmental Intelligence</p>
                        <h1 className="aqi-title">Atmospheric Synthesis Engine</h1>
                        <p className="aqi-subtitle">
                            Enter the environmental conditions below and {companyName} will synthesize a real-time air
                            quality prediction — and transform the atmosphere around it to match.
                        </p>
                    </section>

                    <div className="aqi-main-grid">
                        <div className="aqi-form-col">
                            <form onSubmit={handleSubmit} noValidate>
                                <fieldset className="aqi-fieldset" disabled={loading}>
                                    {FIELD_GROUPS.map((group) => (
                                        <section className="aqi-group" key={group.title}>
                                            <div className="aqi-group-header">
                                                <span className="aqi-group-icon">{group.icon}</span>
                                                <h2>{group.title}</h2>
                                            </div>
                                            <div className="aqi-group-grid">
                                                {group.fields.map((name) => {
                                                    const field = fieldByName[name];
                                                    if (!field) return null;
                                                    const showError = Boolean((touched[name] || submitAttempted) && !isFieldValid(field, inputState));
                                                    if (field.type === "select") {
                                                        const currentLabel = selectValueToLabel(field.name, field.options ?? [], readField(inputState, field.name));
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
                                                            onCommit={(value) => handleNumberCommit(field.name as keyof InputState, value)}
                                                            onTouch={() => handleTouch(field.name)}
                                                        />
                                                    );
                                                })}
                                            </div>
                                        </section>
                                    ))}
                                    {error && (
                                        <div className="aqi-general-error" role="alert">
                                            <AlertCircle size={16} style={{ marginTop: 1, flexShrink: 0 }} />
                                            <span>{error}</span>
                                        </div>
                                    )}
                                    <div className="aqi-actions">
                                        <button type="button" className="aqi-btn-ghost" onClick={handleReset}>
                                            <RotateCcw size={16} />
                                            Reset
                                        </button>
                                        <button type="submit" className="aqi-btn-primary" disabled={loading || !isFormValid}>
                                            {loading ? (
                                                <>
                                                    <Loader2 size={17} style={{ animation: "spin 0.8s linear infinite" }} />
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

                        <aside className="aqi-result-col">
                            <div className="aqi-result-panel" aria-live="polite">
                                {result && !loading ? (
                                    <>
                                        <span className="aqi-result-badge" style={{ color: atmosphere.color ?? undefined }}>
                                            {atmosphere.shortLabel}
                                        </span>
                                        <p className="aqi-result-value">
                                            {Math.round(result.prediction)}
                                            <span>AQI</span>
                                        </p>
                                        <p className="aqi-result-desc">{atmosphere.description}</p>
                                        {resultSource === "restored" && (
                                            <p className="aqi-restored-note">Restored from your last analysis</p>
                                        )}
                                        <div className="aqi-summary-chips">
                                            {summaryChips.map((chip) => (
                                                <span className="aqi-chip" key={chip.label}>
                                                    <span>{chip.label}</span>
                                                    <span>{chip.value}</span>
                                                </span>
                                            ))}
                                        </div>
                                    </>
                                ) : loading ? (
                                    <p className="aqi-result-status">Analyzing atmospheric conditions…</p>
                                ) : (
                                    <>
                                        <Sparkles size={20} className="aqi-result-icon" />
                                        <p className="aqi-result-status">Ready to synthesize environmental conditions.</p>
                                    </>
                                )}
                            </div>
                        </aside>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AqiPrediction;