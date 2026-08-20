export interface CsvAnalysis {
    fileName: string;
    fileType: string;
    fileSizeBytes: number;
    rowCount: number;
    columnCount: number;
    headers: string[];
    previewRows: string[][];
    missingColumns: string[];
    duplicateColumns: string[];
    isValid: boolean;
}

export type UploadPhase =
    | "idle"
    | "analyzing"
    | "ready"
    | "uploading"
    | "success"
    | "error";

export interface FileUploadState {
    fileName: string | null;
    fileType: string | null;
    fileSizeBytes: number | null;

    rowCount: number | null;
    columnCount: number | null;

    headers: string[];
    previewRows: string[][];

    missingColumns: string[];
    duplicateColumns: string[];

    isValid: boolean;

    phase: UploadPhase;
    uploadProgress: number;

    error: string | null;

    resultFileName: string | null;
    processedRowCount: number | null;
}