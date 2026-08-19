import type { LucideIcon } from "lucide-react";

import type { InputState } from "./aqiSchema.type";


// --------------------
// AQI PREDICTION
// --------------------

export interface AQIPredictionPayload {
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

export interface AQIPredictionResponse {
    prediction: number;
}


// --------------------
// FORM FIELD GROUPS
// --------------------

export interface FieldGroup {
    id: string;
    title: string;
    description: string;
    icon: LucideIcon;
    fields: (keyof InputState)[];
}