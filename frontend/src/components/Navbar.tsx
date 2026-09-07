/* ============================================================================
Navbar — BreatheCast
==========================================================================*/
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
    Sun,
    Moon,
    Menu,
    X,
    LogOut,
    Settings,
    Check,
    Home,
    Gauge,
    FileUp,
    History,
    User,
    ArrowRight,
    ArrowLeft,
} from "lucide-react";

import { useAppDispatch, useAppSelector } from "../app/redux";
import { toggleTheme } from "../app/features/theme/themeSlice";
import { logout as logoutState } from "../app/features/auth/authSlice";
import { logout } from "../api/predictionApi";
import { AqiMark } from "../hooks/font/aqiLogo";
import { companyName } from "../core/config";

const NAV_LINKS: { label: string; href: string; icon: React.ReactNode }[] = [
    { label: "Home", href: "/home", icon: <Home size={15} /> },
    { label: "Predict", href: "/predict", icon: <Gauge size={15} /> },
    { label: "File Upload", href: "/fileupload", icon: <FileUp size={15} /> },
    { label: "History", href: "/history", icon: <History size={15} /> },
    { label: "Profile", href: "/profile", icon: <User size={15} /> },
];

const cx = (...classes: Array<string | false | null | undefined>) =>
    classes.filter(Boolean).join(" ");

