import type { User } from "./auth.type";
import type { PredictionHistory } from "./history.type";


// ============================================================
// Profile User
// ============================================================

export interface ProfileUser extends User {
    has_password: boolean;
}


// ============================================================
// Uploaded File
// ============================================================

export interface ProfileFile {
    id: number;
    original_name: string;
    file_size: number;
    file_type: string;
    row_count: number;
    prediction_count: number;
    created_at: string;
}


// ============================================================
// Profile Response
// ============================================================

export interface ProfileResponse {
    user: ProfileUser;

    history: {
        total: number;
        items: PredictionHistory[];
    };

    files: {
        total: number;
        items: ProfileFile[];
    };
}


// ============================================================
// Profile State
// ============================================================

export interface ProfileState {
    profile: ProfileResponse | null;

    loading: boolean;
    error: string | null;

    updatingName: boolean;
    updatingUsername: boolean;
    settingPassword: boolean;
    changingPassword: boolean;
    deletingAccount: boolean;

    updateError: string | null;
}


// ============================================================
// Updated User Response
// ============================================================

export interface UpdatedUserResponse {
    status: string;
    message: string;

    user: {
        id: number;
        fullname: string;
        username: string;
        email: string;
        created_at: string;
    };
}


// ============================================================
// Password Responses
// ============================================================

export interface SetPasswordResponse {
    status: string;
    message: string;
}


export interface ChangePasswordResponse {
    status: string;
    message: string;
}