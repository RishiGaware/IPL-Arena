import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import useAuthStore from "../store/useAuthStore";

export default function Login() {
  const signInWithGoogle = useAuthStore((state) => state.signInWithGoogle);
  const navigate = useNavigate();
  const [error, setError] = useState("");

  async function handleGoogleSignIn() {
    try {
      setError("");
      await signInWithGoogle();
      navigate("/leaderboard");
    } catch (err) {
      setError("Failed to sign in. Please try again.");
      console.error(err);
    }
  }

  return (
    <div className="relative flex min-h-screen w-full flex-col items-center justify-between overflow-hidden px-6 py-12 bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-slate-100">
      {/* Background Texture/Overlay */}
      <div
        className="absolute inset-0 z-0 opacity-20 pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(to bottom, rgba(18, 32, 23, 0.8), rgba(18, 32, 23, 1)), url("https://lh3.googleusercontent.com/aida-public/AB6AXuBrn4YO8dXefcY3Z0Ggkdw_PAu35P3MzS9mkB02hwF2GqUvpDgPrTandP_oAiqnqhkk9wqxeOQSxi69IxQqNsp0mH0mT26jkvBKwX2emUa9JuEWVQAdyAcPYcg11MrOELphtJPbOha0R9mzduAbJfOta3HpVR-TUb9xXkrETAZueFq-tT4Rt89atBxogQT_rIbFTIrKo5duDk5VaRmcZnyZ0MzdHQYB901qdpBesfL0lIv58hM7k0wzOtttpuo0jk1YynhZMfcyf4k")`,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      />

      {/* Top Section: Logo and App Name */}
      <div className="relative z-10 flex flex-col items-center mt-12 w-full">
        <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-primary/20 p-4 ring-2 ring-primary/50 shadow-[0_0_30px_rgba(33,196,93,0.3)]">
          <span className="material-symbols-outlined text-primary text-[60px]">sports_cricket</span>
        </div>

        <h1 className="text-4xl font-extrabold tracking-tight text-slate-100 mb-2">
          IPL <span className="text-primary">Predictor</span>
        </h1>
        <p className="text-slate-400 text-lg font-medium">
          Elevate your cricket IQ
        </p>
      </div>

      {/* Middle Section: Welcome and Action */}
      <div className="relative z-10 w-full max-w-sm flex flex-col items-center gap-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-slate-100">Welcome</h2>
          <p className="text-slate-400 mt-2">Sign in to start your winning streak</p>
        </div>

        {error && (
          <div className="bg-red-500/10 text-red-500 text-sm py-2 px-4 rounded-lg w-full text-center border border-red-500/20">
            {error}
          </div>
        )}

        {/* Sign in with Google Button */}
        <button
          onClick={handleGoogleSignIn}
          className="group flex w-full cursor-pointer items-center justify-center gap-3 rounded-xl bg-white px-6 py-4 transition-all hover:bg-slate-50 active:scale-[0.98] shadow-lg"
        >
          <div className="flex h-6 w-6 items-center justify-center">
            <svg height="24" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
          </div>
          <span className="text-base font-semibold text-slate-900">Sign in with Google</span>
        </button>

        {/* Status Indicator (Subtle Decoration) */}
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-primary animate-pulse"></div>
          <span className="text-xs font-medium text-primary/80 uppercase tracking-widest">
            Live Match Tracking Enabled
          </span>
        </div>
      </div>

      {/* Bottom Section: Terms */}
      <div className="relative z-10 w-full text-center">
        <p className="text-xs text-slate-500">
          By signing in, you agree to our <br className="sm:hidden" />
          <a className="text-primary hover:underline font-medium mx-1" href="#terms">Terms of Service</a>
          and
          <a className="text-primary hover:underline font-medium mx-1" href="#privacy">Privacy Policy</a>.
        </p>
      </div>
    </div>
  );
}
