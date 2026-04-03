import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import useAuthStore from "./store/useAuthStore";
import Login from "./pages/Login";
import AppLayout from "./components/layout/AppLayout";
import Leaderboard from "./pages/Leaderboard";
import Bet from "./pages/Bet";
import Live from "./pages/Live";
import Schedule from "./pages/Schedule";
import Profile from "./pages/Profile";
import "./App.css"


function LoadingScreen() {
  return (
    <div className="min-h-screen w-full flex flex-col items-center bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-slate-100">
      <div className="w-full max-w-md bg-background-light dark:bg-background-dark min-h-screen relative shadow-2xl flex items-center justify-center">
        <div className="relative">
          <div className="w-24 h-24 bg-gradient-to-br from-[#21c45d] to-[#122017] rounded-3xl shadow-xl flex items-center justify-center animate-bounce">
            <div className="absolute w-16 h-16 border-4 border-white rounded-full opacity-50"></div>
            <div className="w-12 h-12 border-4 border-white rounded-full flex items-center justify-center opacity-90">
              <div className="w-5 h-5 bg-white rounded-full"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PrivateRoute({ children }) {
  const { user, loading } = useAuthStore();

  if (loading) return <LoadingScreen />;
  return user ? children : <Navigate to="/login" replace />;
}

function PublicRoute({ children }) {
  const { user, loading } = useAuthStore();

  if (loading) return <LoadingScreen />;
  return user ? <Navigate to="/leaderboard" replace /> : children;
}

export default function App() {
  const initializeAuth = useAuthStore((state) => state.initializeAuth);

  useEffect(() => {
    const unsubscribe = initializeAuth();
    return () => unsubscribe();
  }, [initializeAuth]);

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            <PublicRoute>
              <Navigate to="/login" replace />
            </PublicRoute>
          }
        />
        <Route
          path="/login"
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }
        />

        <Route
          element={
            <PrivateRoute>
              <AppLayout />
            </PrivateRoute>
          }
        >
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/bet" element={<Bet />} />
          <Route path="/live" element={<Live />} />
          <Route path="/schedule" element={<Schedule />} />
          <Route path="/profile" element={<Profile />} />
        </Route>

        {/* Catch-all route to fallback to leaderboard */}
        <Route path="*" element={<Navigate to="/leaderboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
