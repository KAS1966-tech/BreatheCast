import type { FieldConfig } from "../types/field.type";

export const schema: FieldConfig[] = [
    {
        type: "number",
        name: "Temperature_C",
        label: "Temperature (°C)",
        min: -7,
        max: 40,
        step: 0.01,
    },

    {
        type: "number",
        name: "Humidity_pct",
        label: "Humidity (%)",
        min: 25,
        max: 100,
        step: 0.01,
    },

    {
        type: "number",
        name: "WindSpeed_kmh",
        label: "Wind Speed (km/h)",
        min: 0.03,
        max: 54.33,
        step: 0.01,
    },

    {
        type: "number",
        name: "WindDirection_deg",
        label: "Wind Direction (°)",
        min: 0,
        max: 360,
        step: 0.01,
    },

    {
        type: "number",
        name: "Pressure_hPa",
        label: "Atmospheric Pressure (hPa)",
        min: 985,
        max: 1040,
        step: 0.01,
    },

    {
        type: "number",
        name: "SolarRadiation_Wm2",
        label: "Solar Radiation (W/m²)",
        min: 0,
        max: 793.5,
        step: 0.01,
    },

    {
        type: "number",
        name: "Rainfall_mm",
        label: "Rainfall (mm)",
        min: 0,
        max: 54.34,
        step: 0.01,
    },

    {
        type: "number",
        name: "TrafficDensityIndex",
        label: "Traffic Density Index",
        min: 0,
        max: 96.72,
        step: 0.01,
    },

    {
        type: "number",
        name: "ProximityIndustrialZone_km",
        label: "Distance from Industrial Zone (km)",
        min: 0.2,
        max: 20,
        step: 0.01,
    },

    {
        type: "select",
        name: "DayOfWeek",
        label: "Day of Week",
        options: [
            "Monday",
            "Tuesday",
            "Wednesday",
            "Thursday",
            "Friday",
            "Saturday",
            "Sunday",
        ],
    },

    {
        type: "select",
        name: "Month",
        label: "Month",
        options: [
            "January",
            "February",
            "March",
            "April",
            "May",
            "June",
            "July",
            "August",
            "September",
            "October",
            "November",
            "December",
        ],
    },
];