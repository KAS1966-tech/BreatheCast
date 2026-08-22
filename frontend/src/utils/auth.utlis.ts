import { EMAIL_PATTERN, PASSWORD_PATTERN, USERNAME_PATTERN } from "../constants/regex.constants";
import type { FormErrors, FormValues } from "../hooks/types/auth.type";

export type StrengthLevel = 0 | 1 | 2 | 3;

export function getPasswordStrength(password: string): { level: StrengthLevel; label: string } {
    if (!password) return { level: 0, label: "" };

    const rules = [
        /[a-z]/.test(password),
        /[A-Z]/.test(password),
        /\d/.test(password),
        /[@$!%*?&^#()_+\-=[\]{};':"\\|,.<>/?]/.test(password),
        password.length >= 8,
        password.length >= 12,
    ];

    const score = rules.filter(Boolean).length;

    if (score <= 3) return { level: 1, label: "Weak" };
    if (score <= 5) return { level: 2, label: "Fair" };
    return { level: 3, label: "Strong" };
}

export function normalizeUsername(value: string): string {
    if (!value) return value;
    return value.startsWith("@") ? value : `@${value}`;
}

export const signupValidate = (v: FormValues): FormErrors => {
        const next: FormErrors = {};

        if (!v.fullName.trim()) {
            next.fullName = "Enter your full name.";
        } else if (v.fullName.trim().length < 2) {
            next.fullName = "Full name looks too short.";
        }

        if (!v.username.trim()) {
            next.username = "Choose a username.";
        } else if (!USERNAME_PATTERN.test(v.username.trim())) {
            next.username = "Username must start with @ and use 3–50 letters, numbers, or underscores.";
        }

        if (!v.email.trim()) {
            next.email = "Enter your email address.";
        } else if (!EMAIL_PATTERN.test(v.email.trim())) {
            next.email = "Enter a valid email address.";
        }

        if (!v.password) {
            next.password = "Create a password.";
        } else if (!PASSWORD_PATTERN.test(v.password)) {
            next.password =
                "Password needs an uppercase and lowercase letter, a number, a symbol, and 8+ characters.";
        }

        if (!v.confirmPassword) {
            next.confirmPassword = "Confirm your password.";
        } else if (v.confirmPassword !== v.password) {
            next.confirmPassword = "Passwords do not match.";
        }

        return next;
    };