import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

import {
    signup as signupApi,
    login as loginApi,
    googleLogin as googleLoginApi,
    currentUser as currentUserApi,
    logout as logoutApi,
    verifySignupOTP as verifySignupOtpApi,
} from "../../../api/predictionApi";

import type {
    SignupRequest,
    SignupResponse,
    LoginRequest,
    LoginResponse,
    User,
    AuthState,
} from "../../../hooks/types/auth.type";
import { isAxiosError } from "axios";

// ============================================================
// Initial State
// ============================================================

const initialState: AuthState = {
    user: null,
    isAuthenticated: false,

    loading: false,
    loginLoading: false,
    signupLoading: false,

    error: null,
    loginError: null,
    signupError: null,
};


// ============================================================
// Helpers
// ============================================================

const getErrorMessage = (error: unknown): string => {
    if(isAxiosError(error)){
        return (
        error?.response?.data?.detail ||
        error?.message ||
        "Something went wrong. Please try again."
    );
    }
    return (
        "Something went wrong. Please try again."
    );
};


// ============================================================
// Signup
// ============================================================

export const signup = createAsyncThunk<
    SignupResponse,
    SignupRequest,
    { rejectValue: string }
>(
    "auth/signup",
    async (payload, { rejectWithValue }) => {
        try {
            return await signupApi(payload);
        } catch (error : unknown) {
            return rejectWithValue(getErrorMessage(error));
        }
    }
);


// ============================================================
// Verify Signup OTP
// ============================================================

export interface VerifySignupOTPRequest {
    email: string;
    otp: string;
}

export interface VerifySignupOTPResponse {
    status: string;
    message: string;
    user: User;
}

export const verifySignupOtp = createAsyncThunk<
    VerifySignupOTPResponse,
    VerifySignupOTPRequest,
    { rejectValue: string }
>(
    "auth/verifySignupOtp",
    async (payload, { rejectWithValue }) => {
        try {
            return await verifySignupOtpApi(payload);
        } catch (error: unknown) {
            return rejectWithValue(getErrorMessage(error));
        }
    }
);


// ============================================================
// Login
// ============================================================

export const login = createAsyncThunk<
    LoginResponse,
    LoginRequest,
    { rejectValue: string }
>(
    "auth/login",
    async (payload, { rejectWithValue }) => {
        try {
            return await loginApi(payload);
        } catch (error: unknown) {
            return rejectWithValue(getErrorMessage(error));
        }
    }
);


// ============================================================
// Google Login
// ============================================================

export const googleLogin = createAsyncThunk<
    LoginResponse,
    string,
    { rejectValue: string }
>(
    "auth/googleLogin",
    async (credential, { rejectWithValue }) => {
        try {
            return await googleLoginApi(credential);
        } catch (error: unknown) {
            return rejectWithValue(getErrorMessage(error));
        }
    }
);


// ============================================================
// Restore Current User
// ============================================================

export const fetchCurrentUser = createAsyncThunk<
    User,
    void,
    { rejectValue: string }
>(
    "auth/fetchCurrentUser",
    async (_, { rejectWithValue }) => {
        try {
            return await currentUserApi();
        } catch (error: unknown) {
            return rejectWithValue(getErrorMessage(error));
        }
    }
);


// ============================================================
// Logout
// ============================================================

export const logout = createAsyncThunk<
    void,
    void,
    { rejectValue: string }
>(
    "auth/logout",
    async (_, { rejectWithValue }) => {
        try {
            await logoutApi();
        } catch (error: unknown) {
            return rejectWithValue(getErrorMessage(error));
        }
    }
);


// ============================================================
// Slice
// ============================================================

const authSlice = createSlice({
    name: "auth",

    initialState,

    reducers: {
        clearAuthError: (state) => {
            state.error = null;
            state.loginError = null;
            state.signupError = null;
        },

        clearLoginError: (state) => {
            state.loginError = null;
        },

        clearSignupError: (state) => {
            state.signupError = null;
        },

        clearUser: (state) => {
            state.user = null;
            state.isAuthenticated = false;
        },
    },

    extraReducers: (builder) => {

        // ====================================================
        // SIGNUP
        // ====================================================

        builder
            .addCase(signup.pending, (state) => {
                state.signupLoading = true;
                state.signupError = null;
            })

            .addCase(signup.fulfilled, (state) => {
                state.signupLoading = false;

                // Account is NOT authenticated yet.
                // OTP verification is still required.
                state.signupError = null;
            })

            .addCase(signup.rejected, (state, action) => {
                state.signupLoading = false;
                state.signupError =
                    action.payload || "Unable to start signup.";
            });


        // ====================================================
        // VERIFY SIGNUP OTP
        // ====================================================

        builder
            .addCase(verifySignupOtp.pending, (state) => {
                state.signupLoading = true;
                state.signupError = null;
            })

            .addCase(verifySignupOtp.fulfilled, (state, action) => {
                state.signupLoading = false;

                state.user = action.payload.user;
                state.isAuthenticated = true;

                state.signupError = null;
            })

            .addCase(verifySignupOtp.rejected, (state, action) => {
                state.signupLoading = false;
                state.signupError =
                    action.payload || "Invalid verification code.";
            });


        // ====================================================
        // LOGIN
        // ====================================================

        builder
            .addCase(login.pending, (state) => {
                state.loginLoading = true;
                state.loginError = null;
            })

            .addCase(login.fulfilled, (state, action) => {
                state.loginLoading = false;

                state.user = action.payload.user;
                state.isAuthenticated = true;

                state.loginError = null;
            })

            .addCase(login.rejected, (state, action) => {
                state.loginLoading = false;
                state.loginError =
                    action.payload || "Unable to login.";
            });


        // ====================================================
        // GOOGLE LOGIN
        // ====================================================

        builder
            .addCase(googleLogin.pending, (state) => {
                state.loading = true;
                state.error = null;
            })

            .addCase(googleLogin.fulfilled, (state, action) => {
                state.loading = false;

                state.user = action.payload.user;
                state.isAuthenticated = true;

                state.error = null;
            })

            .addCase(googleLogin.rejected, (state, action) => {
                state.loading = false;
                state.error =
                    action.payload || "Google login failed.";
            });


        // ====================================================
        // CURRENT USER
        // ====================================================

        builder
            .addCase(fetchCurrentUser.pending, (state) => {
                state.loading = true;
                state.error = null;
            })

            .addCase(fetchCurrentUser.fulfilled, (state, action) => {
                state.loading = false;

                state.user = action.payload;
                state.isAuthenticated = true;

                state.error = null;
            })

            .addCase(fetchCurrentUser.rejected, (state) => {
                state.loading = false;

                state.user = null;
                state.isAuthenticated = false;

                state.error = null;
            });


        // ====================================================
        // LOGOUT
        // ====================================================

        builder
            .addCase(logout.pending, (state) => {
                state.loading = true;
            })

            .addCase(logout.fulfilled, (state) => {
                state.loading = false;

                state.user = null;
                state.isAuthenticated = false;

                state.error = null;
                state.loginError = null;
                state.signupError = null;
            })

            .addCase(logout.rejected, (state) => {
                // Even if the server logout request fails,
                // remove the user from the frontend state.
                state.loading = false;

                state.user = null;
                state.isAuthenticated = false;

                state.error = null;
                state.loginError = null;
                state.signupError = null;
            });
    },
});


export const {
    clearAuthError,
    clearLoginError,
    clearSignupError,
    clearUser,
} = authSlice.actions;


export default authSlice.reducer;