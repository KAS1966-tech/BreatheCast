import {
    createAsyncThunk,
    createSlice,
    type PayloadAction,
} from "@reduxjs/toolkit";

import {
    getHistory,
    clearHistory,
    downloadHistory,
    getFileHistory,
    downloadFileHistory,
    deleteUploadedFile,
} from "../../../api/predictionApi";

import type {
    HistoryState,
    PredictionHistoryResponse,
    FileHistoryResponse,
    DeleteFileResponse,
} from "../../../hooks/types/history.type";
import axios from "axios";


// ============================================================
// Initial State
// ============================================================

const initialState: HistoryState = {

    // Prediction history
    predictionHistory: [],
    predictionTotal: 0,
    predictionSkip: 0,
    predictionLimit: 10,

    predictionLoading: false,
    predictionError: null,

    isDownloadingPredictionHistory: false,
    predictionDownloadError: null,

    isClearingPredictionHistory: false,
    predictionClearError: null,


    // File history
    fileHistory: [],
    fileTotal: 0,
    fileSkip: 0,
    fileLimit: 10,

    fileLoading: false,
    fileError: null,

    isDownloadingFileHistory: false,
    fileDownloadError: null,

    deletingFileId: null,
    fileDeleteError: null,
};


// ============================================================
// Prediction History
// ============================================================

export const fetchPredictionHistory = createAsyncThunk<
    PredictionHistoryResponse, // 1. Fulfilled return type
    { skip?: number; limit?: number }, // 2. Argument input type
    { rejectValue: string } // 3. Reject payload type
>(
    "history/fetchPredictionHistory",
    async (
        { skip = 0, limit = 10 } = {}, // Added '= {}' so you can call it without passing arguments
        { rejectWithValue },
    ) => {
        try {
            return await getHistory(skip, limit);
        } catch (error: unknown) {
            if (axios.isAxiosError(error)) {
                return rejectWithValue(
                    error.response?.data?.detail || "Failed to load prediction history."
                );
            }
            return rejectWithValue("Failed to load prediction history.");
        }
    },
);



export const downloadPredictionHistory = createAsyncThunk(
    "history/downloadPredictionHistory",
    async (_, { rejectWithValue }) => {
        try {
            const blob = await downloadHistory();

            const url = window.URL.createObjectURL(blob);

            const link = document.createElement("a");
            link.href = url;
            link.download = "prediction_history.csv";

            document.body.appendChild(link);
            link.click();

            link.remove();
            window.URL.revokeObjectURL(url);

            return true;
        } catch (error: unknown) {
            if (axios.isAxiosError(error)) {
                return rejectWithValue(
                    error.response?.data?.detail || "Failed to download prediction history."
                );
            }
            return rejectWithValue("Failed to download prediction history.");
        }

    },
);


export const clearPredictionHistory = createAsyncThunk(
    "history/clearPredictionHistory",
    async (_, { rejectWithValue }) => {
        try {
            return await clearHistory();
        } catch (error: unknown) {
            if (axios.isAxiosError(error)) {
                return rejectWithValue(
                    error.response?.data?.detail || "Failed to clear prediction history."
                );
            }
            return rejectWithValue("Failed to clear prediction history.");
        }

    },
);


// ============================================================
// File History
// ============================================================

export const fetchFileHistory = createAsyncThunk(
    "history/fetchFileHistory",
    async (
        {
            skip = 0,
            limit = 10,
        }: {
            skip?: number;
            limit?: number;
        },
        { rejectWithValue },
    ) => {
        try {
            return await getFileHistory(skip, limit);
        } catch (error: unknown) {
            if (axios.isAxiosError(error)) {
                return rejectWithValue(
                    error.response?.data?.detail || "Failed to load file history."
                );
            }
            return rejectWithValue("Failed to load file history.");
        }

    },
);


export const downloadUploadedFileHistory = createAsyncThunk(
    "history/downloadUploadedFileHistory",
    async (_, { rejectWithValue }) => {
        try {
            const blob = await downloadFileHistory();

            const url = window.URL.createObjectURL(blob);

            const link = document.createElement("a");
            link.href = url;
            link.download = "file_upload_history.csv";

            document.body.appendChild(link);
            link.click();

            link.remove();
            window.URL.revokeObjectURL(url);

            return true;
        } catch (error: unknown) {
            if (axios.isAxiosError(error)) {
                return rejectWithValue(
                    error.response?.data?.detail || "Failed to download file history."
                );
            }

            // Default fallback for generic or unexpected errors
            return rejectWithValue("Failed to download file history.");
        }
    },
);


export const deleteFileHistory = createAsyncThunk(
    "history/deleteFileHistory",
    async (
        fileId: number,
        { rejectWithValue },
    ) => {
        try {
            return await deleteUploadedFile(fileId);
        } catch (error: unknown) { // Changed 'any' to 'unknown' for better type safety
            if (axios.isAxiosError(error)) {
                return rejectWithValue(
                    error.response?.data?.detail || "Failed to delete file."
                );
            }

            // Default fallback message for non-network/non-Axios errors
            return rejectWithValue("Failed to delete file.");
        }
    },
);


// ============================================================
// Slice
// ============================================================

