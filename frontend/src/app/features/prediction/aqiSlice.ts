import {
    createAsyncThunk,
    createSlice,
    type PayloadAction,
} from "@reduxjs/toolkit";

import type {
    InputState,
    ResultState,
    AQIState,
} from "../../../hooks/types/aqiSchema.type";
import { predictAQI as predictAQIApi } from "../../../api/predictionApi";
import axios from "axios";


// ============================================================
// Initial State
// ============================================================

const initialInputState: InputState = {
    Temperature_C: 20,
    Humidity_pct: 50,
    WindSpeed_kmh: 10,
    WindDirection_deg: 180,
    Pressure_hPa: 1013,
    SolarRadiation_Wm2: 200,
    Rainfall_mm: 0,
    TrafficDensityIndex: 50,
    ProximityIndustrialZone_km: 5,

    DayOfWeek: 0,
    Month: 1,
};


const initialState: AQIState = {
    inputState: initialInputState,
    result: null,
    error: null,
    loading: false,
};


// ============================================================
// Prediction
// ============================================================

export const predictAQI = createAsyncThunk<
    ResultState,
    InputState,
    { rejectValue: string }
>(
    "aqi/predict",
    async (payload, { rejectWithValue }) => {
        try {
            const response = await predictAQIApi(payload);

            return response;
        } catch (error: unknown) {
            // 1. Check if it is an Axios error
            if (axios.isAxiosError(error)) {
                return rejectWithValue(
                    error.response?.data?.detail ||
                    error.message ||
                    "Unable to generate prediction."
                );
            }

            // 2. Handle generic system/JS errors safely
            if (error instanceof Error) {
                return rejectWithValue(error.message);
            }

            // 3. Fallback for completely unknown errors
            return rejectWithValue("Unable to generate prediction.");
        }
    }
);


// ============================================================
// Slice
// ============================================================

const aqiSlice = createSlice({
    name: "aqi",

    initialState,

    reducers: {
        // ----------------------------------------------------
        // Replace complete input state
        // ----------------------------------------------------

        setInputState: (
            state,
            action: PayloadAction<InputState>,
        ) => {
            state.inputState = action.payload;
            state.result = null;
            state.error = null;
        },


        // ----------------------------------------------------
        // Update individual field
        // ----------------------------------------------------

        updateInputField: <K extends keyof InputState>(
            state: AQIState,
            action: PayloadAction<{
                field: K;
                value: InputState[K];
            }>,
        ) => {
            state.inputState[action.payload.field] =
                action.payload.value;

            state.result = null;
            state.error = null;
        },


        // ----------------------------------------------------
        // Set prediction result manually
        // ----------------------------------------------------

        setResultState: (
            state,
            action: PayloadAction<ResultState>,
        ) => {
            state.result = action.payload;
            state.loading = false;
            state.error = null;
        },


        // ----------------------------------------------------
        // Set error manually
        // ----------------------------------------------------

        setError: (
            state,
            action: PayloadAction<string>,
        ) => {
            state.loading = false;
            state.result = null;
            state.error = action.payload;
        },


        // ----------------------------------------------------
        // Reset prediction state
        // ----------------------------------------------------

        resetState: (state) => {
            state.inputState = {
                ...initialInputState,
            };

            state.result = null;
            state.loading = false;
            state.error = null;
        },
    },


    // ========================================================
    // Async Prediction
    // ========================================================

    extraReducers: (builder) => {
        builder

            .addCase(predictAQI.pending, (state) => {
                state.loading = true;
                state.error = null;
                state.result = null;
            })

            .addCase(predictAQI.fulfilled, (state, action) => {
                state.loading = false;
                state.result = action.payload;
                state.error = null;
            })

            .addCase(predictAQI.rejected, (state, action) => {
                state.loading = false;
                state.result = null;

                state.error =
                    action.payload ||
                    "Unable to generate prediction.";
            });
    },
});


export const {
    setInputState,
    setResultState,
    updateInputField,
    setError,
    resetState,
} = aqiSlice.actions;


export default aqiSlice.reducer;