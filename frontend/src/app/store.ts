import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./features/auth/authSlice";
import themeReducer from './features/theme/themeSlice';
import AQIReducer from './features/prediction/aqiSlice';
import fileUploadReducer from './features/upload/fileUploadSlice';
import historyReducer from './features/history/historySlice';

export const store = configureStore({
    reducer:{
        "auth":authReducer,
        "theme": themeReducer,
        "aqi": AQIReducer,
        "file": fileUploadReducer,
        "history": historyReducer,
    }
});

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch;