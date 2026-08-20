import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./features/auth/authSlice";
import themeReducer from './features/theme/themeSlice';
import AQIReducer from './features/prediction/aqiSlice';


export const store = configureStore({
    reducer:{
        "auth":authReducer,
        "theme": themeReducer,
        "aqi": AQIReducer
    }
});

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch;