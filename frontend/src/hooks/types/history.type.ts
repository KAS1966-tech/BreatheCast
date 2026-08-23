// ============================================================
// Prediction History
// ============================================================

export interface PredictionHistory {
    id: number;

    temperature_c: number;
    humidity_pct: number;
    wind_speed_kmh: number;
    wind_direction_deg: number;
    pressure_hpa: number;
    solar_radiation_wm2: number;
    rainfall_mm: number;
    traffic_density_index: number;
    proximity_industrial_zone_km: number;

    day_of_week: number;
    month: number;
    is_weekend: number;

    prediction: number;

    created_at: string;
}


// ============================================================
// Prediction History Response
// ============================================================

export interface PredictionHistoryResponse {
    total: number;
    skip: number;
    limit: number;
    history: PredictionHistory[];
}


// ============================================================
// Clear Prediction History
// ============================================================

export interface ClearHistoryResponse {
    status: string;
    message: string;
    deleted_count: number;
}


// ============================================================
// Uploaded File History
// ============================================================

export interface UploadedFile {
    id: number;
    original_name: string;
    file_size: number;
    file_type: string;
    row_count: number;
    prediction_count: number;
    created_at: string;
}


// ============================================================
// Uploaded File History Response
// ============================================================

export interface FileHistoryResponse {
    total: number;
    skip: number;
    limit: number;
    files: UploadedFile[];
}


// ============================================================
// Delete Uploaded File
// ============================================================

export interface DeleteFileResponse {
    status: string;
    message: string;
    deleted_file_id: number;
}


// ============================================================
// History State
// ============================================================

export interface HistoryState {

    // --------------------------------------------------------
    // Prediction History
    // --------------------------------------------------------

    predictionHistory: PredictionHistory[];
    predictionTotal: number;
    predictionSkip: number;
    predictionLimit: number;

    predictionLoading: boolean;
    predictionError: string | null;

    isDownloadingPredictionHistory: boolean;
    predictionDownloadError: string | null;

    isClearingPredictionHistory: boolean;
    predictionClearError: string | null;


    // --------------------------------------------------------
    // File History
    // --------------------------------------------------------

    fileHistory: UploadedFile[];
    fileTotal: number;
    fileSkip: number;
    fileLimit: number;

    fileLoading: boolean;
    fileError: string | null;

    isDownloadingFileHistory: boolean;
    fileDownloadError: string | null;

    deletingFileId: number | null;
    fileDeleteError: string | null;

    isDeletingAllHistory: boolean;
    deleteAllHistoryError: string | null;

    isClearingFileHistory: boolean;
    fileClearError: string | null;
}

export interface DeleteAllHistoryResponse {
    status: string;
    message: string;
    prediction_deleted: number;
    files_deleted: number;
    total_deleted: number;
}

export interface ClearFileHistoryResponse {
    status: string;
    message: string;
    deleted_count: number;
}