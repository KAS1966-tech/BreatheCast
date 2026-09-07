import React, { useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import {
    FileUp, FileSpreadsheet, ScanLine, ShieldCheck, ShieldAlert,
    CheckCircle2, AlertCircle, AlertTriangle, RotateCcw, ArrowRight, Download,
    Table as TableIcon, Hash, Database, HardDrive, Check, X, Cpu, ChevronDown,
} from "lucide-react";

// TODO: adjust to your project's actual paths -----------------------------
import { useAppDispatch, useAppSelector } from "../app/redux";
import {
    selectFile, setFileData, setAnalysisError, startUpload, setUploadProgress,
    uploadSuccess, uploadFailure, cancelUpload, clearError, resetUpload,
    startProcessing,
} from "../app/features/upload/fileUploadSlice";
import { uploadFile as uploadPredictionCsv } from "../api/predictionApi";
import { schema as fieldSchema } from "../hooks/schema/aqiSchema";
import type { CsvAnalysis, UploadPhase, FileUploadState } from "../hooks/types/fileUpload.type";
import { companyName, PREVIEW_LIMIT, MAX_UPLOAD_SIZE_MB } from "../core/config";
import { useSEO } from "../utils/useSeo";
import { useGoogleFont } from "../utils/useGoogleFont";
import Navbar from "../components/Navbar";
import type { AxiosError } from "axios";
import Footer from "../components/Footer";
// ---------------------------------------------------------------------------

const REQUIRED_COLUMNS: string[] = fieldSchema.map((f) => f.name);

/* ---------------------------------------------------------------------------
Formatting helpers
-------------------------------------------------------------------------*/
type FileUnit = 'bytes' | 'b' | 'kb' | 'mb' | 'gb';
interface FileSizeObject { size: number; unit: FileUnit | string; }

function parseToBytes(input: number): number;
function parseToBytes(input: FileSizeObject): number;
function parseToBytes(input: number | FileSizeObject): number {
    let size: number;
    let unit: string;
    if (typeof input === 'object' && input !== null) {
        size = input.size;
        unit = input.unit;
    } else if (typeof input === 'number') {
        size = input;
        unit = 'mb';
    } else {
        throw new Error("Input must be a valid number or a configuration object.");
    }
    if (!Number.isFinite(size) || size < 0) throw new Error("Invalid size value provided.");
    const normalizedUnit = unit.trim().toLowerCase();
    switch (normalizedUnit) {
        case 'bytes': case 'b': return size;
        case 'kb': return size * 1024;
        case 'mb': return size * 1024 * 1024;
        case 'gb': return size * 1024 * 1024 * 1024;
        default: throw new Error(`Unsupported file unit: "${unit}"`);
    }
}

function formatBytes(bytes: number): string {
    if (!Number.isFinite(bytes) || bytes < 0) return "—";
    if (bytes < 1024) return `${bytes} B`;
    const units = ["KB", "MB", "GB"];
    let v = bytes / 1024;
    let u = 0;
    while (v >= 1024 && u < units.length - 1) { v /= 1024; u++; }
    return `${v >= 100 ? Math.round(v) : v.toFixed(1)} ${units[u]}`;
}

function formatInt(n: number): string {
    return Number.isFinite(n) ? n.toLocaleString() : "—";
}

const MAX_UPLOAD_SIZE_BYTES = parseToBytes(MAX_UPLOAD_SIZE_MB);

/* ---------------------------------------------------------------------------
Browser-side CSV inspection
-------------------------------------------------------------------------*/
function parseCsvHead(text: string, maxPreviewRows: number): { headers: string[]; rows: string[][] } {
    const allRows: string[][] = [];
    let row: string[] = [];
    let field = "";
    let inQuotes = false;
    let i = 0;
    const pushField = () => { row.push(field); field = ""; };
    const pushRow = () => { pushField(); allRows.push(row); row = []; };

    while (i < text.length) {
        const c = text[i];
        if (inQuotes) {
            if (c === '"') {
                if (text[i + 1] === '"') { field += '"'; i += 2; continue; }
                inQuotes = false; i++; continue;
            }
            field += c; i++; continue;
        }
        if (c === '"') { inQuotes = true; i++; continue; }
        if (c === ",") { pushField(); i++; continue; }
        if (c === "\n") { pushRow(); i++; if (allRows.length >= maxPreviewRows + 1) break; continue; }
        if (c === "\r") { i++; continue; }
        field += c; i++;
    }
    if (field.length > 0 || row.length > 0) { if (!inQuotes) pushRow(); }
    const headers = (allRows.shift() ?? []).map((h) =>
        h.replace(/^\uFEFF/, "").trim()
    );
    return { headers, rows: allRows };
}

async function countCsvDataRows(file: File): Promise<number> {
    const CHUNK = 8 * 1024 * 1024;
    let newlines = 0;
    let inQuotes = false;
    let offset = 0;
    while (offset < file.size) {
        const chunk = await file.slice(offset, offset + CHUNK).text();
        let i = 0;
        while (i < chunk.length) {
            const q = chunk.indexOf('"', i);
            const n = chunk.indexOf("\n", i);
            if (q === -1 && n === -1) break;
            if (q !== -1 && (n === -1 || q < n)) { inQuotes = !inQuotes; i = q + 1; }
            else { if (!inQuotes) newlines++; i = n + 1; }
        }
        offset += CHUNK;
    }
    let totalLines = newlines;
    if (file.size > 0) {
        const lastChar = await file.slice(file.size - 1).text();
        if (lastChar !== "\n") totalLines += 1;
    }
    return Math.max(0, totalLines - 1);
}

async function analyzeCsvFile(file: File, previewLimit: number): Promise<CsvAnalysis> {
    if (file.size === 0) throw new Error("The selected file is empty.");
    const headText = await file.slice(0, Math.min(file.size, 1.5 * 1024 * 1024)).text();
    const { headers, rows } = parseCsvHead(headText, previewLimit);
    if (headers.length === 0) throw new Error("Could not detect a CSV header row.");

    const rowCount = await countCsvDataRows(file);
    const counts = new Map<string, number>();
    headers.forEach((h) => counts.set(h, (counts.get(h) ?? 0) + 1));
    const duplicateColumns = [...new Set(headers.filter((h) => (counts.get(h) ?? 0) > 1))];
    const missingColumns = REQUIRED_COLUMNS.filter((c) => !counts.has(c));

    return {
        fileName: file.name, fileType: file.type || "text/csv", fileSizeBytes: file.size,
        rowCount, columnCount: headers.length, headers, previewRows: rows,
        missingColumns, duplicateColumns,
        isValid: missingColumns.length === 0 && duplicateColumns.length === 0 && rowCount > 0,
    };
}

/* ---------------------------------------------------------------------------
Atmospheric mood
-------------------------------------------------------------------------*/
type Mood = "calm" | "active" | "stable" | "warning" | "success";

function getMood(phase: UploadPhase, isValid: boolean): Mood {
    switch (phase) {
        case "analyzing": case "uploading": return "active";
        case "ready": return isValid ? "stable" : "warning";
        case "success": return "success";
        case "error": return "warning";
        default: return "calm";
    }
}

interface MoodVisual { windOpacity: number; extraWindOpacity: number; boostOpacity: number; mistColor: string; mistOpacity: number; ringOpacity: number; scanOpacity: number; }

function getMoodVisual(mood: Mood, isDark: boolean): MoodVisual {
    const accent = isDark ? "#4FD8C4" : "#10B981";
    const warn = "#F59E0B";
    switch (mood) {
        case "active": return { windOpacity: 0.4, extraWindOpacity: 0.35, boostOpacity: 1, mistColor: accent, mistOpacity: isDark ? 0.08 : 0.06, ringOpacity: 0.22, scanOpacity: 1 };
        case "stable": return { windOpacity: 0.3, extraWindOpacity: 0, boostOpacity: 0.5, mistColor: accent, mistOpacity: 0, ringOpacity: 0.16, scanOpacity: 0 };
        case "warning": return { windOpacity: 0.28, extraWindOpacity: 0.15, boostOpacity: 0.4, mistColor: warn, mistOpacity: isDark ? 0.09 : 0.08, ringOpacity: 0.14, scanOpacity: 0 };
        case "success": return { windOpacity: 0.26, extraWindOpacity: 0, boostOpacity: 0.6, mistColor: accent, mistOpacity: isDark ? 0.07 : 0.06, ringOpacity: 0.18, scanOpacity: 0 };
        default: return { windOpacity: 0.22, extraWindOpacity: 0, boostOpacity: 0, mistColor: accent, mistOpacity: 0, ringOpacity: 0.12, scanOpacity: 0 };
    }
}

/* ---------------------------------------------------------------------------
Workflow stepper
-------------------------------------------------------------------------*/
type StepState = "pending" | "active" | "complete" | "error";

function getStepStates(phase: UploadPhase, isValid: boolean, hasAnalysis: boolean): StepState[] {
    switch (phase) {
        case "idle": return ["active", "pending", "pending", "pending", "pending"];
        case "analyzing": return ["complete", "active", "pending", "pending", "pending"];
        case "ready": return isValid ? ["complete", "complete", "complete", "active", "pending"] : ["complete", "complete", "error", "pending", "pending"];
        case "uploading": return ["complete", "complete", "complete", "active", "pending"];
        case "success": return ["complete", "complete", "complete", "complete", "complete"];
        case "error": return hasAnalysis ? ["complete", "complete", "complete", "error", "pending"] : ["complete", "error", "pending", "pending", "pending"];
        default: return ["pending", "pending", "pending", "pending", "pending"];
    }
}

const STEP_DEFS: { label: string; icon: React.ReactNode }[] = [
    { label: "Import", icon: <FileUp size={12} /> },
    { label: "Analyze", icon: <ScanLine size={12} /> },
    { label: "Validate", icon: <ShieldCheck size={12} /> },
    { label: "Process", icon: <Cpu size={12} /> },
    { label: "Download", icon: <Download size={12} /> },
];

const WorkflowStepper: React.FC<{ states: StepState[] }> = ({ states }) => (
    <ol className="list-none flex gap-1 mx-auto mb-4 max-w-310 px-4 w-full overflow-x-auto [-webkit-overflow-scrolling:touch] scrollbar-none md:px-10 md:mb-5.5 [&::-webkit-scrollbar]:hidden" aria-label="Batch processing workflow">
        {STEP_DEFS.map((step, i) => {
            const st = states[i];
            const isComplete = st === "complete";
            const isActive = st === "active";
            const isError = st === "error";

            return (
                <li
                    key={step.label}
                    className={`shrink-0 flex items-center gap-1.5 min-w-0 relative px-0.5 py-1.5 sm:flex-1 sm:gap-2 ${i > 0 ? 'before:content-[\'\'] before:absolute before:-left-2.5 before:top-1/2 before:w-4 before:h-[1.5px] before:bg-(--bc-border-strong) before:opacity-50 sm:before:-left-3.5 sm:before:w-6 max-[480px]:before:hidden' : ''}`}
                    aria-current={isActive ? "step" : undefined}
                >
                    <span className={`w-5.5 h-5.5 rounded-full shrink-0 inline-flex items-center justify-center border-[1.5px] transition-[background,color,border-color] duration-300 sm:w-6 sm:h-6
            ${isComplete ? 'bg-(--bc-accent) border-(--bc-accent) text-[#F4FBF9]' :
                            isError ? 'bg-(--bc-danger) border-(--bc-danger) text-[#FFF5F4]' :
                                isActive ? 'border-(--bc-accent) text-(--bc-accent-strong) bg-(--bc-surface) animate-[fu-dot-pulse_2.4s_ease-in-out_infinite]' :
                                    'border-(--bc-border-strong) text-(--bc-ink-faint) bg-(--bc-surface)'}`}>
                        {isComplete ? <Check size={12} /> : isError ? <X size={12} /> : step.icon}
                    </span>
                    <span className={`text-[10px] font-semibold tracking-[0.04em] uppercase whitespace-nowrap sm:text-[11.5px] max-[480px]:hidden
            ${isComplete ? 'text-(--bc-ink-soft)' :
                            isError ? 'text-(--bc-danger)' :
                                isActive ? 'text-(--bc-ink)' :
                                    'text-(--bc-ink-faint)'}`}>
                        {step.label}
                    </span>
                </li>
            );
        })}
    </ol>
);

/* ---------------------------------------------------------------------------
Atmospheric background
-------------------------------------------------------------------------*/
const Atmosphere: React.FC<{ isDark: boolean; mood: Mood }> = ({ isDark, mood }) => {
    const v = getMoodVisual(mood, isDark);
    const particles = useMemo(() => Array.from({ length: 16 }, (_, i) => ({
        id: i, cx: 5 + ((i * 37) % 90), cy: 8 + ((i * 53) % 82),
        r: 1.2 + (i % 3) * 0.55, dur: 14 + (i % 5) * 3, delay: -(i * 2.1),
    })), []);
    const stars = useMemo(() => Array.from({ length: 18 }, (_, i) => ({
        id: i, cx: (i * 43) % 100, cy: (i * 29) % 58,
        r: 0.5 + (i % 3) * 0.3, dur: 3 + (i % 4), delay: -(i * 1.3),
    })), []);
    const accent = isDark ? "#4FD8C4" : "#10B981";

    return (
        <div className="fixed inset-0 z-0 pointer-events-none" aria-hidden="true">
            <svg className="w-full h-full block" viewBox="0 0 480 480" preserveAspectRatio="xMidYMid slice" focusable="false">
                <defs>
                    <linearGradient id="fu-sky" x1="0" y1="0" x2="0" y2="1">
                        {isDark ? (
                            <><stop offset="0%" stopColor="#0C1A1F" /><stop offset="55%" stopColor="#081216" /><stop offset="100%" stopColor="#050B0D" /></>
                        ) : (
                            <><stop offset="0%" stopColor="#F0FDFA" /><stop offset="55%" stopColor="#CCFBF1" /><stop offset="100%" stopColor="#99F6E4" /></>
                        )}
                    </linearGradient>
                    <radialGradient id="fu-sun" cx="82%" cy="12%" r="45%">
                        <stop offset="0%" stopColor={isDark ? "#123B39" : "#FEF3C7"} stopOpacity={isDark ? 0.55 : 0.85} />
                        <stop offset="100%" stopColor={isDark ? "#123B39" : "#FEF3C7"} stopOpacity="0" />
                    </radialGradient>
                    <linearGradient id="fu-scan-grad" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor={accent} stopOpacity="0" />
                        <stop offset="50%" stopColor={accent} stopOpacity="0.14" />
                        <stop offset="100%" stopColor={accent} stopOpacity="0" />
                    </linearGradient>
                </defs>
                <rect x="0" y="0" width="480" height="480" fill="url(#fu-sky)" />
                <rect x="0" y="0" width="480" height="480" fill="url(#fu-sun)" />
                <rect x="0" y="0" width="480" height="480" style={{ fill: v.mistColor, opacity: v.mistOpacity, transition: "fill 1.1s ease, opacity 1.1s ease" }} />
                {isDark && stars.map((s) => (
                    <circle key={s.id} className="fu-star" cx={(s.cx / 100) * 480} cy={(s.cy / 100) * 480} r={s.r} fill="#EAF4F2"
                        style={{ animationDuration: `${s.dur}s`, animationDelay: `${s.delay}s` }} />
                ))}
                <g style={{ opacity: v.ringOpacity, transition: "opacity 1s ease" }}>
                    <circle className="fu-ring" cx="392" cy="72" r="58" fill="none" stroke={accent} strokeOpacity="0.5" strokeWidth="1" strokeDasharray="2 9" />
                    <circle className="fu-ring-rev" cx="392" cy="72" r="40" fill="none" stroke={accent} strokeOpacity="0.35" strokeWidth="1" strokeDasharray="1 7" />
                </g>
                <g className="fu-scan" style={{ opacity: v.scanOpacity, transition: "opacity 0.8s ease" }}>
                    <rect x="-90" y="0" width="90" height="480" fill="url(#fu-scan-grad)" />
                </g>
                <g fill="none" strokeLinecap="round" strokeWidth="2" style={{ stroke: accent, strokeOpacity: v.windOpacity, transition: "stroke-opacity 1s ease" }}>
                    <path className="fu-wind" style={{ animationDuration: "6.5s" }} d="M -20 236 C 90 218, 150 254, 260 234 S 470 216, 520 232" />
                    <path className="fu-wind" style={{ animationDuration: "8s", animationDelay: "-2s" }} d="M -30 274 C 80 290, 170 260, 250 278 S 440 292, 520 272" />
                </g>
                <g fill="none" strokeLinecap="round" strokeWidth="2" style={{ stroke: accent, strokeOpacity: v.extraWindOpacity, transition: "stroke-opacity 1s ease" }}>
                    <path className="fu-wind" style={{ animationDuration: "3.4s" }} d="M -10 306 C 70 328, 140 288, 220 314 S 400 332, 520 302" />
                </g>
                <g className="fu-cloud-a" opacity={isDark ? 0.5 : 0.9}>
                    <ellipse cx="110" cy="150" rx="110" ry="24" fill={isDark ? "#12222A" : "#FFFFFF"} />
                    <ellipse cx="188" cy="137" rx="72" ry="18" fill={isDark ? "#12222A" : "#FFFFFF"} />
                </g>
                <g className="fu-cloud-b" opacity={isDark ? 0.4 : 0.7}>
                    <ellipse cx="340" cy="205" rx="130" ry="28" fill={isDark ? "#0E1B21" : "#FFFFFF"} />
                    <ellipse cx="412" cy="190" rx="66" ry="17" fill={isDark ? "#0E1B21" : "#FFFFFF"} />
                </g>
                {particles.slice(0, 10).map((p) => (
                    <circle key={p.id} className="fu-particle" cx={(p.cx / 100) * 480} cy={(p.cy / 100) * 480} r={p.r} fill={accent} fillOpacity="0.45"
                        style={{ animationDuration: `${p.dur}s`, animationDelay: `${p.delay}s` }} />
                ))}
                <g style={{ opacity: v.boostOpacity, transition: "opacity 1s ease" }}>
                    {particles.slice(10).map((p) => (
                        <circle key={p.id} className="fu-particle" cx={(p.cx / 100) * 480} cy={(p.cy / 100) * 480} r={p.r} fill={accent} fillOpacity="0.5"
                            style={{ animationDuration: `${Math.max(6, p.dur - 6)}s`, animationDelay: `${p.delay}s` }} />
                    ))}
                </g>
                <path d="M0 372 C 120 352, 360 392, 480 364 L480 480 L0 480 Z" style={{ fill: accent, opacity: 0.16, transition: "opacity 1s ease" }} />
                <path d="M0 392 C 120 374, 360 410, 480 384 L480 480 L0 480 Z" fill={isDark ? "#081215" : "#A7F3D0"} opacity={isDark ? 0.85 : 0.6} />
            </svg>
        </div>
    );
};

const StatTile: React.FC<{ icon: React.ReactNode; label: string; value: string }> = ({ icon, label, value }) => (
    <div className="border border-(--bc-border) rounded-[10px] p-2 px-2.5 flex flex-col gap-0.5 bg-(--bc-surface-2) min-w-0 sm:rounded-xl sm:p-2.5 sm:px-3">
        <span className="text-(--bc-ink-faint) mb-0.5 sm:mb-1">{icon}</span>
        <span className="text-[15px] font-semibold overflow-hidden text-ellipsis whitespace-nowrap sm:text-[17px]">{value}</span>
        <span className="text-[9.5px] uppercase tracking-[0.06em] text-(--bc-ink-faint) sm:text-[10.5px]">{label}</span>
    </div>
);

/* ============================================================================
Page
==========================================================================*/
const FileUpload: React.FC = () => {
    const dispatch = useAppDispatch();
    const mode = useAppSelector((state) => state.theme.mode);
    const upload = useAppSelector((state) => (state).file) as FileUploadState;
    const isDark = mode === "dark";

    useSEO(
        `Batch CSV AQI Prediction — ${companyName}`,
        `Upload an environmental CSV to ${companyName} for batch AQI prediction. Structure validation, live preview, server-side processing and automatic result download.`
    );
    useGoogleFont("Fraunces");
    useGoogleFont("Plus Jakarta Sans");

    const inputRef = useRef<HTMLInputElement>(null);
    const [file, setFile] = useState<File | null>(null);
    const abortRef = useRef<AbortController | null>(null);
    const blobUrlRef = useRef<string | null>(null);
    const dragDepth = useRef(0);
    const [dragActive, setDragActive] = useState(false);
    const [showRequired, setShowRequired] = useState(false);

    const {
        phase, isValid, error, uploadProgress, fileName, fileType, fileSizeBytes,
        rowCount, columnCount, headers, previewRows, missingColumns, duplicateColumns,
        resultFileName, processedRowCount,
    } = upload;

    const mood = getMood(phase, isValid);
    const hasAnalysis = headers.length > 0 || rowCount !== null;
    const stepStates = getStepStates(phase, isValid, hasAnalysis);
    const sizeExceeded = fileSizeBytes !== null && fileSizeBytes > MAX_UPLOAD_SIZE_BYTES;
    const canProcess = phase === "ready" && isValid && !sizeExceeded && file !== null;
    const realProgress = uploadProgress > 0 ? Math.min(100, uploadProgress) : null;

    const liveStatus =
        phase === "analyzing" ? `Analyzing ${fileName ?? "file"}…`
            : phase === "uploading" ? (realProgress !== null && realProgress < 100 ? `Uploading dataset — ${Math.round(realProgress)}%` : "Backend is processing predictions…")
                : phase === "success" ? `Complete. ${formatInt(processedRowCount ?? 0)} rows processed.`
                    : phase === "ready" ? (isValid ? "CSV structure verified. Ready to process." : "CSV structure issues detected.")
                        : phase === "error" ? (error ?? "Something went wrong.")
                            : "Ready to process environmental data.";

    useEffect(() => {
        return () => { if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current); };
    }, []);

    const lastErrorRef = useRef<string | null>(null);
    useEffect(() => {
        if (phase === "error" && error && error !== lastErrorRef.current) {
            toast.error(error);
            lastErrorRef.current = error;
        }
        if (phase !== "error") lastErrorRef.current = null;
    }, [phase, error]);

    const handleFile = async (file: File) => {
        if (phase === "analyzing" || phase === "uploading") return;
        dispatch(clearError());
        const looksCsv = /.csv$/i.test(file.name) || (file.type || "").includes("csv");
        if (!looksCsv) {
            const msg = "Only CSV files are supported. Please choose a .csv file.";
            dispatch(setAnalysisError(msg));
            toast.error(msg);
            return;
        }
        if (file.size > MAX_UPLOAD_SIZE_BYTES) {
            const msg = `This file exceeds the ${formatBytes(MAX_UPLOAD_SIZE_BYTES)} limit.`;
            dispatch(setAnalysisError(msg));
            toast.error(msg);
            return;
        }
        setFile(file);
        dispatch(selectFile({ fileName: file.name, fileType: file.type || "text/csv", fileSizeBytes: file.size }));
        try {
            const analysis = await analyzeCsvFile(file, PREVIEW_LIMIT);
            dispatch(setFileData(analysis));
            if (!analysis.isValid) {
                toast.error("CSV structure needs attention before processing.");
            }
        } catch (err) {
            const msg = err instanceof Error ? err.message : "Unable to analyze this CSV file.";
            dispatch(setAnalysisError(msg));
            toast.error(msg);
        }
    };

    const triggerDownload = (blob: Blob, name: string) => {
        if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
        const url = URL.createObjectURL(blob);
        blobUrlRef.current = url;
        const a = document.createElement("a");
        a.href = url;
        a.download = name;
        document.body.appendChild(a);
        a.click();
        a.remove();
    };

    const handleProcess = async () => {
        if (!file || !canProcess) return;
        const controller = new AbortController();
        abortRef.current = controller;
        dispatch(startUpload());
        try {
            const blob: Blob = await uploadPredictionCsv(file,
                (progressEvent) => {
                    if (!progressEvent.total) return;

                    const progress = Math.round(
                        (progressEvent.loaded / progressEvent.total) * 100
                    );

                    dispatch(setUploadProgress(progress));
                }, controller.signal);
            dispatch(startProcessing());
            const resultName = `predicted_${file.name}`;
            const processedRows = rowCount ?? 0;
            triggerDownload(blob, resultName);
            dispatch(uploadSuccess({ resultFileName: resultName, processedRowCount: processedRows }));
            toast.success(`${formatInt(processedRows)} rows processed successfully.`);
        } catch (err) {
            if (controller.signal.aborted) {
                dispatch(cancelUpload());
                toast("Upload cancelled.", { icon: "🛑" });
                return;
            }
            let msg = "Batch processing failed. Please try again.";
            if (err instanceof Error) msg = err.message;
            if (typeof err === "object" && err !== null && "response" in err) {
                const axiosErr = err as AxiosError;
                if (axiosErr.response?.data instanceof Blob) {
                    try {
                        const errorText = await axiosErr.response.data.text();
                        const parsed = JSON.parse(errorText);
                        if (typeof parsed.detail === "string") msg = parsed.detail;
                        else if (typeof parsed.detail?.message === "string") msg = parsed.detail.message;
                    } catch { /* use default */ }
                }
            }
            dispatch(uploadFailure(msg));
        } finally {
            abortRef.current = null;
        }
    };

    const handleCancel = () => { abortRef.current?.abort(); };

    const handleReset = () => {
        abortRef.current?.abort();
        abortRef.current = null;
        dispatch(resetUpload());
        setFile(null);
        if (blobUrlRef.current) {
            URL.revokeObjectURL(blobUrlRef.current);
            blobUrlRef.current = null;
        }
        if (inputRef.current) {
            inputRef.current.value = "";
        }
        setDragActive(false);
        dragDepth.current = 0;
        toast.success("Ready for another dataset.");
    };

    const onDrop = (e: React.DragEvent) => {
        e.preventDefault();
        dragDepth.current = 0;
        setDragActive(false);
        const file = e.dataTransfer.files?.[0];
        if (file) void handleFile(file);
    };

    const handleDownloadAgain = () => {
        if (blobUrlRef.current && resultFileName) {
            const a = document.createElement("a");
            a.href = blobUrlRef.current;
            a.download = resultFileName;
            document.body.appendChild(a);
            a.click();
            a.remove();
        }
    };

    return (
        <div className="fu-root min-h-screen w-full box-border" data-theme={isDark ? "dark" : "day"} style={{ fontFamily: 'var(--bc-font-body)' }}>
            <style>{`
        .fu-root[data-theme='day'] {
          --bc-bg: #F8FAFC; --bc-surface: #FFFFFF; --bc-surface-2: #F0FDF4;
          --bc-ink: #0F2827; --bc-ink-soft: #4A6665; --bc-ink-faint: #8DA3A2;
          --bc-accent: #10B981; --bc-accent-strong: #059669;
          --bc-border: rgba(16, 185, 129, 0.18); --bc-border-strong: rgba(16, 185, 129, 0.38);
          --bc-danger: #DC2626; --bc-danger-bg: rgba(220, 38, 38, 0.08);
          --bc-warn: #B45309; --bc-warn-bg: rgba(245, 158, 11, 0.1);
          --bc-success: #059669; --bc-success-bg: rgba(16, 185, 129, 0.1);
          --bc-focus-ring: rgba(16, 185, 129, 0.35); --bc-track: rgba(16, 185, 129, 0.12);
        }
        .fu-root[data-theme='dark'] {
          --bc-bg: #0A1418; --bc-surface: #101C21; --bc-surface-2: #0C1A1E;
          --bc-ink: #E7F1F0; --bc-ink-soft: #93ACB0; --bc-ink-faint: #5E767B;
          --bc-accent: #4FD8C4; --bc-accent-strong: #7EE9DA;
          --bc-border: rgba(231, 241, 240, 0.12); --bc-border-strong: rgba(231, 241, 240, 0.26);
          --bc-danger: #FF6B57; --bc-danger-bg: rgba(255, 107, 87, 0.1);
          --bc-warn: #F0B65E; --bc-warn-bg: rgba(240, 182, 94, 0.1);
          --bc-success: #4FD8C4; --bc-success-bg: rgba(79, 216, 196, 0.1);
          --bc-focus-ring: rgba(79, 216, 196, 0.38); --bc-track: rgba(231, 241, 240, 0.1);
        }
        @keyframes fu-dot-pulse { 0%, 100% { opacity: 0.6; } 50% { opacity: 1; } }
        @keyframes fu-rise { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fu-float-y { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
        @keyframes fu-beam { 0% { transform: translateX(-60%); } 100% { transform: translateX(260%); } }
        @keyframes fu-indet { 0% { transform: translateX(-110%); } 100% { transform: translateX(280%); } }
        @keyframes fu-pop { from { opacity: 0; transform: scale(0.6); } to { opacity: 1; transform: scale(1); } }
        @keyframes fu-wind { from { stroke-dashoffset: 240; } to { stroke-dashoffset: 0; } }
        @keyframes fu-float { 0%, 100% { transform: translate3d(0,0,0); opacity: 0.5; } 50% { transform: translate3d(0,-13px,0); opacity: 0.95; } }
        @keyframes fu-twinkle { 0%, 100% { opacity: 0.15; } 50% { opacity: 0.9; } }
        @keyframes fu-ring-rot { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes fu-ring-rot-rev { from { transform: rotate(360deg); } to { transform: rotate(0deg); } }
        @keyframes fu-scan-move { from { transform: translateX(-100px); } to { transform: translateX(580px); } }
        @keyframes fu-drift { from { transform: translate3d(-6%, 0, 0); } to { transform: translate3d(6%, 0, 0); } }
        @keyframes fu-drift-slow { from { transform: translate3d(-4%, 0, 0); } to { transform: translate3d(5%, 0, 0); } }
        
        .fu-wind { stroke-dasharray: 8 14; animation: fu-wind linear infinite; }
        .fu-particle { animation: fu-float ease-in-out infinite; transform-box: fill-box; transform-origin: center; }
        .fu-star { animation: fu-twinkle ease-in-out infinite; transform-box: fill-box; transform-origin: center; }
        .fu-ring { transform-box: fill-box; transform-origin: center; animation: fu-ring-rot 26s linear infinite; }
        .fu-ring-rev { transform-box: fill-box; transform-origin: center; animation: fu-ring-rot-rev 34s linear infinite; }
        .fu-scan { animation: fu-scan-move 3.2s ease-in-out infinite; }
        .fu-cloud-a { animation: fu-drift 46s ease-in-out infinite alternate; }
        .fu-cloud-b { animation: fu-drift-slow 62s ease-in-out infinite alternate; }
        
        @media (prefers-reduced-motion: reduce) {
          .fu-wind, .fu-particle, .fu-star, .fu-ring, .fu-ring-rev, .fu-scan,
          .fu-cloud-a, .fu-cloud-b { animation: none !important; }
        }
      `}</style>

            <Atmosphere isDark={isDark} mood={mood} />

            <header className="sticky top-0 z-40 border-b border-(--bc-border) bg-[color-mix(in_srgb,var(--bc-bg)_72%,transparent)] backdrop-blur-md">
                <Navbar />
            </header>
            <main className="relative z-1 bg-transparent text-(--bc-ink) min-h-screen overflow-x-hidden">

                <section className="max-w-310 mx-auto px-4 pt-1 pb-3.5 w-full md:px-10 md:pb-6.5 md:max-w-215">
                    <p className="text-[11px] tracking-[0.14em] uppercase text-(--bc-accent-strong) font-semibold m-0 mb-2 sm:text-xs">Batch Processing</p>
                    <h1 className="font-semibold text-[clamp(22px,5vw,38px)] leading-[1.15] m-0 mb-2.5 wrap-wrap-break-word">Environmental data, analyzed at scale.</h1>
                    <p className="text-sm leading-[1.55] text-(--bc-ink-soft) m-0 max-w-[62ch] sm:text-[15px]">
                        Import a CSV of environmental conditions. {companyName} validates its structure, previews the
                        dataset, then sends it for batch AQI prediction — your processed file downloads automatically.
                    </p>
                </section>

                <WorkflowStepper states={stepStates} />

                <p className="max-w-310 mx-auto mb-3.5 px-4 w-full flex items-center gap-2 text-xs text-(--bc-ink-soft) md:px-10 md:text-[13px]" role="status" aria-live="polite">
                    <span className="w-1.5 h-1.5 rounded-full bg-(--bc-accent) shrink-0 animate-[fu-dot-pulse_2.6s_ease-in-out_infinite] sm:w-1.75 sm:h-1.75" aria-hidden="true" />
                    {liveStatus}
                </p>

                <div className="max-w-310 mx-auto px-4 pb-16 w-full grid grid-cols-1 gap-4 items-start md:px-10 md:pb-20 md:gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-7">
                    {/* ================= LEFT — IMPORT & PROCESS ================= */}
                    <div style={{ minWidth: 0 }}>
                        <div className="bg-(--bc-surface) border border-(--bc-border) rounded-4.5 p-4.5 shadow-[0_18px_50px_-30px_rgba(9,30,34,0.35)] w-full max-w-full overflow-hidden sm:p-5.5" key={phase}>
                            <h2 className="flex items-center gap-2 text-[13px] font-bold m-0 mb-3 sm:text-sm sm:mb-3.5 [&_svg]:text-(--bc-accent-strong) [&_svg]:shrink-0">
                                <FileUp size={16} />
                                Dataset Import
                            </h2>

                            {/* ---------- IDLE / dropzone ---------- */}
                            {(phase === "idle" || (phase === "error" && !hasAnalysis)) && (
                                <div className="animate-[fu-rise_0.45s_cubic-bezier(0.16,1,0.3,1)_both]">
                                    <div
                                        className={`border-[1.5px] border-dashed border-(--bc-border-strong) rounded-4.5 bg-[color-mix(in_srgb,var(--bc-surface-2)_70%,transparent)] p-6 px-4 text-center cursor-pointer flex flex-col items-center gap-2 transition-[border-color,background,transform] duration-200 w-full hover:border-(--bc-accent) focus-visible:outline-2 focus-visible:outline-(--bc-accent) focus-visible:outline-offset-0.75 sm:py-8 sm:px-5.5 sm:gap-2.5 ${dragActive ? 'border-(--bc-accent) bg-(--bc-success-bg) scale-[1.01]' : ''}`}
                                        role="button"
                                        tabIndex={0}
                                        aria-label="Upload a CSV file for batch AQI prediction. Press Enter to browse files."
                                        onClick={() => inputRef.current?.click()}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter" || e.key === " ") {
                                                e.preventDefault();
                                                inputRef.current?.click();
                                            }
                                        }}
                                        onDragEnter={(e) => { e.preventDefault(); dragDepth.current += 1; setDragActive(true); }}
                                        onDragOver={(e) => e.preventDefault()}
                                        onDragLeave={(e) => {
                                            e.preventDefault();
                                            dragDepth.current = Math.max(0, dragDepth.current - 1);
                                            if (dragDepth.current === 0) setDragActive(false);
                                        }}
                                        onDrop={onDrop}
                                    >
                                        <input
                                            ref={inputRef}
                                            type="file"
                                            accept=".csv,text/csv,application/csv"
                                            className="sr-only"
                                            tabIndex={-1}
                                            onChange={(e) => {
                                                const f = e.target.files?.[0];
                                                if (f) void handleFile(f);
                                                e.target.value = "";
                                            }}
                                        />
                                        <span className="w-11 h-11 rounded-xl inline-flex items-center justify-center bg-[color-mix(in_srgb,var(--bc-accent)_14%,transparent)] text-(--bc-accent-strong) animate-[fu-float-y_4.5s_ease-in-out_infinite] sm:w-13 sm:h-13 sm:rounded-[14px]"><FileSpreadsheet size={24} /></span>
                                        <p className="text-base font-semibold m-0.5 mt-0 mb-0 sm:text-lg">Drop your CSV here</p>
                                        <p className="text-xs text-(--bc-ink-soft) m-0 leading-normal max-w-[36ch] sm:text-[13px]">Environmental batch prediction — the atmosphere reacts as your data moves through the pipeline.</p>
                                        <span className="mt-1 inline-flex items-center gap-1.75 border-[1.5px] border-(--bc-border-strong) rounded-full px-3.5 py-1.5 text-xs font-semibold text-(--bc-accent-strong) bg-(--bc-surface) sm:px-4 sm:py-2 sm:text-[13px]">Browse files</span>
                                        <div className="flex flex-wrap gap-x-3 gap-y-1 justify-center text-[10.5px] text-(--bc-ink-faint) mt-1 sm:text-[11.5px] sm:gap-x-3.5 sm:gap-y-1.5">
                                            <span className="inline-flex items-center gap-1"><FileSpreadsheet size={12} /> CSV only</span>
                                            <span className="inline-flex items-center gap-1"><HardDrive size={12} /> Up to {formatBytes(MAX_UPLOAD_SIZE_BYTES)}</span>
                                            <span className="inline-flex items-center gap-1"><Hash size={12} /> {REQUIRED_COLUMNS.length} columns</span>
                                        </div>
                                    </div>

                                    <button
                                        type="button"
                                        className={`mx-auto mt-2.5 inline-flex items-center gap-1 bg-transparent border-none text-(--bc-ink-faint) text-[11px] font-semibold cursor-pointer px-1.5 py-1 rounded-md hover:text-(--bc-ink-soft) focus-visible:outline-2 focus-visible:outline-(--bc-accent) focus-visible:outline-offset-2 [&_svg]:transition-transform [&_svg]:duration-200 sm:text-xs sm:gap-1.5 ${showRequired ? '[&_svg]:rotate-180' : ''}`}
                                        onClick={() => setShowRequired((s) => !s)}
                                        aria-expanded={showRequired}
                                    >
                                        View required columns
                                        <ChevronDown size={13} />
                                    </button>

                                    {showRequired && (
                                        <div className="flex flex-wrap gap-1.5 justify-center mt-2.5">
                                            {REQUIRED_COLUMNS.map((c) => (
                                                <span className="inline-flex items-center gap-1 text-[10.5px] font-semibold px-2 py-0.5 rounded-full border border-(--bc-border) text-(--bc-ink-soft) bg-(--bc-surface-2) max-w-40 sm:text-[11.5px] sm:px-2 sm:py-1 sm:max-w-45 [&_span]:overflow-hidden [&_span]:text-ellipsis [&_span]:whitespace-nowrap" key={c}>
                                                    <span>{c}</span>
                                                </span>
                                            ))}
                                        </div>
                                    )}

                                    {phase === "error" && error && (
                                        <div className="flex items-start gap-2 rounded-[10px] p-2.5 px-3 text-[12.5px] leading-[1.45] mt-3 bg-(--bc-danger-bg) text-(--bc-danger) border border-[color-mix(in_srgb,var(--bc-danger)_35%,transparent)] sm:rounded-xl sm:p-3 sm:px-3.5 sm:text-[13px] sm:leading-normal sm:gap-2.5 sm:mt-3.5 [&_svg]:shrink-0 [&_svg]:mt-px" role="alert">
                                            <AlertCircle size={15} />
                                            <div>
                                                <p className="font-bold m-0 mb-0.75 text-[12.5px] sm:text-[13px] sm:mb-1">Import failed</p>
                                                <p className="m-0 wrap-break-word">{error}</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* ---------- ANALYZING ---------- */}
                            {phase === "analyzing" && (
                                <div className="animate-[fu-rise_0.45s_cubic-bezier(0.16,1,0.3,1)_both] p-4 px-4.5 sm:p-5 sm:px-5.5" aria-busy="true">
                                    <div className="flex items-center gap-2.5 justify-center mb-4 [&_svg]:text-(--bc-accent-strong) [&_svg]:shrink-0">
                                        <FileSpreadsheet size={20} />
                                        <div style={{ minWidth: 0 }}>
                                            <div className="font-semibold text-[13px] overflow-hidden text-ellipsis whitespace-nowrap max-w-50 sm:text-sm sm:max-w-60">{fileName}</div>
                                            <div className="text-[11px] text-(--bc-ink-faint) sm:text-xs">{fileSizeBytes !== null ? formatBytes(fileSizeBytes) : ""}</div>
                                        </div>
                                    </div>
                                    <div className="relative overflow-hidden flex flex-col gap-2 rounded-[10px] p-2.5 bg-(--bc-surface-2) sm:p-3">
                                        <div className="flex gap-2"><span className="h-2.5 rounded-1.25 bg-(--bc-track) flex-1" /><span className="h-2.5 rounded-1.25 bg-(--bc-track) flex-[1.4]" /><span className="h-2.5 rounded-1.25 bg-(--bc-track) flex-[0.8]" /></div>
                                        <div className="flex gap-2"><span className="h-2.5 rounded-1.25 bg-(--bc-track) flex-1" /><span className="h-2.5 rounded-1.25 bg-(--bc-track) flex-[1.4]" /><span className="h-2.5 rounded-1.25 bg-(--bc-track) flex-[0.8]" /></div>
                                        <div className="flex gap-2"><span className="h-2.5 rounded-1.25 bg-(--bc-track) flex-1" /><span className="h-2.5 rounded-1.25 bg-(--bc-track) flex-[1.4]" /><span className="h-2.5 rounded-1.25 bg-(--bc-track) flex-[0.8]" /></div>
                                        <div className="flex gap-2"><span className="h-2.5 rounded-1.25 bg-(--bc-track) flex-1" /><span className="h-2.5 rounded-1.25 bg-(--bc-track) flex-[1.4]" /><span className="h-2.5 rounded-1.25 bg-(--bc-track) flex-[0.8]" /></div>
                                        <div className="absolute top-0 bottom-0 w-[40%] bg-linear-to-r from-transparent via-[color-mix(in_srgb,var(--bc-accent)_22%,transparent)] to-transparent animate-[fu-beam_1.6s_ease-in-out_infinite]" />
                                    </div>
                                    <p className="text-center text-[11.5px] text-(--bc-ink-soft) mt-3 sm:text-[12.5px]">Inspecting headers, rows & structure…</p>
                                </div>
                            )}

                            {/* ---------- READY / UPLOADING ---------- */}
                            {(phase === "ready" || phase === "uploading") && (
                                <div className="animate-[fu-rise_0.45s_cubic-bezier(0.16,1,0.3,1)_both]">
                                    <div className="flex items-center gap-2.5 mb-3.5 min-w-0 sm:gap-3 sm:mb-4">
                                        <span className="w-9.5 h-9.5 rounded-[10px] shrink-0 inline-flex items-center justify-center bg-[color-mix(in_srgb,var(--bc-accent)_14%,transparent)] text-(--bc-accent-strong) sm:w-10.5 sm:h-10.5 sm:rounded-xl"><FileSpreadsheet size={20} /></span>
                                        <div style={{ minWidth: 0 }}>
                                            <div className="font-bold text-sm overflow-hidden text-ellipsis whitespace-nowrap sm:text-[15px]" title={fileName ?? ""}>{fileName}</div>
                                            <div className="text-[11px] text-(--bc-ink-faint) sm:text-xs">{fileType || "text/csv"}</div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2 sm:gap-2.5 sm:grid-cols-4">
                                        <StatTile icon={<HardDrive size={14} />} label="Size" value={fileSizeBytes !== null ? formatBytes(fileSizeBytes) : "—"} />
                                        <StatTile icon={<Database size={14} />} label="Rows" value={rowCount !== null ? formatInt(rowCount) : "—"} />
                                        <StatTile icon={<Hash size={14} />} label="Columns" value={columnCount !== null ? formatInt(columnCount) : "—"} />
                                        <StatTile icon={isValid ? <ShieldCheck size={14} /> : <ShieldAlert size={14} />} label="Structure" value={isValid ? "Verified" : "Issues"} />
                                    </div>

                                    {isValid ? (
                                        <div className="flex items-start gap-2 rounded-[10px] p-2.5 px-3 text-[12.5px] leading-[1.45] mt-3 bg-(--bc-success-bg) text-(--bc-success) border border-[color-mix(in_srgb,var(--bc-success)_30%,transparent)] sm:rounded-xl sm:p-3 sm:px-3.5 sm:text-[13px] sm:leading-normal sm:gap-2.5 sm:mt-3.5 [&_svg]:shrink-0 [&_svg]:mt-px">
                                            <CheckCircle2 size={15} />
                                            <div>
                                                <p className="font-bold m-0 mb-0.75 text-[12.5px] sm:text-[13px] sm:mb-1">CSV structure verified</p>
                                                <p className="m-0 wrap-break-word">All {REQUIRED_COLUMNS.length} required environmental columns are present. Ready for batch prediction.</p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex items-start gap-2 rounded-[10px] p-2.5 px-3 text-[12.5px] leading-[1.45] mt-3 bg-(--bc-warn-bg) text-(--bc-warn) border border-[color-mix(in_srgb,var(--bc-warn)_35%,transparent)] sm:rounded-xl sm:p-3 sm:px-3.5 sm:text-[13px] sm:leading-normal sm:gap-2.5 sm:mt-3.5 [&_svg]:shrink-0 [&_svg]:mt-px" role="alert">
                                            <AlertTriangle size={15} />
                                            <div>
                                                <p className="font-bold m-0 mb-0.75 text-[12.5px] sm:text-[13px] sm:mb-1">CSV structure issue</p>
                                                <p className="m-0 wrap-break-word">The file cannot be processed until the CSV structure is corrected.</p>
                                                {(missingColumns.length > 0 || duplicateColumns.length > 0 || (rowCount ?? 0) === 0) && (
                                                    <div className="flex flex-wrap gap-1.5 mt-1.5 sm:gap-2 sm:mt-2">
                                                        {(rowCount ?? 0) === 0 && <span className="inline-flex items-center gap-1 text-[10.5px] font-semibold px-2 py-0.5 rounded-full border border-[color-mix(in_srgb,var(--bc-warn)_45%,transparent)] text-(--bc-warn) bg-(--bc-warn-bg) max-w-40 sm:text-[11.5px] sm:px-2 sm:py-1 sm:max-w-45"><AlertCircle size={11} /><span>No data rows detected</span></span>}
                                                        {missingColumns.map((c) => (
                                                            <span className="inline-flex items-center gap-1 text-[10.5px] font-semibold px-2 py-0.5 rounded-full border border-[color-mix(in_srgb,var(--bc-warn)_45%,transparent)] text-(--bc-warn) bg-(--bc-warn-bg) max-w-40 sm:text-[11.5px] sm:px-2 sm:py-1 sm:max-w-45" key={`m-${c}`}><X size={11} /><span>{c}</span></span>
                                                        ))}
                                                        {duplicateColumns.map((c) => (
                                                            <span className="inline-flex items-center gap-1 text-[10.5px] font-semibold px-2 py-0.5 rounded-full border border-[color-mix(in_srgb,var(--bc-warn)_45%,transparent)] text-(--bc-warn) bg-(--bc-warn-bg) max-w-40 sm:text-[11.5px] sm:px-2 sm:py-1 sm:max-w-45" key={`d-${c}`}><AlertTriangle size={11} /><span>{c} (duplicate)</span></span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {sizeExceeded && (
                                        <div className="flex items-start gap-2 rounded-[10px] p-2.5 px-3 text-[12.5px] leading-[1.45] mt-3 bg-(--bc-danger-bg) text-(--bc-danger) border border-[color-mix(in_srgb,var(--bc-danger)_35%,transparent)] sm:rounded-xl sm:p-3 sm:px-3.5 sm:text-[13px] sm:leading-normal sm:gap-2.5 sm:mt-3.5 [&_svg]:shrink-0 [&_svg]:mt-px" role="alert">
                                            <AlertCircle size={15} />
                                            <p className="m-0 wrap-break-word">File exceeds the {formatBytes(MAX_UPLOAD_SIZE_BYTES)} limit and cannot be processed.</p>
                                        </div>
                                    )}

                                    {phase === "uploading" && (
                                        <div className="mt-3.5 sm:mt-4">
                                            <div className="flex justify-between text-[11px] text-(--bc-ink-soft) mb-1.5 gap-2 sm:text-xs sm:mb-1.75">
                                                <span>{realProgress !== null && realProgress < 100 ? "Uploading dataset…" : "Backend processing predictions…"}</span>
                                                <span>{realProgress !== null && realProgress < 100 ? `${Math.round(realProgress)}%` : "please wait"}</span>
                                            </div>
                                            <div className="h-1.25 rounded-full bg-(--bc-track) overflow-hidden relative sm:h-1.5">
                                                {realProgress !== null && realProgress < 100 ? (
                                                    <div className="absolute inset-0 bg-(--bc-accent) rounded-full origin-left transition-transform duration-400" style={{ transform: `scaleX(${realProgress / 100})` }} />
                                                ) : (
                                                    <div className="absolute top-0 bottom-0 w-[40%] rounded-full bg-(--bc-accent) animate-[fu-indet_1.5s_cubic-bezier(0.4,0,0.4,1)_infinite]" />
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex gap-2 mt-4 flex-wrap sm:gap-2.5 sm:mt-4.5">
                                        {phase === "uploading" ? (
                                            <button type="button" className="inline-flex items-center justify-center gap-1.5 rounded-[10px] text-[13px] font-semibold px-3.5 py-2.75 cursor-pointer transition-[transform,box-shadow,opacity,border-color,background] duration-150 min-h-10.5 focus-visible:outline-2 focus-visible:outline-(--bc-accent) focus-visible:outline-offset-2 sm:gap-2 sm:text-sm sm:px-4.5 sm:py-3 border-[1.5px] border-[color-mix(in_srgb,var(--bc-danger)_40%,transparent)] bg-transparent text-(--bc-danger) hover:bg-(--bc-danger-bg)" onClick={handleCancel}>
                                                <X size={15} />
                                                Cancel
                                            </button>
                                        ) : (
                                            <>
                                                <button type="button" className="inline-flex items-center justify-center gap-1.5 rounded-[10px] text-[13px] font-semibold px-3.5 py-2.75 cursor-pointer transition-[transform,box-shadow,opacity,border-color,background] duration-150 min-h-10.5 focus-visible:outline-2 focus-visible:outline-(--bc-accent) focus-visible:outline-offset-2 sm:gap-2 sm:text-sm sm:px-4.5 sm:py-3 border-[1.5px] border-(--bc-border) bg-(--bc-surface) text-(--bc-ink-soft) hover:enabled:text-(--bc-ink) hover:enabled:border-(--bc-border-strong) disabled:opacity-50 disabled:cursor-not-allowed" onClick={handleReset}>
                                                    <RotateCcw size={15} />
                                                    Remove
                                                </button>
                                                <button type="button" className="inline-flex items-center justify-center gap-1.5 rounded-[10px] text-[13px] font-semibold px-3.5 py-2.75 cursor-pointer transition-[transform,box-shadow,opacity,border-color,background] duration-150 min-h-10.5 focus-visible:outline-2 focus-visible:outline-(--bc-accent) focus-visible:outline-offset-2 sm:gap-2 sm:text-sm sm:px-4.5 sm:py-3 flex-1 border-none bg-(--bc-accent-strong) text-[#F4FBF9] shadow-[0_10px_30px_-12px_color-mix(in_srgb,var(--bc-accent-strong)_60%,transparent)] hover:enabled:-translate-y-px disabled:opacity-55 disabled:cursor-not-allowed disabled:shadow-none" onClick={() => void handleProcess()} disabled={!canProcess}>
                                                    Analyze & Predict
                                                    <ArrowRight size={16} />
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* ---------- SUCCESS ---------- */}
                            {phase === "success" && (
                                <div className="animate-[fu-rise_0.45s_cubic-bezier(0.16,1,0.3,1)_both] text-center p-6 px-4.5 sm:p-7 sm:px-5.5">
                                    <div className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center bg-(--bc-success-bg) text-(--bc-success) animate-[fu-pop_0.5s_cubic-bezier(0.16,1,0.3,1)_both] sm:w-14 sm:h-14 sm:mb-3.5"><CheckCircle2 size={26} /></div>
                                    <h3 className="text-xl font-semibold m-0 mb-1.5 sm:text-5.5">Analysis complete</h3>
                                    <p className="text-[12.5px] font-semibold text-(--bc-accent-strong) m-0 mb-1 break-all sm:text-[13.5px]">{resultFileName ?? "processed.csv"}</p>
                                    <p className="text-xs text-(--bc-ink-soft) m-0 mb-1 sm:text-[13px]">{formatInt(processedRowCount ?? 0)} rows processed</p>
                                    <p className="text-[11px] text-(--bc-ink-faint) m-0 mb-4 leading-normal sm:text-xs sm:mb-4.5 sm:leading-[1.55]">
                                        Your dataset was enriched server-side with <strong>prediction</strong>, <strong>status</strong> and{" "}
                                        <strong>message</strong> columns, and downloaded automatically.
                                    </p>
                                    <div className="flex gap-2 mt-4 flex-wrap sm:gap-2.5 sm:mt-4.5 justify-center">
                                        <button type="button" className="inline-flex items-center justify-center gap-1.5 rounded-[10px] text-[13px] font-semibold px-3.5 py-2.75 cursor-pointer transition-[transform,box-shadow,opacity,border-color,background] duration-150 min-h-10.5 focus-visible:outline-2 focus-visible:outline-(--bc-accent) focus-visible:outline-offset-2 sm:gap-2 sm:text-sm sm:px-4.5 sm:py-3 border-[1.5px] border-(--bc-border) bg-(--bc-surface) text-(--bc-ink-soft) hover:enabled:text-(--bc-ink) hover:enabled:border-(--bc-border-strong) disabled:opacity-50 disabled:cursor-not-allowed" onClick={handleDownloadAgain}>
                                            <Download size={15} />
                                            Download again
                                        </button>
                                        <button type="button" className="inline-flex items-center justify-center gap-1.5 rounded-[10px] text-[13px] font-semibold px-3.5 py-2.75 cursor-pointer transition-[transform,box-shadow,opacity,border-color,background] duration-150 min-h-10.5 focus-visible:outline-2 focus-visible:outline-(--bc-accent) focus-visible:outline-offset-2 sm:gap-2 sm:text-sm sm:px-4.5 sm:py-3 flex-1 border-none bg-(--bc-accent-strong) text-[#F4FBF9] shadow-[0_10px_30px_-12px_color-mix(in_srgb,var(--bc-accent-strong)_60%,transparent)] hover:enabled:-translate-y-px disabled:opacity-55 disabled:cursor-not-allowed disabled:shadow-none" style={{ flex: "0 1 auto" }} onClick={handleReset}>
                                            <FileUp size={15} />
                                            Upload another CSV
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* ---------- ERROR with analysis ---------- */}
                            {phase === "error" && hasAnalysis && (
                                <div className="animate-[fu-rise_0.45s_cubic-bezier(0.16,1,0.3,1)_both]">
                                    <div className="flex items-start gap-2 rounded-[10px] p-2.5 px-3 text-[12.5px] leading-[1.45] mt-3 bg-(--bc-danger-bg) text-(--bc-danger) border border-[color-mix(in_srgb,var(--bc-danger)_35%,transparent)] sm:rounded-xl sm:p-3 sm:px-3.5 sm:text-[13px] sm:leading-normal sm:gap-2.5 sm:mt-3.5 [&_svg]:shrink-0 [&_svg]:mt-px" role="alert">
                                        <AlertCircle size={15} />
                                        <div>
                                            <p className="font-bold m-0 mb-0.75 text-[12.5px] sm:text-[13px] sm:mb-1">Processing failed</p>
                                            <p className="m-0 wrap-break-word">{error ?? "Something went wrong while processing your file."}</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2 mt-4 flex-wrap sm:gap-2.5 sm:mt-4.5">
                                        <button type="button" className="inline-flex items-center justify-center gap-1.5 rounded-[10px] text-[13px] font-semibold px-3.5 py-2.75 cursor-pointer transition-[transform,box-shadow,opacity,border-color,background] duration-150 min-h-10.5 focus-visible:outline-2 focus-visible:outline-(--bc-accent) focus-visible:outline-offset-2 sm:gap-2 sm:text-sm sm:px-4.5 sm:py-3 border-[1.5px] border-(--bc-border) bg-(--bc-surface) text-(--bc-ink-soft) hover:enabled:text-(--bc-ink) hover:enabled:border-(--bc-border-strong) disabled:opacity-50 disabled:cursor-not-allowed" onClick={handleReset}>
                                            <RotateCcw size={15} />
                                            Start over
                                        </button>
                                        {file && isValid && (
                                            <button type="button" className="inline-flex items-center justify-center gap-1.5 rounded-[10px] text-[13px] font-semibold px-3.5 py-2.75 cursor-pointer transition-[transform,box-shadow,opacity,border-color,background] duration-150 min-h-10.5 focus-visible:outline-2 focus-visible:outline-(--bc-accent) focus-visible:outline-offset-2 sm:gap-2 sm:text-sm sm:px-4.5 sm:py-3 flex-1 border-none bg-(--bc-accent-strong) text-[#F4FBF9] shadow-[0_10px_30px_-12px_color-mix(in_srgb,var(--bc-accent-strong)_60%,transparent)] hover:enabled:-translate-y-px disabled:opacity-55 disabled:cursor-not-allowed disabled:shadow-none" onClick={() => void handleProcess()}>
                                                Retry processing
                                                <ArrowRight size={16} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ================= RIGHT — DATASET INSPECTOR ================= */}
                    <div style={{ minWidth: 0 }}>
                        <div className="bg-(--bc-surface) border border-(--bc-border) rounded-4.5 p-4.5 shadow-[0_18px_50px_-30px_rgba(9,30,34,0.35)] w-full max-w-full overflow-hidden sm:p-5.5">
                            <div className="flex items-center justify-between gap-2 mb-2.5 flex-wrap sm:gap-2.5 sm:mb-3">
                                <h2 className="flex items-center gap-2 text-[13px] font-bold m-0 sm:text-sm [&_svg]:text-(--bc-accent-strong) [&_svg]:shrink-0">
                                    <TableIcon size={16} />
                                    Dataset Inspector
                                </h2>
                                {headers.length > 0 && (
                                    <span className="text-[10.5px] text-(--bc-ink-faint) sm:text-[11.5px]">
                                        Showing {previewRows.length} of {formatInt(rowCount ?? 0)} rows
                                    </span>
                                )}
                            </div>

                            {headers.length === 0 ? (
                                <div className="border-[1.5px] border-dashed border-(--bc-border-strong) rounded-4.5 min-h-55 flex flex-col items-center justify-center gap-2.5 text-(--bc-ink-faint) text-center p-5 sm:min-h-65 sm:p-6 [&_p]:m-0 [&_p]:text-[12.5px] [&_p]:max-w-[30ch] [&_p]:leading-normal sm:[&_p]:text-[13px]">
                                    <TableIcon size={26} />
                                    <p>{phase === "analyzing" ? "Waiting for structural analysis…" : "No dataset loaded yet. Structural inspection and a data preview will appear here."}</p>
                                </div>
                            ) : (
                                <div className="animate-[fu-rise_0.45s_cubic-bezier(0.16,1,0.3,1)_both]">
                                    <div className="flex flex-wrap gap-1.5 mb-3 sm:gap-2 sm:mb-3.5">
                                        {headers.map((h, i) => {
                                            const dup = duplicateColumns.includes(h);
                                            const required = REQUIRED_COLUMNS.includes(h);
                                            return (
                                                <span
                                                    className={`inline-flex items-center gap-1 text-[10.5px] font-semibold px-2 py-0.5 rounded-full border max-w-40 sm:text-[11.5px] sm:px-2 sm:py-1 sm:max-w-45 [&_span]:overflow-hidden [&_span]:text-ellipsis [&_span]:whitespace-nowrap
                            ${dup ? 'border-[color-mix(in_srgb,var(--bc-warn)_45%,transparent)] text-(--bc-warn) bg-(--bc-warn-bg)' :
                                                            required ? 'border-[color-mix(in_srgb,var(--bc-success)_35%,transparent)] text-(--bc-success) bg-(--bc-success-bg)' :
                                                                'border-(--bc-border) text-(--bc-ink-soft) bg-(--bc-surface-2)'}`}
                                                    key={`${h}-${i}`}
                                                    title={h}
                                                >
                                                    {required && !dup ? <Check size={11} /> : <Hash size={11} />}
                                                    <span>{h}</span>
                                                </span>
                                            );
                                        })}
                                    </div>
                                    <div className="overflow-auto max-h-90 border border-(--bc-border) rounded-[10px] bg-(--bc-surface-2) w-full max-w-full [-webkit-overflow-scrolling:touch] sm:max-h-95 sm:rounded-xl focus-visible:outline-2 focus-visible:outline-(--bc-accent) focus-visible:outline-offset-2" tabIndex={0} role="region" aria-label={`CSV preview, first ${previewRows.length} rows`}>
                                        <table className="border-separate border-spacing-0 text-[11.5px] min-w-full sm:text-[12.5px]">
                                            <thead>
                                                <tr>
                                                    <th className="sticky top-0 left-0 z-2 bg-inherit text-left text-[10px] uppercase tracking-wider text-(--bc-ink-soft) px-2.5 py-2 border-b border-(--bc-border) whitespace-nowrap tabular-nums w-9 sm:w-11 sm:text-[11px] sm:px-3 sm:py-2.25" scope="col">#</th>
                                                    {headers.map((h, i) => (
                                                        <th key={`${h}-${i}`} scope="col" title={h} className="sticky top-0 z-2 bg-(--bc-surface) text-left text-[10px] uppercase tracking-wider text-(--bc-ink-soft) px-2.5 py-2 border-b border-(--bc-border) whitespace-nowrap sm:text-[11px] sm:px-3 sm:py-2.25">
                                                            <span className="inline-block max-w-30 overflow-hidden text-ellipsis align-bottom sm:max-w-35">{h}</span>
                                                        </th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {previewRows.map((row, r) => (
                                                    <tr key={r} className="transition-colors duration-150 hover:bg-[color-mix(in_srgb,var(--bc-accent)_6%,transparent)]">
                                                        <td className="px-2.5 py-1.5 border-b border-(--bc-border) 
                                                        text-(--bc-ink) whitespace-nowrap max-w-35 overflow-hidden text-ellipsis tabular-nums w-9 bg-inherit sm:w-11 sm:px-3 sm:py-1.75 sm:max-w-42.5">{r + 1}</td>
                                                        {headers.map((_, c) => (
                                                            <td key={c} title={row[c] ?? ""} className="px-2.5 py-1.5 border-b border-(--bc-border) text-(--bc-ink) whitespace-nowrap max-w-35 overflow-hidden text-ellipsis sm:px-3 sm:py-1.75 sm:max-w-42.5">{row[c] ?? ""}</td>
                                                        ))}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>
            <Footer/>
        </div>
    );
};

export default FileUpload;