const historySlice = createSlice({
    name: "history",
    initialState,

    reducers: {

        resetHistory: () => initialState,

        clearPredictionDownloadError: (state) => {
            state.predictionDownloadError = null;
        },

        clearPredictionError: (state) => {
            state.predictionError = null;
        },

        clearPredictionClearError: (state) => {
            state.predictionClearError = null;
        },

        clearFileError: (state) => {
            state.fileError = null;
        },

        clearFileDownloadError: (state) => {
            state.fileDownloadError = null;
        },

        clearFileDeleteError: (state) => {
            state.fileDeleteError = null;
        },
    },

    extraReducers: (builder) => {

        // ====================================================
        // Prediction History
        // ====================================================

        builder

            .addCase(
                fetchPredictionHistory.pending,
                (state) => {
                    state.predictionLoading = true;
                    state.predictionError = null;
                },
            )

            .addCase(
                fetchPredictionHistory.fulfilled,
                (
                    state,
                    action: PayloadAction<PredictionHistoryResponse>,
                ) => {
                    state.predictionLoading = false;

                    state.predictionHistory =
                        action.payload.history;

                    state.predictionTotal =
                        action.payload.total;

                    state.predictionSkip =
                        action.payload.skip;

                    state.predictionLimit =
                        action.payload.limit;
                },
            )

            .addCase(
                fetchPredictionHistory.rejected,
                (state, action) => {
                    state.predictionLoading = false;

                    state.predictionError =
                        (action.payload as string) ||
                        "Failed to load prediction history.";
                },
            );


        // ====================================================
        // Download Prediction History
        // ====================================================

        builder

            .addCase(
                downloadPredictionHistory.pending,
                (state) => {
                    state.isDownloadingPredictionHistory = true;
                    state.predictionDownloadError = null;
                },
            )

            .addCase(
                downloadPredictionHistory.fulfilled,
                (state) => {
                    state.isDownloadingPredictionHistory = false;
                },
            )

            .addCase(
                downloadPredictionHistory.rejected,
                (state, action) => {
                    state.isDownloadingPredictionHistory = false;

                    state.predictionDownloadError =
                        (action.payload as string) ||
                        "Failed to download prediction history.";
                },
            );


        // ====================================================
        // Clear Prediction History
        // ====================================================

        builder

            .addCase(
                clearPredictionHistory.pending,
                (state) => {
                    state.isClearingPredictionHistory = true;
                    state.predictionClearError = null;
                },
            )

            .addCase(
                clearPredictionHistory.fulfilled,
                (
                    state
                ) => {
                    state.isClearingPredictionHistory = false;

                    state.predictionHistory = [];
                    state.predictionTotal = 0;
                    state.predictionSkip = 0;
                },
            )

            .addCase(
                clearPredictionHistory.rejected,
                (state, action) => {
                    state.isClearingPredictionHistory = false;

                    state.predictionClearError =
                        (action.payload as string) ||
                        "Failed to clear prediction history.";
                },
            );


        // ====================================================
        // File History
        // ====================================================

        builder

            .addCase(
                fetchFileHistory.pending,
                (state) => {
                    state.fileLoading = true;
                    state.fileError = null;
                },
            )

            .addCase(
                fetchFileHistory.fulfilled,
                (
                    state,
                    action: PayloadAction<FileHistoryResponse>,
                ) => {
                    state.fileLoading = false;

                    state.fileHistory =
                        action.payload.files;

                    state.fileTotal =
                        action.payload.total;

                    state.fileSkip =
                        action.payload.skip;

                    state.fileLimit =
                        action.payload.limit;
                },
            )

            .addCase(
                fetchFileHistory.rejected,
                (state, action) => {
                    state.fileLoading = false;

                    state.fileError =
                        (action.payload as string) ||
                        "Failed to load file history.";
                },
            );


        // ====================================================
        // Download File History
        // ====================================================

        builder

            .addCase(
                downloadUploadedFileHistory.pending,
                (state) => {
                    state.isDownloadingFileHistory = true;
                    state.fileDownloadError = null;
                },
            )

            .addCase(
                downloadUploadedFileHistory.fulfilled,
                (state) => {
                    state.isDownloadingFileHistory = false;
                },
            )

            .addCase(
                downloadUploadedFileHistory.rejected,
                (state, action) => {
                    state.isDownloadingFileHistory = false;

                    state.fileDownloadError =
                        (action.payload as string) ||
                        "Failed to download file history.";
                },
            );


        // ====================================================
        // Delete File
        // ====================================================

        builder

            .addCase(
                deleteFileHistory.pending,
                (state, action) => {
                    state.deletingFileId = action.meta.arg;
                    state.fileDeleteError = null;
                },
            )

            .addCase(
                deleteFileHistory.fulfilled,
                (
                    state,
                    action: PayloadAction<DeleteFileResponse>,
                ) => {
                    state.deletingFileId = null;

                    state.fileHistory =
                        state.fileHistory.filter(
                            (file) =>
                                file.id !==
                                action.payload.deleted_file_id,
                        );

                    state.fileTotal = Math.max(
                        0,
                        state.fileTotal - 1,
                    );
                },
            )

            .addCase(
                deleteFileHistory.rejected,
                (state, action) => {
                    state.deletingFileId = null;

                    state.fileDeleteError =
                        action.payload as string ??
                        "Failed to delete file.";
                },
            );
    },
});


export const {
    resetHistory,
    clearPredictionDownloadError,
    clearPredictionError,
    clearPredictionClearError,
    clearFileError,
    clearFileDownloadError,
    clearFileDeleteError,
} = historySlice.actions;


export default historySlice.reducer;