const Navbar: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const dispatch = useAppDispatch();

    const mode = useAppSelector((state) => state.theme.mode);
    const isDark = mode === "dark";

    const { isAuthenticated, user } = useAppSelector((state) => state.auth);

    const [mobileOpen, setMobileOpen] = useState(false);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const settingsRef = useRef<HTMLDivElement>(null);

    const firstName = user?.fullname?.split(" ")[0] ?? user?.username ?? "User";

    /* ---- close menus on route change ---- */
    useEffect(() => {
        const timer = setTimeout(() => {
            setMobileOpen(false);
            setSettingsOpen(false);
        }, 0);

        return () => clearTimeout(timer);
    }, [location.pathname]);


    /* ---- settings dropdown: outside click + escape ---- */
    useEffect(() => {
        if (!settingsOpen) return;

        const onDown = (e: MouseEvent) => {
            if (
                settingsRef.current &&
                !settingsRef.current.contains(e.target as Node)
            ) {
                setSettingsOpen(false);
            }
        };

        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") setSettingsOpen(false);
        };

        document.addEventListener("mousedown", onDown);
        document.addEventListener("keydown", onKey);

        return () => {
            document.removeEventListener("mousedown", onDown);
            document.removeEventListener("keydown", onKey);
        };
    }, [settingsOpen]);

    const goTo = useCallback(
        (path: string) => {
            setMobileOpen(false);
            setSettingsOpen(false);

            if (location.pathname !== path) navigate(path);
        },
        [navigate, location.pathname]
    );

    const applyTheme = (target: "day" | "dark") => {
        if (target !== mode) dispatch(toggleTheme());
    };

    const handleLogout = async () => {
        try {
            await logout();
            dispatch(logoutState());

            setMobileOpen(false);
            setSettingsOpen(false);

            toast.success("Signed out successfully.");
            navigate("/login");
        } catch {
            toast.error("Unable to sign out. Please try again.");
        }
    };

    const ui = isDark
        ? {
            root: "text-[#E7F1F0]",
            header:
                "border-[rgba(231,241,240,0.12)] bg-[rgba(10,20,24,0.86)]",
            brand: "text-[#E7F1F0] focus-visible:outline-[#4FD8C4]",
            brandMark: "bg-[rgba(79,216,196,0.16)] text-[#7EE9DA]",
            brandName: "text-[#E7F1F0]",

            navLinkIdle:
                "text-[#93ACB0] hover:text-[#E7F1F0] after:bg-[#4FD8C4] after:scale-x-0 hover:after:scale-x-[0.6] focus-visible:outline-[#4FD8C4]",
            navLinkActive:
                "text-[#7EE9DA] after:bg-[#4FD8C4] after:scale-x-100 focus-visible:outline-[#4FD8C4]",

            iconBtnIdle:
                "border-[rgba(231,241,240,0.12)] bg-[#101C21] text-[#93ACB0] hover:border-[rgba(231,241,240,0.28)] hover:text-[#E7F1F0] focus-visible:outline-[#4FD8C4]",
            iconBtnOpen:
                "border-[#4FD8C4] bg-[#101C21] text-[#7EE9DA] focus-visible:outline-[#4FD8C4]",

            separator: "bg-[rgba(231,241,240,0.28)]",
            greet: "text-[#93ACB0]",

            logout:
                "text-[#93ACB0] hover:bg-[rgba(255,107,87,0.1)] hover:text-[#FF6B57] focus-visible:outline-[#4FD8C4]",

            ghostBtn:
                "border-[1.5px] border-[rgba(231,241,240,0.12)] bg-[#101C21] text-[#E7F1F0] hover:border-[rgba(231,241,240,0.28)] focus-visible:outline-[#4FD8C4]",
            primaryBtn:
                "border-none bg-[#7EE9DA] text-[#F4FBF9] shadow-[0_10px_26px_-12px_rgba(126,233,218,0.6)] hover:-translate-y-px focus-visible:outline-[#4FD8C4]",

            menu: "border-[rgba(231,241,240,0.28)] bg-[#101C21] shadow-[0_18px_40px_-20px_rgba(0,0,0,0.55)]",
            menuLabel: "text-[#5E767B]",

            seg: "bg-[#0C1A1E]",
            segIdle: "text-[#93ACB0] focus-visible:outline-[#4FD8C4]",
            segActive:
                "bg-[#101C21] text-[#7EE9DA] shadow-[0_4px_12px_-6px_rgba(9,30,34,0.3)] focus-visible:outline-[#4FD8C4]",

            mobilePanel: "border-[rgba(231,241,240,0.12)] bg-[#101C21]",
            mobileSection: "border-[rgba(231,241,240,0.12)]",

            mobileLinkIdle:
                "text-[#93ACB0] hover:bg-[#0C1A1E] hover:text-[#E7F1F0] focus-visible:outline-[#4FD8C4]",
            mobileLinkActive:
                "bg-[rgba(79,216,196,0.10)] text-[#7EE9DA] focus-visible:outline-[#4FD8C4]",
        }
        : {
            root: "text-[#0F2827]",
            header:
                "border-[rgba(16,185,129,0.18)] bg-[rgba(248,250,252,0.86)]",
            brand: "text-[#0F2827] focus-visible:outline-[#10B981]",
            brandMark: "bg-[rgba(16,185,129,0.16)] text-[#059669]",
            brandName: "text-[#0F2827]",

            navLinkIdle:
                "text-[#4A6665] hover:text-[#0F2827] after:bg-[#10B981] after:scale-x-0 hover:after:scale-x-[0.6] focus-visible:outline-[#10B981]",
            navLinkActive:
                "text-[#059669] after:bg-[#10B981] after:scale-x-100 focus-visible:outline-[#10B981]",

            iconBtnIdle:
                "border-[rgba(16,185,129,0.18)] bg-white text-[#4A6665] hover:border-[rgba(16,185,129,0.38)] hover:text-[#0F2827] focus-visible:outline-[#10B981]",
            iconBtnOpen:
                "border-[#10B981] bg-white text-[#059669] focus-visible:outline-[#10B981]",

            separator: "bg-[rgba(16,185,129,0.38)]",
            greet: "text-[#4A6665]",

            logout:
                "text-[#4A6665] hover:bg-[rgba(220,38,38,0.08)] hover:text-[#DC2626] focus-visible:outline-[#10B981]",

            ghostBtn:
                "border-[1.5px] border-[rgba(16,185,129,0.18)] bg-white text-[#0F2827] hover:border-[rgba(16,185,129,0.38)] focus-visible:outline-[#10B981]",
            primaryBtn:
                "border-none bg-[#059669] text-[#F4FBF9] shadow-[0_10px_26px_-12px_rgba(5,150,105,0.6)] hover:-translate-y-px focus-visible:outline-[#10B981]",

            menu: "border-[rgba(16,185,129,0.38)] bg-white shadow-[0_18px_40px_-20px_rgba(9,30,34,0.25)]",
            menuLabel: "text-[#8DA3A2]",

            seg: "bg-[#F0FDF4]",
            segIdle: "text-[#4A6665] focus-visible:outline-[#10B981]",
            segActive:
                "bg-white text-[#059669] shadow-[0_4px_12px_-6px_rgba(9,30,34,0.3)] focus-visible:outline-[#10B981]",

            mobilePanel: "border-[rgba(16,185,129,0.18)] bg-white",
            mobileSection: "border-[rgba(16,185,129,0.18)]",

            mobileLinkIdle:
                "text-[#4A6665] hover:bg-[#F0FDF4] hover:text-[#0F2827] focus-visible:outline-[#10B981]",
            mobileLinkActive:
                "bg-[rgba(16,185,129,0.10)] text-[#059669] focus-visible:outline-[#10B981]",
        };

    const desktopLinkBase = [
        "relative border-none bg-transparent cursor-pointer rounded-lg px-3 py-2 text-[13.5px] font-semibold font-body transition-[color,background-color] duration-200 ease-in-out",
        "after:content-[''] after:absolute after:left-3 after:right-3 after:bottom-[3px] after:h-[2px] after:rounded-full after:origin-left after:transition-transform after:duration-[250ms] after:ease-[cubic-bezier(0.16,1,0.3,1)]",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 motion-reduce:transition-none motion-reduce:after:transition-none",
    ].join(" ");

    const mobileLinkBase = [
        "flex w-full items-center gap-2.5 border-none bg-transparent cursor-pointer rounded-[10px] px-2.5 py-[11px] text-left text-sm font-semibold font-body transition-[background-color,color] duration-150 ease-in-out",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 motion-reduce:transition-none",
    ].join(" ");

    const iconBtnBase = [
        "inline-flex h-[34px] w-[34px] cursor-pointer items-center justify-center rounded-full border transition-[color,border-color,transform] duration-200 ease-in-out active:scale-95",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 motion-reduce:transition-none",
    ].join(" ");

    const buttonBase = [
        "inline-flex cursor-pointer items-center justify-center gap-[7px] rounded-[10px] px-4 py-[9px] text-[13.5px] font-semibold font-body",
        "transition-[transform,box-shadow,border-color,background-color,color] duration-200 ease-in-out",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 motion-reduce:transition-none",
    ].join(" ");

    const logoutBase = [
        "inline-flex cursor-pointer items-center gap-1.5 border-none bg-transparent rounded-lg px-2 py-1.5 text-[13px] font-semibold font-body",
        "transition-[color,background-color] duration-200 ease-in-out",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 motion-reduce:transition-none",
    ].join(" ");

    const segBtnBase = [
        "inline-flex cursor-pointer items-center justify-center gap-1.5 border-none bg-transparent rounded-lg px-2 py-[7px] text-[12.5px] font-semibold font-body",
        "transition-[background-color,color] duration-200 ease-in-out",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 motion-reduce:transition-none",
    ].join(" ");

    return (
        <div
            data-theme={isDark ? "dark" : "day"}
            className={cx("font-body", ui.root)}
        >
            <header
                className={cx(
                    "sticky top-0 z-50 border-b backdrop-blur-[14px] transition-[background-color,border-color] duration-400 ease-in-out motion-reduce:transition-none",
                    ui.header
                )}
            >
                <nav
                    className="mx-auto flex h-16 max-w-310 items-center justify-between gap-3 px-5 md:px-10"
                    aria-label="Primary"
                >
                    {/* ---------- Brand ---------- */}
                    <button
                        type="button"
                        className={cx(
                            "inline-flex cursor-pointer items-center gap-2.5 rounded-lg border-none bg-transparent p-1",
                            "focus-visible:outline focus-visible:outline-offset-2 motion-reduce:transition-none",
                            ui.brand
                        )}
                        onClick={() => goTo(isAuthenticated ? "/home" : "/")}
                        aria-label={`${companyName} home`}
                    >
                        <span
                            className={cx(
                                "inline-flex h-8 w-8 items-center justify-center rounded-[9px]",
                                ui.brandMark
                            )}
                        >
                            <AqiMark className="h-4 w-4" />
                        </span>

                        <span
                            className={cx(
                                "font-display text-lg font-semibold tracking-[0.01em]",
                                ui.brandName
                            )}
                        >
                            {companyName}
                        </span>
                    </button>

                    {/* ---------- Desktop links ---------- */}
                    {isAuthenticated && (
                        <ul className="m-0 hidden list-none items-center gap-1 p-0 min-[960px]:flex">
                            {NAV_LINKS.map((link) => (
                                <li key={link.href}>
                                    <button
                                        type="button"
                                        className={cx(
                                            desktopLinkBase,
                                            location.pathname === link.href
                                                ? ui.navLinkActive
                                                : ui.navLinkIdle
                                        )}
                                        onClick={() => goTo(link.href)}
                                        aria-current={
                                            location.pathname === link.href ? "page" : undefined
                                        }
                                    >
                                        {link.label}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}

                    {/* ---------- Right cluster ---------- */}
                    <div className="flex items-center gap-2">
                        {/* Quick theme toggle */}
                        <button
                            type="button"
                            className={cx(iconBtnBase, ui.iconBtnIdle)}
                            onClick={() => dispatch(toggleTheme())}
                            aria-label={
                                isDark ? "Switch to day theme" : "Switch to dark theme"
                            }
                        >
                            {isDark ? <Sun size={15} /> : <Moon size={15} />}
                        </button>

                        {/* Settings dropdown */}
                        <div className="relative" ref={settingsRef}>
                            <button
                                type="button"
                                className={cx(
                                    iconBtnBase,
                                    settingsOpen ? ui.iconBtnOpen : ui.iconBtnIdle
                                )}
                                onClick={() => setSettingsOpen((o) => !o)}
                                aria-haspopup="menu"
                                aria-expanded={settingsOpen}
                                aria-label="Settings"
                            >
                                <Settings size={15} />
                            </button>

                            {settingsOpen && (
                                <div
                                    className={cx(
                                        "absolute right-0 top-[calc(100%+10px)] z-60 w-56 rounded-[14px] border p-2",
                                        "animate-nb-pop-in motion-reduce:animate-none",
                                        ui.menu
                                    )}
                                    role="menu"
                                    aria-label="Settings"
                                >
                                    <p
                                        className={cx(
                                            "mx-2 mb-1.5 mt-1 text-[10.5px] font-bold uppercase tracking-[0.08em]",
                                            ui.menuLabel
                                        )}
                                    >
                                        Appearance
                                    </p>

                                    <div
                                        className={cx(
                                            "grid grid-cols-2 gap-1 rounded-[10px] p-1",
                                            ui.seg
                                        )}
                                    >
                                        <button
                                            type="button"
                                            className={cx(
                                                segBtnBase,
                                                !isDark ? ui.segActive : ui.segIdle
                                            )}
                                            onClick={() => applyTheme("day")}
                                            role="menuitemradio"
                                            aria-checked={!isDark}
                                        >
                                            <Sun size={13} />
                                            Day
                                        </button>

                                        <button
                                            type="button"
                                            className={cx(
                                                segBtnBase,
                                                isDark ? ui.segActive : ui.segIdle
                                            )}
                                            onClick={() => applyTheme("dark")}
                                            role="menuitemradio"
                                            aria-checked={isDark}
                                        >
                                            <Moon size={13} />
                                            Dark
                                        </button>
                                    </div>

                                    {isAuthenticated && (
                                        <>
                                            {location.pathname !== "/settings" ? (
                                                <div className="mt-3.5 flex flex-col gap-2">
                                                    <button
                                                        type="button"
                                                        className={cx(buttonBase, ui.ghostBtn, "w-full")}
                                                        onClick={() => void navigate("/settings")}
                                                    >
                                                        <ArrowRight size={15} />
                                                        Go to Settings
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="mt-3.5 flex flex-col gap-2">
                                                    <button
                                                        type="button"
                                                        className={cx(buttonBase, ui.ghostBtn, "w-full")}
                                                        onClick={() => void navigate(-1)}
                                                    >
                                                        <ArrowLeft size={15} />
                                                        Go Back
                                                    </button>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Desktop auth area */}
                        {isAuthenticated ? (
                            <div className="hidden items-center gap-2 min-[960px]:flex">
                                <span
                                    className={cx("h-5 w-px", ui.separator)}
                                    aria-hidden="true"
                                />

                                <span
                                    className={cx(
                                        "whitespace-nowrap text-[13px] font-semibold",
                                        ui.greet
                                    )}
                                >
                                    Hi, {firstName}
                                </span>

                                <button
                                    type="button"
                                    className={cx(logoutBase, ui.logout)}
                                    onClick={() => void handleLogout()}
                                >
                                    <LogOut size={14} />
                                    Log out
                                </button>
                            </div>
                        ) : (
                            <div className="hidden items-center gap-2 min-[960px]:flex">
                                <button
                                    type="button"
                                    className={cx(buttonBase, ui.ghostBtn)}
                                    onClick={() => goTo("/login")}
                                >
                                    Sign in
                                </button>

                                <button
                                    type="button"
                                    className={cx(buttonBase, ui.primaryBtn)}
                                    onClick={() => goTo("/signup")}
                                >
                                    Get Started
                                </button>
                            </div>
                        )}

                        {/* Hamburger */}
                        <button
                            type="button"
                            className={cx(iconBtnBase, ui.iconBtnIdle, "min-[960px]:hidden")}
                            onClick={() => setMobileOpen((v) => !v)}
                            aria-expanded={mobileOpen}
                            aria-controls="nb-mobile-menu"
                            aria-label={mobileOpen ? "Close menu" : "Open menu"}
                        >
                            {mobileOpen ? <X size={16} /> : <Menu size={16} />}
                        </button>
                    </div>
                </nav>

                {/* ---------- Mobile panel ---------- */}
                {mobileOpen && (
                    <div
                        id="nb-mobile-menu"
                        className={cx(
                            "border-t px-5 pb-5 pt-3 animate-nb-slide-down motion-reduce:animate-none min-[960px]:hidden",
                            ui.mobilePanel
                        )}
                    >
                        {isAuthenticated ? (
                            <>
                                <ul className="m-0 flex list-none flex-col gap-0.5 p-0">
                                    {NAV_LINKS.map((link) => (
                                        <li key={link.href}>
                                            <button
                                                type="button"
                                                className={cx(
                                                    mobileLinkBase,
                                                    location.pathname === link.href
                                                        ? ui.mobileLinkActive
                                                        : ui.mobileLinkIdle
                                                )}
                                                onClick={() => goTo(link.href)}
                                                aria-current={
                                                    location.pathname === link.href ? "page" : undefined
                                                }
                                            >
                                                {link.icon}
                                                {link.label}

                                                {location.pathname === link.href && (
                                                    <Check size={14} className="ml-auto" />
                                                )}
                                            </button>
                                        </li>
                                    ))}
                                </ul>

                                <div
                                    className={cx(
                                        "mt-3.5 border-t pt-3.5",
                                        ui.mobileSection
                                    )}
                                >
                                    <p
                                        className={cx(
                                            "mx-2 mb-1.5 mt-1 text-[10.5px] font-bold uppercase tracking-[0.08em]",
                                            ui.menuLabel
                                        )}
                                    >
                                        Appearance
                                    </p>

                                    <div
                                        className={cx(
                                            "grid grid-cols-2 gap-1 rounded-[10px] p-1",
                                            ui.seg
                                        )}
                                    >
                                        <button
                                            type="button"
                                            className={cx(
                                                segBtnBase,
                                                !isDark ? ui.segActive : ui.segIdle
                                            )}
                                            onClick={() => applyTheme("day")}
                                        >
                                            <Sun size={13} />
                                            Day
                                        </button>

                                        <button
                                            type="button"
                                            className={cx(
                                                segBtnBase,
                                                isDark ? ui.segActive : ui.segIdle
                                            )}
                                            onClick={() => applyTheme("dark")}
                                        >
                                            <Moon size={13} />
                                            Dark
                                        </button>
                                    </div>
                                </div>

                                {location.pathname !== "/settings" ? (
                                    <div className="mt-3.5 flex flex-col gap-2">
                                        <button
                                            type="button"
                                            className={cx(buttonBase, ui.ghostBtn, "w-full")}
                                            onClick={() => void navigate("/settings")}
                                        >
                                            <ArrowRight size={15} />
                                            Go to Settings
                                        </button>
                                    </div>
                                ) : (
                                    <div className="mt-3.5 flex flex-col gap-2">
                                        <button
                                            type="button"
                                            className={cx(buttonBase, ui.ghostBtn, "w-full")}
                                            onClick={() => void navigate(-1)}
                                        >
                                            <ArrowLeft size={15} />
                                            Go Back
                                        </button>
                                    </div>
                                )}
                            </>
                        ) : (
                            <>
                                <div className="mt-1 border-t-0 pt-1">
                                    <p
                                        className={cx(
                                            "mx-2 mb-1.5 mt-1 text-[10.5px] font-bold uppercase tracking-[0.08em]",
                                            ui.menuLabel
                                        )}
                                    >
                                        Appearance
                                    </p>

                                    <div
                                        className={cx(
                                            "grid grid-cols-2 gap-1 rounded-[10px] p-1",
                                            ui.seg
                                        )}
                                    >
                                        <button
                                            type="button"
                                            className={cx(
                                                segBtnBase,
                                                !isDark ? ui.segActive : ui.segIdle
                                            )}
                                            onClick={() => applyTheme("day")}
                                        >
                                            <Sun size={13} />
                                            Day
                                        </button>

                                        <button
                                            type="button"
                                            className={cx(
                                                segBtnBase,
                                                isDark ? ui.segActive : ui.segIdle
                                            )}
                                            onClick={() => applyTheme("dark")}
                                        >
                                            <Moon size={13} />
                                            Dark
                                        </button>
                                    </div>
                                </div>

                                <div className="mt-3.5 flex flex-col gap-2">
                                    <button
                                        type="button"
                                        className={cx(buttonBase, ui.ghostBtn, "w-full")}
                                        onClick={() => goTo("/login")}
                                    >
                                        Sign in
                                    </button>

                                    <button
                                        type="button"
                                        className={cx(buttonBase, ui.primaryBtn, "w-full")}
                                        onClick={() => goTo("/")}
                                    >
                                        Register
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                )}
            </header>
        </div>
    );
};

export default Navbar;