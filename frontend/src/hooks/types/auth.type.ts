// --------------------
// API REQUEST TYPES
// --------------------

export type Stage = "form" | "otp";

export interface FormValues {
    fullName: string;
    username: string;
    email: string;
    password: string;
    confirmPassword: string;
}

export interface FormErrors {
    fullName?: string;
    username?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
}

export interface SignupRequest {
    fullname: string;
    username: string;
    email: string;
    password: string;
}

export interface LoginRequest {
    email: string;
    password: string;
}

export interface GoogleLoginRequest {
    credential: string;
}

export interface SendOTPRequest {
    email: string;
}

export interface VerifyOTPRequest {
    email: string;
    otp: string;
}


// --------------------
// USER
// --------------------

export interface User {
    id: number;
    fullname: string;
    username: string;
    email: string;
    created_at: string;
}


// --------------------
// API RESPONSE TYPES
// --------------------

export interface SignupResponse {
    status: string;
    message: string;
}

export interface VerifySignupOTPResponse {
    status: string;
    message: string;
    user: User;
}

export interface LoginResponse {
    status: string;
    user: User;
}

export interface GoogleLoginResponse {
    status: string;
    user: User;
}


// --------------------
// AUTH STATE
// --------------------

export interface AuthState {
    user: User | null;
    isAuthenticated: boolean;

    loginLoading: boolean;
    signupLoading: boolean;
    loading: boolean;

    error: string | null;
    loginError: string | null;
    signupError: string | null;
}


// --------------------
// LOGIN FORM
// --------------------

export interface LoginFormValues {
    email: string;
    password: string;
}

export interface LoginFormErrors {
    email?: string;
    password?: string;
}


// --------------------
// SIGNUP FORM
// --------------------

export interface SignupFormValues {
    fullname: string;
    username: string;
    email: string;
    password: string;
    confirmPassword: string;
    acceptTerms: boolean;
}

export interface SignupFormErrors {
    fullname?: string;
    username?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
    acceptTerms?: string;
}


// --------------------
// PASSWORD VALIDATION
// --------------------

export interface PasswordRequirement {
    id: string;
    label: string;
    test: (value: string) => boolean;
}