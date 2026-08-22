import axios, { type AxiosProgressEvent } from "axios";
import type { LoginRequest, LoginResponse, SignupRequest, SignupResponse, User, VerifyOTPRequest, VerifySignupOTPResponse } from "../hooks/types/auth.type";
import type { MetricsResponse } from "../hooks/types/metrics.type";
import type { ProfileResponse } from "../hooks/types/profile.type";
import type { PredictionHistoryResponse } from "../hooks/types/history.type";
import type { DeleteFileResponse, FileHistoryResponse } from "../hooks/types/fileUpload.type";
import type { AQIPredictionPayload, AQIPredictionResponse } from "../hooks/types/aqiPrediction.type";


const API_URL = import.meta.env.VITE_BACKEND_API || "";

if (!import.meta.env.VITE_BACKEND_API) {
    throw new Error("VITE_BACKEND_API missing");
}

const API = axios.create({
    baseURL: `${API_URL}/api/v1`,
    timeout: 120_000,
    withCredentials: true,
});

const RefreshAPI = axios.create({
    baseURL: `${API_URL}/api/v1`,
    withCredentials: true,
});

// --------------------
// API FUNCTIONS
// --------------------

export const refreshToken = (): Promise<void> => RefreshAPI.post("/refresh");

let refreshPromise: Promise<void> | null = null;

const handleRefresh = () => {
    if (!refreshPromise) {
        refreshPromise = refreshToken().finally(() => {
            refreshPromise = null;
        });
    }

    return refreshPromise;
};

API.interceptors.response.use(
    response => response,

    async error => {
        const originalRequest = error.config;

        if (
            error.response?.status !== 401 ||
            originalRequest._retry
        ) {
            return Promise.reject(error);
        }

        if (
            [
                "/login",
                "/signup",
                "/auth/google",
                "/auth/verify-signup-otp",
                "/refresh",
                "/health",
            ].includes(
                originalRequest.url
            )
        ) {
            return Promise.reject(error);
        }

        originalRequest._retry = true;

        try {
            await handleRefresh();
            return API(originalRequest);
        } catch {
            return Promise.reject(error);
        }
    }
);

export const waitForBackend = async (interval = 1000): Promise<void> => {
    while (true) {
        try {
            await API.get("/health");
            return;
        } catch {
            await new Promise((resolve) => setTimeout(resolve, interval));
        }
    }
};

export const signup = async (
    payload: SignupRequest,
): Promise<SignupResponse> => {
    const { data } = await API.post<SignupResponse>(
        "/signup",
        payload,
    );

    return data;
};
export const verifySignupOTP = async (
    payload: VerifyOTPRequest,
): Promise<VerifySignupOTPResponse> => {
    const { data } = await API.post<VerifySignupOTPResponse>(
        "/auth/verify-signup-otp",
        payload,
    );

    return data;
};

export const login = async (payload: LoginRequest): Promise<LoginResponse> => {
    const { data } = await API.post<LoginResponse>("/login", payload);

    return data;
};

export const googleLogin = async (
    credential: string,
): Promise<LoginResponse> => {
    const { data } = await API.post<LoginResponse>(
        "/auth/google",
        {
            credential,
        },
    );

    return data;
};

export const currentUser = async (): Promise<User> => {
    const { data } = await API.get("/me");
    return data;
};

export const logout = async () => {
    await API.post("/logout");
};

// --------------------
// USER
// --------------------

export const deleteAccount = async (): Promise<void> => {
    await API.delete("/me");
};


// --------------------
// HISTORY
// --------------------

export const getHistory = async (
    skip = 0,
    limit = 10,
): Promise<PredictionHistoryResponse> => {
    const { data } = await API.get<PredictionHistoryResponse>("/history", {
        params: {
            skip,
            limit,
        },
    });

    return data;
};


export const clearHistory = async () => {
    const { data } = await API.delete("/history");

    return data;
};


// --------------------
// PROFILE
// --------------------

export const getProfile = async (): Promise<ProfileResponse> => {
    const { data } = await API.get<ProfileResponse>("/profile");

    return data;
};

export const updateName = async (fullname: string) => {
    const { data } = await API.patch("/profile/name", {
        fullname,
    });

    return data;
};


export const updateUsername = async (username: string) => {
    const { data } = await API.patch("/profile/username", {
        username,
    });

    return data;
};

// --------------------
// USER / SECURITY
// --------------------

export const setPassword = async (
    password: string,
): Promise<void> => {
    await API.post("/password/set", {
        password,
    });
};


export const changePassword = async (
    currentPassword: string,
    newPassword: string,
): Promise<void> => {
    await API.post("/password/change", {
        current_password: currentPassword,
        new_password: newPassword,
    });
};


// --------------------
// HISTORY DOWNLOAD
// --------------------

export const downloadHistory = async (): Promise<Blob> => {
    const { data } = await API.get<Blob>("/history/download", {
        responseType: "blob",
    });

    return data;
};

export const metrics = async (): Promise<MetricsResponse> => {
    const { data } = await API.get("/metrics");
    return data;
}

export const predictAQI = async (
    payload: AQIPredictionPayload,
): Promise<AQIPredictionResponse> => {
    const { data } = await API.post<AQIPredictionResponse>("/predict", payload);
    return data;
};


// --------------------
// FILE UPLOAD
// --------------------

export const uploadFile = async (
    file: File,
    onUploadProgress?: (progressEvent: AxiosProgressEvent) => void,
    signal?: AbortSignal,
): Promise<Blob> => {
    const formData = new FormData();

    formData.append("dataFile", file);

    const { data } = await API.post<Blob>("/fileupload", formData, {
        responseType: "blob",
        onUploadProgress,
        signal,
    });

    return data;
};

// --------------------
// FILE HISTORY
// --------------------

export const getFileHistory = async (
    skip = 0,
    limit = 10,
): Promise<FileHistoryResponse> => {
    const { data } = await API.get<FileHistoryResponse>("/filehistory", {
        params: {
            skip,
            limit,
        },
    });
    return data;
};


// --------------------
// DELETE FILE
// --------------------

export const deleteUploadedFile = async (
    fileId: number,
): Promise<DeleteFileResponse> => {
    const { data } = await API.delete<DeleteFileResponse>(
        `/filehistory/${fileId}`,
    );

    return data;
};

export const downloadFileHistory = async (): Promise<Blob> => {
    const { data } = await API.get<Blob>(
        "/files/download",
        {
            responseType: "blob",
        },
    );

    return data;
};


export default API;