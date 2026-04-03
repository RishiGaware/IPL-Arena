import React from "react";
import { Outlet, NavLink } from "react-router-dom";

export default function AppLayout() {
    const navItems = [
        { name: "Matches", path: "/schedule", icon: "sports_cricket" },
        { name: "Live", path: "/live", icon: "live_tv" },
        { name: "Leaderboard", path: "/leaderboard", icon: "leaderboard" },
        { name: "Bet", path: "/bet", icon: "sports_esports" },
    ];

    return (
        <div className="bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-slate-100 h-screen overflow-hidden flex flex-col items-center">
            {/* Mobile Wrapper */}
            <div className="w-full max-w-md bg-background-light dark:bg-background-dark h-full relative shadow-2xl overflow-hidden border-x border-slate-200 dark:border-primary/20 flex flex-col">

                {/* Main Content Area */}
                <div className="flex-1 w-full flex flex-col overflow-hidden">
                    <Outlet />
                </div>

                {/* Bottom Navigation Bar */}
                <nav className="shrink-0 bg-background-light dark:bg-[#1d2620] border-t border-slate-200 dark:border-primary/20 px-6 py-3 z-50">
                    <div className="max-w-md mx-auto flex justify-between items-center px-2">
                        {navItems.map((item) => (
                            <NavLink
                                key={item.name}
                                to={item.path}
                                className={({ isActive }) =>
                                    `flex flex-col items-center gap-1 transition-colors ${isActive ? "text-primary" : "text-slate-400 hover:text-slate-500"
                                    }`
                                }
                            >
                                {({ isActive }) => (
                                    <>
                                        <span
                                            className="material-symbols-outlined text-[20px] md:text-2xl"
                                            style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}
                                        >
                                            {item.icon}
                                        </span>
                                        <span className={`text-[10px] ${isActive ? "font-bold" : "font-medium"}`}>
                                            {item.name}
                                        </span>
                                    </>
                                )}
                            </NavLink>
                        ))}
                    </div>
                </nav>
            </div>
        </div>
    );
}
