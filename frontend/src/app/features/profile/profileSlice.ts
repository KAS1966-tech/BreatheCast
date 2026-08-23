import {
    createAsyncThunk,
    createSlice,
} from "@reduxjs/toolkit";

import axios from "axios";

import {
    getProfile,
    updateName,
    updateUsername,
    setPassword,
    changePassword,
    deleteAccount,
} from "../../../api/predictionApi";

import type {
    ProfileResponse,
    ProfileState,
    UpdatedUserResponse,
    SetPasswordResponse,
} from "../../../hooks/types/profile.type";


// ============================================================
// Initial State
// ============================================================

const initialState: ProfileState = {
    profile: null,

    loading: false,
    error: null,

    updatingName: false,
    updatingUsername: false,

    settingPassword: false,

    deletingAccount: false,

    updateError: null,

    changingPassword: false
};


// ============================================================
// Error Helper
// ============================================================

const getErrorMessage = (
    error: unknown,
    fallback: string,
): string => {
    if (axios.isAxiosError(error)) {
        return (
            error.response?.data?.detail ||
            fallback
        );
    }

    return fallback;
};


// ============================================================
// Fetch Profile
// ============================================================

export const fetchProfile = createAsyncThunk<
    ProfileResponse,
    void,
    { rejectValue: string }
>(
    "profile/fetchProfile",
    async (_, { rejectWithValue }) => {
        try {
            return await getProfile();
        } catch (error: unknown) {
            return rejectWithValue(
                getErrorMessage(
                    error,
                    "Failed to load profile.",
                ),
            );
        }
    },
);


// ============================================================
// Update Name
// ============================================================

export const updateProfileName = createAsyncThunk<
    UpdatedUserResponse,
    string,
    { rejectValue: string }
>(
    "profile/updateName",
    async (fullname, { rejectWithValue }) => {
        try {
            return await updateName(fullname);
        } catch (error: unknown) {
            return rejectWithValue(
                getErrorMessage(
                    error,
                    "Failed to update name.",
                ),
            );
        }
    },
);


// ============================================================
// Update Username
// ============================================================

export const updateProfileUsername = createAsyncThunk<
    UpdatedUserResponse,
    string,
    { rejectValue: string }
>(
    "profile/updateUsername",
    async (username, { rejectWithValue }) => {
        try {
            return await updateUsername(username);
        } catch (error: unknown) {
            return rejectWithValue(
                getErrorMessage(
                    error,
                    "Failed to update username.",
                ),
            );
        }
    },
);


// ============================================================
// Set Password
// ============================================================

export const setProfilePassword = createAsyncThunk<
    SetPasswordResponse,
    string,
    { rejectValue: string }
>(
    "profile/setPassword",
    async (password, { rejectWithValue }) => {
        try {
            return await setPassword(password);
        } catch (error: unknown) {
            return rejectWithValue(
                getErrorMessage(
                    error,
                    "Failed to set password.",
                ),
            );
        }
    },
);


// ============================================================
// Change Password
// ============================================================

export const changeProfilePassword = createAsyncThunk<
    SetPasswordResponse,
    {
        currentPassword: string;
        newPassword: string;
    },
    { rejectValue: string }
>(
    "profile/changePassword",
    async (
        {
            currentPassword,
            newPassword,
        },
        { rejectWithValue },
    ) => {
        try {
            return await changePassword(
                currentPassword,
                newPassword,
            );
        } catch (error: unknown) {
            return rejectWithValue(
                getErrorMessage(
                    error,
                    "Failed to change password.",
                ),
            );
        }
    },
);


// ============================================================
// Delete Account
// ============================================================

export const deleteProfileAccount = createAsyncThunk<
    { message: string },
    void,
    { rejectValue: string }
>(
    "profile/deleteAccount",
    async (_, { rejectWithValue }) => {
        try {
            return await deleteAccount();
        } catch (error: unknown) {
            return rejectWithValue(
                getErrorMessage(
                    error,
                    "Failed to delete account.",
                ),
            );
        }
    },
);


// ============================================================
// Slice
// ============================================================

