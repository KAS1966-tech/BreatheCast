export interface InputState {
    Temperature_C: number;
    Humidity_pct: number;
    WindSpeed_kmh: number;
    WindDirection_deg: number;
    Pressure_hPa: number;
    SolarRadiation_Wm2: number;
    Rainfall_mm: number;
    TrafficDensityIndex: number;
    ProximityIndustrialZone_km: number;

    DayOfWeek: number;
    Month: number;
}

export interface ResultState {
    prediction: number;
}

export interface AQIState {
    inputState: InputState;
    result: ResultState | null;
    error: string | null;
    loading: boolean;
}