import React, { useState, useRef, useEffect } from 'react';
import useAuthStore from '../../store/useAuthStore';

export default function TopHeader({ title, children }) {
    const user = useAuthStore((state) => state.user);
    const signOutUser = useAuthStore((state) => state.signOutUser);
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef(null);

    // Close menu when clicking outside
    useEffect(() => {
        function handleClickOutside(e) {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                setMenuOpen(false);
            }
        }
        if (menuOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        }
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [menuOpen]);

    const handleLogout = async () => {
        setMenuOpen(false);
        await signOutUser();
    };

    // Avatar: use photoURL or fallback to initials
    const renderAvatar = () => {
        if (user?.photoURL) {
            return (
                <img
                    src={user.photoURL}
                    alt={user.displayName || "Profile"}
                    className="size-9 rounded-full object-cover border-2 border-primary/30"
                    referrerPolicy="no-referrer"
                />
            );
        }

        const initials = (user?.displayName || "?")
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2);

        return (
            <div className="size-9 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm border-2 border-primary/30">
                {initials}
            </div>
        );
    };

    return (
        <header className="glass-header">
            <div className="flex items-center p-4 justify-between max-w-md mx-auto w-full">
                {/* Title — left aligned */}
                <h2 className="text-lg font-bold leading-tight tracking-tight">
                    {title}
                </h2>

                {/* Profile avatar — right aligned */}
                <div className="relative" ref={menuRef}>
                    <button
                        onClick={() => setMenuOpen((prev) => !prev)}
                        className="focus:outline-none rounded-full transition-transform hover:scale-105 active:scale-95"
                    >
                        {renderAvatar()}
                    </button>

                    {/* Dropdown menu */}
                    {menuOpen && (
                        <div className="absolute right-0 top-12 w-48 bg-white dark:bg-[#1d2620] border border-slate-200 dark:border-primary/20 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
                            {/* User info */}
                            <div className="px-4 py-3 border-b border-slate-100 dark:border-primary/10">
                                <p className="text-sm font-bold truncate">{user?.displayName || "User"}</p>
                                <p className="text-[10px] text-slate-500 truncate">{user?.email || ""}</p>
                            </div>

                            {/* Logout */}
                            <button
                                onClick={handleLogout}
                                className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                            >
                                <span className="material-symbols-outlined text-lg">logout</span>
                                Logout
                            </button>
                        </div>
                    )}
                </div>
            </div>
            {children}
        </header>
    );
}
