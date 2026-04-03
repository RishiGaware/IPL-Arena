import React from "react";
import useAuthStore from "../store/useAuthStore";

export default function Profile() {
    const { user, signOutUser } = useAuthStore();

    return (
        <div className="flex flex-col w-full h-full p-6">
            <header className="flex items-center gap-2 mb-8">
                <span className="material-symbols-outlined text-primary text-3xl">account_circle</span>
                <h1 className="text-xl font-bold tracking-tight">Profile</h1>
            </header>

            <div className="bg-primary/5 border border-primary/20 p-8 rounded-2xl flex flex-col items-center flex-1 max-h-[400px] justify-center shadow-sm">
                {user?.photoURL ? (
                    <img
                        src={user.photoURL}
                        alt="Profile"
                        className="w-24 h-24 rounded-full border-4 border-primary/20 mb-4 shadow-md"
                    />
                ) : (
                    <div className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center mb-4 text-3xl font-bold text-primary border-4 border-primary/10">
                        {user?.displayName?.[0]?.toUpperCase() || "U"}
                    </div>
                )}

                <h2 className="text-2xl font-bold mb-1">{user?.displayName || "User"}</h2>
                <p className="text-slate-500 dark:text-slate-400 mb-8 text-sm">{user?.email}</p>

                <button
                    onClick={signOutUser}
                    className="w-full bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/20 font-bold py-3 px-4 rounded-xl transition-all duration-200 border border-red-100 dark:border-red-500/20 flex items-center justify-center gap-2"
                >
                    <span className="material-symbols-outlined">logout</span>
                    LOGOUT
                </button>
            </div>
        </div>
    );
}
