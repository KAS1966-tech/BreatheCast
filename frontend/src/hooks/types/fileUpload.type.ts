export interface UploadedFile {
    id: number;
    original_name: string;
    file_size: number;
    file_type: string;
    row_count: number;
    prediction_count: number;
    created_at: string;
}

export interface FileHistoryResponse {
    total: number;
    skip: number;
    limit: number;
    files: UploadedFile[];
}

export interface DeleteFileResponse {
    status: string;
    message: string;
    deleted_file_id: number;
}

export type UploadPhase =
    | "idle"
    | "analyzing"
    | "ready"
    | "uploading"
    | "processing"
    | "success"
    | "error";

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