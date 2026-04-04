import {
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  doc,
  getDoc,
} from "firebase/firestore";
import { isSameDay, format } from "date-fns";
import React, { useState, useEffect, useMemo } from "react";

import TopHeader from "../components/ui/TopHeader";
import { getTeamLogo, TEAM_SHORT_NAMES } from "../constants/teamLogos";
import useAuthStore from "../store/useAuthStore";
import { db } from "../firebase";

export default function Live() {
  const user = useAuthStore((state) => state.user);
  const [liveMatches, setLiveMatches] = useState([]);
  const [betsMap, setBetsMap] = useState({}); // matchId → bets[]
  const [betUsers, setBetUsers] = useState({}); // userId → { displayName, photoURL }

  // ─── Fetch live/upcoming matches for TODAY ───────────────────
  useEffect(() => {
    const q = query(
      collection(db, "matches"),
      where("status", "in", [
        "upcoming",
        "UPCOMING",
        "betting_closed",
        "live",
        "LIVE",
        "betting_open",
        "BETTING_OPEN",
      ]),
      orderBy("matchStartTime", "asc"),
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const today = new Date();
      const matches = snapshot.docs
        .map((docSnap) => {
          const data = docSnap.data();
          const dateObj = data.matchStartTime.toDate();
          return {
            id: docSnap.id,
            ...data,
            date: format(dateObj, "EEE, MMM d"),
            time: format(dateObj, "h:mm a"),
            dateObj,
          };
        })
        .filter((match) => isSameDay(match.dateObj, today));

      setLiveMatches(matches);
    });

    return () => unsubscribe();
  }, []);

  // ─── Fetch all bets for all live matches ────────────────────
  useEffect(() => {
    if (liveMatches.length === 0) {
      queueMicrotask(() => setBetsMap({}));
      return;
    }

    const matchIds = liveMatches.map((m) => m.id);
    const q = query(
      collection(db, "bets"),
      where("matchId", "in", matchIds),
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const newBetsMap = {};
      const userIds = new Set();

      snapshot.forEach((d) => {
        const data = { id: d.id, ...d.data() };
        if (!newBetsMap[data.matchId]) {
          newBetsMap[data.matchId] = [];
        }
        newBetsMap[data.matchId].push(data);
        userIds.add(data.userId);
      });

      setBetsMap(newBetsMap);

      // Fetch user profiles for avatars and names
      const usersMap = {};
      for (const uid of userIds) {
        if (betUsers[uid]) {
          usersMap[uid] = betUsers[uid];
          continue;
        }
        try {
          const userSnap = await getDoc(doc(db, "users", uid));
          if (userSnap.exists()) {
            const u = userSnap.data();
            usersMap[uid] = {
              displayName: u.displayName || "Unknown",
              photoURL: u.photoURL || null,
            };
          }
        } catch {
          usersMap[uid] = { displayName: "Unknown", photoURL: null };
        }
      }
      setBetUsers((prev) => ({ ...prev, ...usersMap }));
    });

    return () => unsubscribe();
  }, [liveMatches]);

  // ─── Helper: Calculate bet distribution for a match ────────
  const getBetStats = (match, matchBets = []) => {
    if (!match || matchBets.length === 0) {
      return {
        teamACount: 0,
        teamBCount: 0,
        teamAPool: 0,
        teamBPool: 0,
        teamAPercent: 50,
        teamBPercent: 50,
        totalBets: 0,
        totalPool: 0,
      };
    }

    const teamABets = matchBets.filter(
      (b) => b.team.toString() === match.teamA.toString(),
    );
    const teamBBets = matchBets.filter(
      (b) => b.team.toString() === match.teamB.toString(),
    );

    const teamAPool = teamABets.reduce((sum, b) => sum + b.points, 0);
    const teamBPool = teamBBets.reduce((sum, b) => sum + b.points, 0);
    const totalPool = teamAPool + teamBPool;

    const teamAPercent =
      totalPool > 0 ? Math.round((teamAPool / totalPool) * 100) : 50;
    const teamBPercent = totalPool > 0 ? 100 - teamAPercent : 50;

    return {
      teamACount: teamABets.length,
      teamBCount: teamBBets.length,
      teamAPool,
      teamBPool,
      teamAPercent,
      teamBPercent,
      totalBets: matchBets.length,
      totalPool,
    };
  };

  // ─── Avatar helper ───────────────────────────────────────────
  const renderUserAvatar = (userId) => {
    const u = betUsers[userId];
    if (u?.photoURL) {
      return (
        <img
          src={u.photoURL}
          alt={u.displayName}
          className="size-8 rounded-full object-cover"
          referrerPolicy="no-referrer"
        />
      );
    }
    const initials = (u?.displayName || "?")
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
    return (
      <div className="size-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-[10px]">
        {initials}
      </div>
    );
  };

  // ─── No live match state ─────────────────────────────────────
  if (liveMatches.length === 0) {
    return (
      <div className="flex flex-col w-full h-full">
        <TopHeader title="Live Match" />
        <main className="flex-1 overflow-y-auto custom-scrollbar flex flex-col items-center justify-center text-center p-12 opacity-50">
          <span className="material-symbols-outlined text-5xl mb-3">
            sports_cricket
          </span>
          <p className="font-semibold">No live match right now</p>
          <p className="text-sm text-slate-500 mt-1">
            Check back when a match starts!
          </p>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full h-full">
      <TopHeader title="Live Match" />

      <main className="flex-1 overflow-y-auto custom-scrollbar w-full py-4 max-w-md mx-auto space-y-12">
        {liveMatches.map((match) => {
          const matchBets = betsMap[match.id] || [];
          const betStats = getBetStats(match, matchBets);

          return (
            <div key={match.id} className="space-y-5 border-b border-slate-200 dark:border-primary/10 pb-10 last:border-0 last:pb-0">
              {/* Match Hero Card */}
              <div className="px-4">
                <div className="card-base !p-0 overflow-hidden relative border-0 shadow-xl">
                  {/* Dark gradient background */}
                  <div className="absolute inset-0 z-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" />
                  <div
                    className="absolute inset-0 opacity-15 pointer-events-none z-[1]"
                    style={{
                      background:
                        "radial-gradient(circle at 30% 50%, var(--color-primary), transparent 60%), radial-gradient(circle at 70% 50%, var(--color-primary), transparent 60%)",
                    }}
                  />

                  <div className="relative z-20 p-6 flex flex-col min-h-[180px]">
                    {/* Top row: LIVE badge + venue */}
                    <div className="flex justify-between items-start">
                      <span className="tag-live backdrop-blur-sm bg-red-500/40 text-red-100 border border-red-500/50">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />{" "}
                        LIVE
                      </span>
                      <div className="text-right">
                        <p className="text-[10px] text-slate-400 uppercase">
                          {match.venue}
                        </p>
                        <p className="text-[10px] text-slate-500">
                          {match.date} • {match.time}
                        </p>
                      </div>
                    </div>

                    {/* Teams */}
                    <div className="flex items-center justify-center gap-8 mt-auto pt-6">
                      <div className="flex flex-col items-center gap-2">
                        <img
                          src={getTeamLogo(match.teamA)}
                          alt={TEAM_SHORT_NAMES[match.teamA]}
                          className="size-16 object-contain drop-shadow-lg bg-white rounded-full p-1.5 border border-white/20"
                        />
                        <span className="text-white font-bold text-sm">
                          {TEAM_SHORT_NAMES[match.teamA] || match.teamA}
                        </span>
                      </div>

                      <span className="text-xl font-black text-slate-500 italic">
                        VS
                      </span>

                      <div className="flex flex-col items-center gap-2">
                        <img
                          src={getTeamLogo(match.teamB)}
                          alt={TEAM_SHORT_NAMES[match.teamB]}
                          className="size-16 object-contain drop-shadow-lg bg-white rounded-full p-1.5 border border-white/20"
                        />
                        <span className="text-white font-bold text-sm">
                          {TEAM_SHORT_NAMES[match.teamB] || match.teamB}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bet Distribution Bar */}
              <div className="px-4">
                <div className="bg-white dark:bg-primary/5 border border-slate-200 dark:border-primary/10 rounded-xl p-4 shadow-sm">
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-2">
                      <img
                        src={getTeamLogo(match.teamA)}
                        alt=""
                        className="size-5 rounded-full object-contain bg-white"
                      />
                      <span className="text-xs font-bold text-primary">
                        {TEAM_SHORT_NAMES[match.teamA]} ({betStats.teamAPercent}%)
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                        ({betStats.teamBPercent}%) {TEAM_SHORT_NAMES[match.teamB]}
                      </span>
                      <img
                        src={getTeamLogo(match.teamB)}
                        alt=""
                        className="size-5 rounded-full object-contain bg-white"
                      />
                    </div>
                  </div>
                  <div className="w-full h-2.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden flex">
                    <div
                      className="bg-primary h-full rounded-l-full transition-all duration-500"
                      style={{ width: `${betStats.teamAPercent}%` }}
                    />
                    <div
                      className="bg-slate-400 h-full rounded-r-full transition-all duration-500"
                      style={{ width: `${betStats.teamBPercent}%` }}
                    />
                  </div>
                  <div className="flex justify-between mt-2">
                    <span className="text-[10px] text-slate-500">
                      {betStats.teamAPool?.toLocaleString()} pts
                    </span>
                    <span className="text-[10px] text-slate-500">
                      {betStats.teamBPool?.toLocaleString()} pts
                    </span>
                  </div>
                  <p className="text-[10px] text-center text-slate-500 mt-2 uppercase tracking-wider">
                    Community Bet Distribution •{" "}
                    {betStats.totalPool?.toLocaleString()} pts total
                  </p>
                </div>
              </div>

              {/* Live Predictions Table */}
              <section className="px-4">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
                    Live Predictions
                  </h4>
                  <span className="text-[10px] bg-primary/10 text-primary px-2 py-1 rounded font-bold">
                    {betStats.totalBets} {betStats.totalBets === 1 ? "Bet" : "Bets"}
                  </span>
                </div>

                {matchBets.length === 0 ? (
                  <div className="text-center py-8 opacity-50 bg-white dark:bg-primary/5 rounded-xl border border-dashed border-slate-300 dark:border-primary/20">
                    <span className="material-symbols-outlined text-3xl mb-2">
                      casino
                    </span>
                    <p className="text-sm">No bets placed yet</p>
                  </div>
                ) : (
                  <div className="bg-white dark:bg-primary/5 border border-slate-200 dark:border-primary/10 rounded-xl overflow-hidden shadow-sm">
                    {/* Table Header */}
                    <div className="grid grid-cols-12 bg-slate-50 dark:bg-primary/10 border-b border-slate-200 dark:border-primary/10 p-3 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                      <div className="col-span-5">Player</div>
                      <div className="col-span-4 text-center">Pick</div>
                      <div className="col-span-3 text-right">Pot</div>
                    </div>

                    {/* Bet Rows */}
                    <div className="flex flex-col divide-y divide-slate-100 dark:divide-primary/10">
                      {matchBets.map((bet) => {
                        const userName = betUsers[bet.userId]?.displayName || "...";
                        const isMe = user?.uid === bet.userId;

                        return (
                          <div
                            key={bet.id}
                            className={`grid grid-cols-12 p-3 items-center ${isMe ? "bg-primary/10" : "hover:bg-primary/5"} transition-colors`}
                          >
                            {/* Player */}
                            <div className="col-span-5 flex items-center gap-2 min-w-0">
                              {renderUserAvatar(bet.userId)}
                              <span
                                className={`text-sm font-medium truncate ${isMe ? "text-primary font-bold" : ""}`}
                              >
                                {isMe ? "You" : userName}
                              </span>
                            </div>

                            {/* Pick — team logo */}
                            <div className="col-span-4 flex justify-center">
                              <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-primary/10 px-2 py-1 rounded-full">
                                <img
                                  src={getTeamLogo(bet.team)}
                                  alt={TEAM_SHORT_NAMES[bet.team]}
                                  className="size-5 rounded-full object-contain bg-white"
                                />
                                <span className="text-[10px] font-bold">
                                  {TEAM_SHORT_NAMES[bet.team] || bet.team}
                                </span>
                              </div>
                            </div>

                            {/* Pot */}
                            <div className="col-span-3 text-right flex flex-col items-end">
                              <div className="flex items-baseline gap-0.5">
                                <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                                  {bet.points.toLocaleString()}
                                </span>
                                <span className="text-[10px] text-slate-500">
                                  pts
                                </span>
                              </div>
                              {(() => {
                                const isTeamA = bet.team.toString() === match.teamA.toString();
                                const teamPool = isTeamA ? betStats.teamAPool : betStats.teamBPool;
                                const oppositePool = isTeamA ? betStats.teamBPool : betStats.teamAPool;
                                
                                if (teamPool > 0 && oppositePool > 0) {
                                  const potentialProfit = Math.floor((bet.points / teamPool) * oppositePool);
                                  return (
                                    <span className="text-[10px] font-bold text-emerald-500 whitespace-nowrap">
                                      +{potentialProfit.toLocaleString()}
                                    </span>
                                  );
                                }
                                return null;
                              })()}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </section>
            </div>
          );
        })}
      </main>
    </div>
  );
}