const profileSlice = createSlice({
    name: "profile",
    initialState,

    reducers: {
        clearProfileError: (state) => {
            state.error = null;
        },

        clearProfileUpdateError: (state) => {
            state.updateError = null;
        },

        resetProfile: () => initialState,
    },

    extraReducers: (builder) => {

        // ====================================================
        // Fetch Profile
        // ====================================================

        builder
            .addCase(
                fetchProfile.pending,
                (state) => {
                    state.loading = true;
                    state.error = null;
                },
            )

            .addCase(
                fetchProfile.fulfilled,
                (state, action) => {
                    state.loading = false;
                    state.profile = action.payload;
                },
            )

            .addCase(
                fetchProfile.rejected,
                (state, action) => {
                    state.loading = false;

                    state.error =
                        action.payload ||
                        "Failed to load profile.";
                },
            );


        // ====================================================
        // Update Name
        // ====================================================

        builder
            .addCase(
                updateProfileName.pending,
                (state) => {
                    state.updatingName = true;
                    state.updateError = null;
                },
            )

            .addCase(
                updateProfileName.fulfilled,
                (state, action) => {
                    state.updatingName = false;

                    if (state.profile) {
                        state.profile.user = {
                            ...state.profile.user,
                            ...action.payload.user,
                        };
                    }
                },
            )

            .addCase(
                updateProfileName.rejected,
                (state, action) => {
                    state.updatingName = false;

                    state.updateError =
                        action.payload ||
                        "Failed to update name.";
                },
            );


        // ====================================================
        // Update Username
        // ====================================================

        builder
            .addCase(
                updateProfileUsername.pending,
                (state) => {
                    state.updatingUsername = true;
                    state.updateError = null;
                },
            )

            .addCase(
                updateProfileUsername.fulfilled,
                (state, action) => {
                    state.updatingUsername = false;

                    if (state.profile) {
                        state.profile.user = {
                            ...state.profile.user,
                            ...action.payload.user,
                        };
                    }
                },
            )

            .addCase(
                updateProfileUsername.rejected,
                (state, action) => {
                    state.updatingUsername = false;

                    state.updateError =
                        action.payload ||
                        "Failed to update username.";
                },
            );


        // ====================================================
        // Set Password
        // ====================================================

        builder
            .addCase(
                setProfilePassword.pending,
                (state) => {
                    state.settingPassword = true;
                    state.updateError = null;
                },
            )

            .addCase(
                setProfilePassword.fulfilled,
                (state) => {
                    state.settingPassword = false;

                    if (state.profile) {
                        state.profile.user.has_password = true;
                    }
                },
            )

            .addCase(
                setProfilePassword.rejected,
                (state, action) => {
                    state.settingPassword = false;

                    state.updateError =
                        action.payload as string ||
                        "Failed to set password.";
                },
            );


        // ====================================================
        // Change Password
        // ====================================================

        builder
            .addCase(
                changeProfilePassword.pending,
                (state) => {
                    state.changingPassword = true;
                    state.updateError = null;
                },
            )

            .addCase(
                changeProfilePassword.fulfilled,
                (state) => {
                    state.changingPassword = false;
                },
            )

            .addCase(
                changeProfilePassword.rejected,
                (state, action) => {
                    state.changingPassword = false;

                    state.updateError =
                        action.payload as string ||
                        "Failed to change password.";
                },
            );


        // ====================================================
        // Delete Account
        // ====================================================

        builder
            .addCase(
                deleteProfileAccount.pending,
                (state) => {
                    state.deletingAccount = true;
                    state.updateError = null;
                },
            )

            .addCase(
                deleteProfileAccount.fulfilled,
                (state) => {
                    state.deletingAccount = false;
                    state.profile = null;
                },
            )

            .addCase(
                deleteProfileAccount.rejected,
                (state, action) => {
                    state.deletingAccount = false;

                    state.updateError =
                        action.payload as string ||
                        "Failed to delete account.";
                },
            );
    },
});


export const {
    clearProfileError,
    clearProfileUpdateError,
    resetProfile,
} = profileSlice.actions;


export default profileSlice.reducer;