// ============================================================
// Metrics Response
// ============================================================

export interface MetricsResponse {
    mae: number;
    mse: number;
    rmse: number;
    r2: number;
}


// ============================================================
// Metric Item
// ============================================================

export interface MetricItem {
    label: string;
    value: number;
    unit: "score" | "ratio";
    description: string;
}


// ============================================================
// Metrics State
// ============================================================

export interface MetricsState {
    status: "idle" | "loading" | "success" | "error";

    data: MetricItem[];

    error: string | null;
}