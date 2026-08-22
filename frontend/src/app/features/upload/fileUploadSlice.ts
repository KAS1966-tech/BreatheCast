import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type {
    CsvAnalysis,
    FileUploadState,
} from "../../../hooks/types/fileUpload.type";

const initialState: FileUploadState = {
    fileName: null,
    fileType: null,
    fileSizeBytes: null,

    rowCount: null,
    columnCount: null,

    headers: [],
    previewRows: [],

    missingColumns: [],
    duplicateColumns: [],

    isValid: false,

    phase: "idle",
    uploadProgress: 0,

    error: null,

    resultFileName: null,
    processedRowCount: null,
};

const fileUploadSlice = createSlice({
    name: "fileUpload",
    initialState,

    reducers: {
        selectFile: (
            state,
            action: PayloadAction<{
                fileName: string;
                fileType: string;
                fileSizeBytes: number;
            }>
        ) => {
            state.fileName = action.payload.fileName;
            state.fileType = action.payload.fileType;
            state.fileSizeBytes = action.payload.fileSizeBytes;

            state.rowCount = null;
            state.columnCount = null;

            state.headers = [];
            state.previewRows = [];

            state.missingColumns = [];
            state.duplicateColumns = [];

            state.isValid = false;

            state.phase = "analyzing";
            state.uploadProgress = 0;

            state.error = null;

            state.resultFileName = null;
            state.processedRowCount = null;
        },

        setFileData: (
            state,
            action: PayloadAction<CsvAnalysis>
        ) => {
            const analysis = action.payload;

            state.fileName = analysis.fileName;
            state.fileType = analysis.fileType;
            state.fileSizeBytes = analysis.fileSizeBytes;

            state.rowCount = analysis.rowCount;
            state.columnCount = analysis.columnCount;

            state.headers = analysis.headers;
            state.previewRows = analysis.previewRows;

            state.missingColumns = analysis.missingColumns;
            state.duplicateColumns = analysis.duplicateColumns;

            state.isValid = analysis.isValid;

            state.phase = analysis.isValid
                ? "ready"
                : "error";

            const problems: string[] = [];

            if (analysis.missingColumns.length > 0) {
                problems.push(
                    `Missing required columns: ${analysis.missingColumns.join(", ")}`
                );
            }

            if (analysis.duplicateColumns.length > 0) {
                problems.push(
                    `Duplicate columns: ${analysis.duplicateColumns.join(", ")}`
                );
            }

            if (analysis.rowCount === 0) {
                problems.push("The CSV contains no data rows.");
            }

            state.error = problems.length > 0
                ? problems.join(" ")
                : null;
        },

        setAnalysisError: (
            state,
            action: PayloadAction<string>
        ) => {
            state.phase = "error";
            state.error = action.payload;
            state.isValid = false;
        },

        startUpload: (state) => {
            state.phase = "uploading";
            state.uploadProgress = 0;
            state.error = null;
            state.resultFileName = null;
            state.processedRowCount = null;
        },
        startProcessing: (state) => {
            state.phase = "processing";
            state.uploadProgress = 100;
            state.error = null;
        },

        setUploadProgress: (
            state,
            action: PayloadAction<number>
        ) => {
            state.uploadProgress = Math.max(
                0,
                Math.min(100, action.payload)
            );
        },

        uploadSuccess: (
            state,
            action: PayloadAction<{
                resultFileName: string;
                processedRowCount: number;
            }>
        ) => {
            state.phase = "success";
            state.uploadProgress = 100;

            state.resultFileName =
                action.payload.resultFileName;

            state.processedRowCount =
                action.payload.processedRowCount;

            state.error = null;
        },

        uploadFailure: (
            state,
            action: PayloadAction<string>
        ) => {
            state.phase = "error";
            state.error = action.payload;
        },

        cancelUpload: (state) => {
            state.phase = state.isValid
                ? "ready"
                : "idle";

            state.uploadProgress = 0;
            state.error = null;
        },

        clearError: (state) => {
            state.error = null;

            if (state.isValid) {
                state.phase = "ready";
            }
        },

        resetUpload: () => ({
            ...initialState,
            headers: [],
            previewRows: [],
            missingColumns: [],
            duplicateColumns: [],
        }),
    },
});

export const {
    selectFile,
    setFileData,
    setAnalysisError,
    startUpload,
    setUploadProgress,
    uploadSuccess,
    uploadFailure,
    startProcessing,
    cancelUpload,
    clearError,
    resetUpload,
} = fileUploadSlice.actions;

export default fileUploadSlice.reducer;