export interface AQIHistory {
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


export interface HistoryResponse {
    total: number;
    skip: number;
    limit: number;
    history: AQIHistory[];
}


export interface ClearHistoryResponse {
    status: string;
    message: string;
    deleted_count: number;
}


export interface HistoryState {
    history: AQIHistory[];

    total: number;
    skip: number;
    limit: number;

    loading: boolean;
    error: string | null;

    isDownloading: boolean;
    downloadError: string | null;

    isClearing: boolean;
    clearErrorMessage: string | null;
}