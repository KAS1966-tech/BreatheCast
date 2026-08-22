/* ============================================================================
 * Navbar — BreatheCast
 * ==========================================================================*/
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

const Navbar: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const dispatch = useAppDispatch();

    const mode = useAppSelector((state) => state.theme.mode);
    const isDark = mode === "dark";
    const { isAuthenticated, user } = useAppSelector((state) => state.auth) as {
        isAuthenticated: boolean;
        user?: { fullname?: string; username?: string };
    };

    const [mobileOpen, setMobileOpen] = useState(false);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const settingsRef = useRef<HTMLDivElement>(null);

    const firstName = user?.fullname?.split(" ")[0] ?? user?.username ?? "User";

    /* ---- close menus on route change ---- */
    useEffect(() => {
        setMobileOpen(false);
        setSettingsOpen(false);
    }, [location.pathname]);

    /* ---- settings dropdown: outside click + escape ---- */
    useEffect(() => {
        if (!settingsOpen) return;
        const onDown = (e: MouseEvent) => {
            if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
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

    return (
        <div className="nb-root" data-theme={isDark ? "dark" : "day"}>
            <style>{`
        .nb-root {
            --nb-font-display: 'Fraunces', 'Georgia', serif;
            --nb-font-body: 'Plus Jakarta Sans', 'Inter', system-ui, sans-serif;
            font-family: var(--nb-font-body);
        }
        .nb-root[data-theme='day'] {
            --nb-bg: rgba(248, 250, 252, 0.86);
            --nb-surface: #FFFFFF;
            --nb-surface-2: #F0FDF4;
            --nb-ink: #0F2827;
            --nb-ink-soft: #4A6665;
            --nb-ink-faint: #8DA3A2;
            --nb-accent: #10B981;
            --nb-accent-strong: #059669;
            --nb-border: rgba(16, 185, 129, 0.18);
            --nb-border-strong: rgba(16, 185, 129, 0.38);
            --nb-danger: #DC2626;
            --nb-danger-bg: rgba(220, 38, 38, 0.08);
            --nb-focus-ring: rgba(16, 185, 129, 0.35);
            --nb-shadow: 0 18px 40px -20px rgba(9, 30, 34, 0.25);
        }
        .nb-root[data-theme='dark'] {
            --nb-bg: rgba(10, 20, 24, 0.86);
            --nb-surface: #101C21;
            --nb-surface-2: #0C1A1E;
            --nb-ink: #E7F1F0;
            --nb-ink-soft: #93ACB0;
            --nb-ink-faint: #5E767B;
            --nb-accent: #4FD8C4;
            --nb-accent-strong: #7EE9DA;
            --nb-border: rgba(231, 241, 240, 0.12);
            --nb-border-strong: rgba(231, 241, 240, 0.28);
            --nb-danger: #FF6B57;
            --nb-danger-bg: rgba(255, 107, 87, 0.1);
            --nb-focus-ring: rgba(79, 216, 196, 0.38);
            --nb-shadow: 0 18px 40px -20px rgba(0, 0, 0, 0.55);
        }

        .nb-header {
            position: sticky; top: 0; z-index: 50;
            background: var(--nb-bg);
            backdrop-filter: blur(14px);
            -webkit-backdrop-filter: blur(14px);
            border-bottom: 1px solid var(--nb-border);
            transition: background 0.4s ease, border-color 0.4s ease;
        }
        .nb-nav {
            max-width: 1240px; margin: 0 auto; height: 64px;
            display: flex; align-items: center; justify-content: space-between;
            padding: 0 20px; gap: 12px;
        }
        @media (min-width: 768px) { .nb-nav { padding: 0 40px; } }

        .nb-brand {
            display: inline-flex; align-items: center; gap: 10px;
            background: none; border: none; cursor: pointer; padding: 4px;
            border-radius: 8px; color: var(--nb-ink);
        }
        .nb-brand:focus-visible { outline: 2px solid var(--nb-accent); outline-offset: 2px; }
        .nb-brand-mark {
            display: inline-flex; align-items: center; justify-content: center;
            width: 32px; height: 32px; border-radius: 9px;
            background: color-mix(in srgb, var(--nb-accent) 16%, transparent);
            color: var(--nb-accent-strong);
        }
        .nb-brand-name {
            font-family: var(--nb-font-display); font-size: 18px; font-weight: 600;
            letter-spacing: 0.01em;
        }

        /* ---------- Desktop links ---------- */
        .nb-links { display: none; list-style: none; margin: 0; padding: 0; gap: 4px; }
        @media (min-width: 960px) { .nb-links { display: flex; align-items: center; } }
        .nb-link {
            position: relative; background: none; border: none; cursor: pointer;
            font-size: 13.5px; font-weight: 600; font-family: var(--nb-font-body);
            color: var(--nb-ink-soft); padding: 8px 12px; border-radius: 8px;
            transition: color 0.2s ease, background 0.2s ease;
        }
        .nb-link::after {
            content: ''; position: absolute; left: 12px; right: 12px; bottom: 3px;
            height: 2px; border-radius: 999px; background: var(--nb-accent);
            transform: scaleX(0); transform-origin: left center;
            transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .nb-link:hover { color: var(--nb-ink); }
        .nb-link:hover::after { transform: scaleX(0.6); }
        .nb-link.is-active { color: var(--nb-accent-strong); }
        .nb-link.is-active::after { transform: scaleX(1); }
        .nb-link:focus-visible { outline: 2px solid var(--nb-accent); outline-offset: 2px; }

        /* ---------- Right cluster ---------- */
        .nb-right { display: flex; align-items: center; gap: 8px; }
        .nb-desktop-only { display: none; }
        @media (min-width: 960px) { .nb-desktop-only { display: flex; align-items: center; gap: 8px; } }

        .nb-icon-btn {
            display: inline-flex; align-items: center; justify-content: center;
            width: 34px; height: 34px; border-radius: 999px; cursor: pointer;
            border: 1px solid var(--nb-border); background: var(--nb-surface);
            color: var(--nb-ink-soft);
            transition: color 0.2s ease, border-color 0.2s ease, transform 0.15s ease;
        }
        .nb-icon-btn:hover { color: var(--nb-ink); border-color: var(--nb-border-strong); }
        .nb-icon-btn:active { transform: scale(0.95); }
        .nb-icon-btn:focus-visible { outline: 2px solid var(--nb-accent); outline-offset: 2px; }
        .nb-icon-btn.is-open { color: var(--nb-accent-strong); border-color: var(--nb-accent); }

        .nb-sep { width: 1px; height: 20px; background: var(--nb-border-strong); }
        .nb-greet { font-size: 13px; color: var(--nb-ink-soft); font-weight: 600; white-space: nowrap; }
        .nb-logout {
            display: inline-flex; align-items: center; gap: 6px; cursor: pointer;
            background: none; border: none; font-size: 13px; font-weight: 600;
            color: var(--nb-ink-soft); padding: 6px 8px; border-radius: 8px;
            font-family: var(--nb-font-body);
            transition: color 0.2s ease, background 0.2s ease;
        }
        .nb-logout:hover { color: var(--nb-danger); background: var(--nb-danger-bg); }
        .nb-logout:focus-visible { outline: 2px solid var(--nb-accent); outline-offset: 2px; }

        .nb-btn {
            display: inline-flex; align-items: center; justify-content: center; gap: 7px;
            border-radius: 10px; font-size: 13.5px; font-weight: 600; cursor: pointer;
            padding: 9px 16px; font-family: var(--nb-font-body);
            transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.2s ease, background 0.2s ease, color 0.2s ease;
        }
        .nb-btn:focus-visible { outline: 2px solid var(--nb-accent); outline-offset: 2px; }
        .nb-btn-ghost { border: 1.5px solid var(--nb-border); background: var(--nb-surface); color: var(--nb-ink); }
        .nb-btn-ghost:hover { border-color: var(--nb-border-strong); }
        .nb-btn-primary {
            border: none; background: var(--nb-accent-strong); color: #F4FBF9;
            box-shadow: 0 10px 26px -12px color-mix(in srgb, var(--nb-accent-strong) 60%, transparent);
        }
        .nb-btn-primary:hover { transform: translateY(-1px); }

        /* ---------- Settings dropdown ---------- */
        .nb-settings { position: relative; }
        .nb-menu {
            position: absolute; right: 0; top: calc(100% + 10px); z-index: 60;
            width: 224px; padding: 8px; border-radius: 14px;
            background: var(--nb-surface); border: 1px solid var(--nb-border-strong);
            box-shadow: var(--nb-shadow);
            animation: nb-pop-in 0.18s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        .nb-menu-label {
            font-size: 10.5px; font-weight: 700; letter-spacing: 0.08em;
            text-transform: uppercase; color: var(--nb-ink-faint);
            margin: 4px 8px 6px;
        }
        .nb-seg {
            display: grid; grid-template-columns: 1fr 1fr; gap: 4px;
            background: var(--nb-surface-2); border-radius: 10px; padding: 4px;
        }
        .nb-seg-btn {
            display: inline-flex; align-items: center; justify-content: center; gap: 6px;
            border: none; background: transparent; cursor: pointer;
            font-size: 12.5px; font-weight: 600; color: var(--nb-ink-soft);
            padding: 7px 8px; border-radius: 8px; font-family: var(--nb-font-body);
            transition: background 0.2s ease, color 0.2s ease;
        }
        .nb-seg-btn:focus-visible { outline: 2px solid var(--nb-accent); outline-offset: 1px; }
        .nb-seg-btn.is-active {
            background: var(--nb-surface); color: var(--nb-accent-strong);
            box-shadow: 0 4px 12px -6px rgba(9, 30, 34, 0.3);
        }
        .nb-divider { height: 1px; background: var(--nb-border); margin: 8px 4px; }
        .nb-menu-item {
            display: flex; align-items: center; gap: 8px; width: 100%;
            background: none; border: none; cursor: pointer; text-align: left;
            font-size: 13px; font-weight: 600; color: var(--nb-ink-soft);
            padding: 9px 10px; border-radius: 9px; font-family: var(--nb-font-body);
            transition: background 0.15s ease, color 0.15s ease;
        }
        .nb-menu-item:hover { background: var(--nb-surface-2); color: var(--nb-ink); }
        .nb-menu-item.is-danger:hover { background: var(--nb-danger-bg); color: var(--nb-danger); }
        .nb-menu-item:focus-visible { outline: 2px solid var(--nb-accent); outline-offset: 1px; }
        .nb-menu-check { margin-left: auto; color: var(--nb-accent-strong); }

        /* ---------- Hamburger ---------- */
        .nb-burger { display: inline-flex; }
        @media (min-width: 960px) { .nb-burger { display: none; } }

        /* ---------- Mobile panel ---------- */
        .nb-mobile {
            border-top: 1px solid var(--nb-border);
            background: var(--nb-surface);
            padding: 12px 20px 20px;
            animation: nb-slide-down 0.25s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        @media (min-width: 960px) { .nb-mobile { display: none; } }
        .nb-mobile-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 2px; }
        .nb-mobile-link {
            display: flex; align-items: center; gap: 10px; width: 100%;
            background: none; border: none; cursor: pointer; text-align: left;
            font-size: 14px; font-weight: 600; color: var(--nb-ink-soft);
            padding: 11px 10px; border-radius: 10px; font-family: var(--nb-font-body);
            transition: background 0.15s ease, color 0.15s ease;
        }
        .nb-mobile-link:hover { background: var(--nb-surface-2); color: var(--nb-ink); }
        .nb-mobile-link.is-active { color: var(--nb-accent-strong); background: color-mix(in srgb, var(--nb-accent) 10%, transparent); }
        .nb-mobile-link:focus-visible { outline: 2px solid var(--nb-accent); outline-offset: 1px; }
        .nb-mobile-section { margin-top: 14px; padding-top: 14px; border-top: 1px solid var(--nb-border); }
        .nb-mobile-actions { display: flex; flex-direction: column; gap: 8px; margin-top: 14px; }
        .nb-mobile-actions .nb-btn { width: 100%; }

        /* ---------- Motion ---------- */
        @keyframes nb-pop-in { from { opacity: 0; transform: translateY(-6px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes nb-slide-down { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
        @media (prefers-reduced-motion: reduce) {
            .nb-menu, .nb-mobile { animation: none !important; }
            .nb-link::after, .nb-btn, .nb-icon-btn { transition: none !important; }
        }
            `}</style>

            <header className="nb-header">
                <nav className="nb-nav" aria-label="Primary">
                    {/* ---------- Brand ---------- */}
                    <button
                        type="button"
                        className="nb-brand"
                        onClick={() => goTo(isAuthenticated ? "/home" : "/")}
                        aria-label={`${companyName} home`}
                    >
                        <span className="nb-brand-mark">
                            <AqiMark className="h-4 w-4" />
                        </span>
                        <span className="nb-brand-name">{companyName}</span>
                    </button>

                    {/* ---------- Desktop links ---------- */}
                    {isAuthenticated && (
                        <ul className="nb-links">
                            {NAV_LINKS.map((link) => (
                                <li key={link.href}>
                                    <button
                                        type="button"
                                        className={`nb-link${location.pathname === link.href ? " is-active" : ""}`}
                                        onClick={() => goTo(link.href)}
                                        aria-current={location.pathname === link.href ? "page" : undefined}
                                    >
                                        {link.label}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}

                    {/* ---------- Right cluster ---------- */}
                    <div className="nb-right">
                        {/* Quick theme toggle */}
                        <button
                            type="button"
                            className="nb-icon-btn"
                            onClick={() => dispatch(toggleTheme())}
                            aria-label={isDark ? "Switch to day theme" : "Switch to dark theme"}
                        >
                            {isDark ? <Sun size={15} /> : <Moon size={15} />}
                        </button>

                        {/* Settings dropdown */}
                        <div className="nb-settings" ref={settingsRef}>
                            <button
                                type="button"
                                className={`nb-icon-btn${settingsOpen ? " is-open" : ""}`}
                                onClick={() => setSettingsOpen((o) => !o)}
                                aria-haspopup="menu"
                                aria-expanded={settingsOpen}
                                aria-label="Settings"
                            >
                                <Settings size={15} />
                            </button>

                            {settingsOpen && (
                                <div className="nb-menu" role="menu" aria-label="Settings">
                                    <p className="nb-menu-label">Appearance</p>
                                    <div className="nb-seg">
                                        <button
                                            type="button"
                                            className={`nb-seg-btn${!isDark ? " is-active" : ""}`}
                                            onClick={() => applyTheme("day")}
                                            role="menuitemradio"
                                            aria-checked={!isDark}
                                        >
                                            <Sun size={13} />
                                            Day
                                        </button>
                                        <button
                                            type="button"
                                            className={`nb-seg-btn${isDark ? " is-active" : ""}`}
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
                                            <div className="nb-divider" />
                                            <button
                                                type="button"
                                                className="nb-menu-item is-danger"
                                                role="menuitem"
                                                onClick={() => void handleLogout()}
                                            >
                                                <LogOut size={14} />
                                                Sign out
                                            </button>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Desktop auth area */}
                        {isAuthenticated ? (
                            <div className="nb-desktop-only">
                                <span className="nb-sep" aria-hidden="true" />
                                <span className="nb-greet">Hi, {firstName}</span>
                                <button type="button" className="nb-logout" onClick={() => void handleLogout()}>
                                    <LogOut size={14} />
                                    Log out
                                </button>
                            </div>
                        ) : (
                            <div className="nb-desktop-only">
                                <button type="button" className="nb-btn nb-btn-ghost" onClick={() => goTo("/login")}>
                                    Sign in
                                </button>
                                <button type="button" className="nb-btn nb-btn-primary" onClick={() => goTo("/")}>
                                    Register
                                </button>
                            </div>
                        )}

                        {/* Hamburger */}
                        <button
                            type="button"
                            className="nb-icon-btn nb-burger"
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
                    <div id="nb-mobile-menu" className="nb-mobile">
                        {isAuthenticated ? (
                            <>
                                <ul className="nb-mobile-list">
                                    {NAV_LINKS.map((link) => (
                                        <li key={link.href}>
                                            <button
                                                type="button"
                                                className={`nb-mobile-link${location.pathname === link.href ? " is-active" : ""}`}
                                                onClick={() => goTo(link.href)}
                                                aria-current={location.pathname === link.href ? "page" : undefined}
                                            >
                                                {link.icon}
                                                {link.label}
                                                {location.pathname === link.href && (
                                                    <Check size={14} className="nb-menu-check" />
                                                )}
                                            </button>
                                        </li>
                                    ))}
                                </ul>

                                <div className="nb-mobile-section">
                                    <p className="nb-menu-label">Appearance</p>
                                    <div className="nb-seg">
                                        <button
                                            type="button"
                                            className={`nb-seg-btn${!isDark ? " is-active" : ""}`}
                                            onClick={() => applyTheme("day")}
                                        >
                                            <Sun size={13} />
                                            Day
                                        </button>
                                        <button
                                            type="button"
                                            className={`nb-seg-btn${isDark ? " is-active" : ""}`}
                                            onClick={() => applyTheme("dark")}
                                        >
                                            <Moon size={13} />
                                            Dark
                                        </button>
                                    </div>
                                </div>

                                <div className="nb-mobile-actions">
                                    <button type="button" className="nb-btn nb-btn-ghost" onClick={() => void handleLogout()}>
                                        <LogOut size={15} />
                                        Log out · {firstName}
                                    </button>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="nb-mobile-section" style={{ marginTop: 4, paddingTop: 4, borderTop: "none" }}>
                                    <p className="nb-menu-label">Appearance</p>
                                    <div className="nb-seg">
                                        <button
                                            type="button"
                                            className={`nb-seg-btn${!isDark ? " is-active" : ""}`}
                                            onClick={() => applyTheme("day")}
                                        >
                                            <Sun size={13} />
                                            Day
                                        </button>
                                        <button
                                            type="button"
                                            className={`nb-seg-btn${isDark ? " is-active" : ""}`}
                                            onClick={() => applyTheme("dark")}
                                        >
                                            <Moon size={13} />
                                            Dark
                                        </button>
                                    </div>
                                </div>
                                <div className="nb-mobile-actions">
                                    <button type="button" className="nb-btn nb-btn-ghost" onClick={() => goTo("/login")}>
                                        Sign in
                                    </button>
                                    <button type="button" className="nb-btn nb-btn-primary" onClick={() => goTo("/")}>
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