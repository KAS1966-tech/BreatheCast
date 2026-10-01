import { Link } from "react-router-dom";
import { Mail, Phone, ArrowRight } from "lucide-react";
import Animated from "./Animated"; // Adjust path if needed
import { companyName, PRIVACY_EMAIL } from "../core/config";
import { useAppSelector } from "../app/redux";
import { AqiMark } from "../hooks/font/aqiLogo";

/* ---------------------------------------------------------------------------
Utility
--------------------------------------------------------------------------- */
const cx = (...classes: Array<string | false | null | undefined>) =>
    classes.filter(Boolean).join(" ");

/* ---------------------------------------------------------------------------
Footer Data
--------------------------------------------------------------------------- */
const quickLinks = [
    { name: "Home", href: "/home" },
    { name: "Predict AQI", href: "/predict" },
    { name: "Batch Upload", href: "/fileupload" },
    { name: "History", href: "/history" },
    { name: "Profile", href: "/profile" },
];

const publicQuickLinks = [
    { name: "Sign In", href: "/login" },
    { name: "Create Account", href: "/signup" },
];

const sitemapLinks = [
    { name: "About Us", href: "/about" },
    { name: "Privacy Policy", href: "/privacy" },
    { name: "Terms & Conditions", href: "/terms" },
    { name: "Settings", href: "/settings" },
];

const socialLinks = [
    {
        name: "GitHub",
        href: "https://github.com",
        icon: (
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.268 2.75 1.026A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.026 2.747-1.026.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.163 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
            </svg>
        ),
    },
    {
        name: "LinkedIn",
        href: "https://linkedin.com",
        icon: (
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.852 3.37-1.852 3.601 0 4.267 2.37 4.267 5.455v6.288zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.063 2.063 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
            </svg>
        ),
    },
    {
        name: "Fiverr",
        href: "https://fiverr.com",
        icon: (
            <svg className="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                <path d="M13.5 1.584A6 6 0 0 0 6.5 7.5v2.5H4v4h2.5v8.5h4.5v-8.5h3.5v-4H11v-2.5a1.5 1.5 0 0 1 2.5-1.118z M15.5 10h4.5v12.5h-4.5z M17.75 2.5a2.25 2.25 0 0 0 0 4.5 2.25 2.25 0 0 0 0-4.5z" />
            </svg>


        ),
    },

];

/* ---------------------------------------------------------------------------
Footer Component
--------------------------------------------------------------------------- */
const Footer = () => {
    const year = new Date().getFullYear();
    const mode = useAppSelector((state) => state.theme.mode);
    const isDark = mode === "dark";
    const { isAuthenticated } = useAppSelector((state) => state.auth);

    /* ---- Theme tokens (mirrors Navbar design system) ---- */
    const ui = isDark
        ? {
            root: "border-[rgba(231,241,240,0.12)] bg-[#101C21] text-[#E7F1F0]",
            textSoft: "text-[#93ACB0]",
            textFaint: "text-[#5E767B]",
            accent: "text-[#7EE9DA]",
            accentStrong: "text-[#4FD8C4]",
            border: "border-[rgba(231,241,240,0.12)]",
            borderStrong: "border-[rgba(231,241,240,0.28)]",
            giantText: "text-[rgba(231,241,240,0.04)]",
            ctaBg: "bg-[rgba(79,216,196,0.06)]",
            ctaBorder: "border-[rgba(79,216,196,0.16)]",
            primaryBtn:
                "bg-[#7EE9DA] text-[#0C1A1E] shadow-[0_10px_26px_-12px_rgba(126,233,218,0.6)] hover:-translate-y-px focus-visible:outline-[#4FD8C4]",
            ghostBtn:
                "border-[1.5px] border-[rgba(231,241,240,0.12)] bg-[#101C21] text-[#E7F1F0] hover:border-[rgba(231,241,240,0.28)] focus-visible:outline-[#4FD8C4]",
            socialIcon:
                "border-[rgba(231,241,240,0.28)] text-[#93ACB0] hover:border-[#4FD8C4] hover:text-[#7EE9DA] hover:-translate-y-0.5",
            linkHover: "hover:text-[#7EE9DA]",
            brandMarkBg: "bg-[rgba(79,216,196,0.16)]",
            brandMarkText: "text-[#7EE9DA]",
        }
        : {
            root: "border-[rgba(16,185,129,0.18)] bg-white text-[#0F2827]",
            textSoft: "text-[#4A6665]",
            textFaint: "text-[#8DA3A2]",
            accent: "text-[#059669]",
            accentStrong: "text-[#10B981]",
            border: "border-[rgba(16,185,129,0.18)]",
            borderStrong: "border-[rgba(16,185,129,0.38)]",
            giantText: "text-[rgba(16,185,129,0.05)]",
            ctaBg: "bg-[rgba(16,185,129,0.04)]",
            ctaBorder: "border-[rgba(16,185,129,0.14)]",
            primaryBtn:
                "bg-[#059669] text-[#F4FBF9] shadow-[0_10px_26px_-12px_rgba(5,150,105,0.6)] hover:-translate-y-px focus-visible:outline-[#10B981]",
            ghostBtn:
                "border-[1.5px] border-[rgba(16,185,129,0.18)] bg-white text-[#0F2827] hover:border-[rgba(16,185,129,0.38)] focus-visible:outline-[#10B981]",
            socialIcon:
                "border-[rgba(16,185,129,0.38)] text-[#4A6665] hover:border-[#10B981] hover:text-[#059669] hover:-translate-y-0.5",
            linkHover: "hover:text-[#059669]",
            brandMarkBg: "bg-[rgba(16,185,129,0.16)]",
            brandMarkText: "text-[#059669]",
        };

    const displayQuickLinks = isAuthenticated ? quickLinks : publicQuickLinks;

    return (
        <footer
            className={cx(
                "relative mt-24 overflow-hidden border-t py-16 font-body transition-[background-color,border-color] duration-400 ease-in-out motion-reduce:transition-none",
                ui.root
            )}
        >
            <div className="mx-auto w-full max-w-6xl px-5 sm:px-8">
                {/* Giant Background Text */}
                <div className="absolute inset-0 flex items-end justify-center pointer-events-none select-none overflow-hidden">
                    <span className="font-bold text-[160px] sm:text-[220px] leading-none text-(--bc-border) opacity-60 tracking-tighter whitespace-nowrap">
                        {companyName}
                    </span>
                </div>

                {/* CTA Banner — Unauthenticated users only */}
                {!isAuthenticated && (
                    <Animated delay={0}>
                        <div
                            className={cx(
                                "relative z-10 mb-14 rounded-[14px] border p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-5",
                                ui.ctaBg,
                                ui.ctaBorder
                            )}
                        >
                            <div>
                                <p className="text-lg font-semibold font-display">
                                    Ready to predict AQI with precision?
                                </p>
                                <p className={cx("text-sm mt-1.5", ui.textSoft)}>
                                    Analyze environmental and weather conditions in seconds.
                                </p>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                                <Link
                                    to="/login"
                                    className={cx(
                                        "inline-flex items-center justify-center gap-1.75 rounded-[10px] px-4 py-2.25 text-[13.5px] font-semibold font-body transition-[transform,box-shadow,border-color,background-color,color] duration-200 ease-in-out",
                                        ui.ghostBtn
                                    )}
                                >
                                    Sign In
                                </Link>
                                <Link
                                    to="/signup"
                                    className={cx(
                                        "inline-flex items-center justify-center gap-1.75 rounded-[10px] px-4 py-2.25 text-[13.5px] font-semibold font-body transition-[transform,box-shadow,border-color,background-color,color] duration-200 ease-in-out",
                                        ui.primaryBtn
                                    )}
                                >
                                    Get Started <ArrowRight size={14} />
                                </Link>
                            </div>
                        </div>
                    </Animated>
                )}

                {/* Main Grid */}
                <div className="relative z-10 grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-4">
                    {/* Column 1: Brand */}
                    <Animated delay={0}>
                        <div className="flex flex-col items-start text-left">
                            <Link to="/" className="flex items-center gap-2.5">
                                <span
                                    className={cx(
                                        "inline-flex h-8 w-8 items-center justify-center rounded-[9px]",
                                        ui.brandMarkBg,
                                        ui.brandMarkText
                                    )}
                                >
                                    <AqiMark />
                                </span>
                                <span className="font-display text-lg font-semibold tracking-[0.01em]">
                                    {companyName}
                                </span>
                            </Link>
                            <Animated delay={0.1}>
                                <p
                                    className={cx(
                                        "mt-5 max-w-xs text-sm leading-relaxed",
                                        ui.textSoft
                                    )}
                                >
                                    Predict AQI from environmental and weather conditions. Analyze
                                    single scenarios or entire CSV datasets with precision.
                                </p>
                            </Animated>
                            <div className="mt-6 flex items-center gap-3">
                                {socialLinks.map((item, idx) => (
                                    <Animated key={item.name} delay={0.2 + idx * 0.05}>
                                        <a
                                            href={item.href}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            aria-label={item.name}
                                            className={cx(
                                                "inline-flex h-9 w-9 items-center justify-center rounded-full border transition-all duration-200",
                                                ui.socialIcon
                                            )}
                                        >
                                            {item.icon}
                                        </a>
                                    </Animated>
                                ))}
                            </div>
                        </div>
                    </Animated>

                    {/* Column 2: Quick Links */}
                    <Animated delay={0.1}>
                        <div className="flex flex-col">
                            <p
                                className={cx(
                                    "mb-5 text-xs font-semibold uppercase tracking-wider",
                                    ui.textFaint
                                )}
                            >
                                Quick Links
                            </p>
                            <div className="flex flex-col gap-3">
                                {displayQuickLinks.map((link, idx) => (
                                    <Animated key={link.name} delay={idx * 0.5}>
                                        <Link
                                            to={link.href}
                                            className={cx(
                                                "text-sm font-medium transition-colors duration-200",
                                                ui.textSoft,
                                                ui.linkHover
                                            )}
                                        >
                                            {link.name}
                                        </Link>
                                    </Animated>
                                ))}
                            </div>
                        </div>
                    </Animated>

                    {/* Column 3: Sitemap / Legal */}
                    <Animated delay={0.2}>
                        <div className="flex flex-col">
                            <p
                                className={cx(
                                    "mb-5 text-xs font-semibold uppercase tracking-wider",
                                    ui.textFaint
                                )}
                            >
                                Legal & Sitemap
                            </p>
                            <div className="flex flex-col gap-3">
                                {sitemapLinks.map((link, idx) => {
                                    if (link.name === "Settings" && !isAuthenticated) {
                                        return null; // Skip rendering the "Settings" link for unauthenticated users
                                    }
                                    return (
                                        <Animated key={link.name} delay={0.25 + idx * 0.05}>
                                            <Link
                                                to={link.href}
                                                className={cx(
                                                    "text-sm font-medium transition-colors duration-200",
                                                    ui.textSoft,
                                                    ui.linkHover
                                                )}
                                            >
                                                {link.name}
                                            </Link>
                                        </Animated>)
                                })}
                            </div>
                        </div>
                    </Animated>

                    {/* Column 4: Contact */}
                    <Animated delay={0.3}>
                        <div className="flex flex-col">
                            <p
                                className={cx(
                                    "mb-5 text-xs font-semibold uppercase tracking-wider",
                                    ui.textFaint
                                )}
                            >
                                Get in Touch
                            </p>
                            <div className="flex flex-col gap-4">
                                <Animated delay={0.35}>
                                    <a
                                        href={`mailto:${PRIVACY_EMAIL}`}
                                        className={cx(
                                            "flex items-center gap-2.5 text-sm font-medium transition-colors duration-200",
                                            ui.textSoft,
                                            ui.linkHover
                                        )}
                                    >
                                        <Mail
                                            size={16}
                                            className={cx("shrink-0", ui.accent)}
                                        />
                                        {PRIVACY_EMAIL}
                                    </a>
                                </Animated>
                                <Animated delay={0.4}>
                                    <a
                                        href="tel:+923021234567"
                                        className={cx(
                                            "flex items-center gap-2.5 text-sm font-medium transition-colors duration-200",
                                            ui.textSoft,
                                            ui.linkHover
                                        )}
                                    >
                                        <Phone
                                            size={16}
                                            className={cx("shrink-0", ui.accent)}
                                        />
                                        +92-302-1234567
                                    </a>
                                </Animated>
                            </div>
                        </div>
                    </Animated>
                </div>

                {/* Bottom Bar */}
                <div
                    className={cx(
                        "relative z-10 mt-16 flex flex-col items-center justify-between gap-4 border-t pt-8 sm:flex-row",
                        ui.border
                    )}
                >
                    <p className={cx("text-xs", ui.textFaint)}>
                        © {year} {companyName}. All rights reserved.
                    </p>
                    <p className={cx("text-xs", ui.textFaint)}>
                        Designed & Developed by{" "}
                        <a
                            target="_blank"
                            rel="noopener noreferrer"
                            href="https://www.fiverr.com/s/1EAZ2e9"
                            className={cx("font-semibold hover:underline", ui.accentStrong)}
                        >
                            Khawaja Zain
                        </a>
                    </p>
                </div>
            </div>
        </footer>
    );
};

export default Footer;