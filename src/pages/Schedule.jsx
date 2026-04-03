import React, { useState, useEffect, useMemo } from "react";
import { format } from "date-fns";
import { collection, query, orderBy, onSnapshot, where } from "firebase/firestore";
import { db } from "../firebase";
import useAuthStore from "../store/useAuthStore";
import TopHeader from "../components/ui/TopHeader";
import MatchCard from "../components/ui/MatchCard";

export default function Schedule() {
    const [activeTab, setActiveTab] = useState("upcoming");
    const [matches, setMatches] = useState([]);
    const [userBets, setUserBets] = useState({});
    const user = useAuthStore(state => state.user);

    // Fetch matches from Firestore
    useEffect(() => {
        const q = query(collection(db, "matches"), orderBy("matchStartTime", "asc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const matchesData = [];
            snapshot.forEach((doc) => {
                const data = doc.data();
                // Format Firestore Timestamp into date and time strings
                const dateObj = data.matchStartTime.toDate();
                const dateStr = format(dateObj, "MMM d, yyyy");
                const timeStr = format(dateObj, "h:mm a");

                matchesData.push({
                    id: doc.id,
                    ...data,
                    date: dateStr,
                    time: timeStr
                });
            });
            setMatches(matchesData);
        });

        return () => unsubscribe();
    }, []);

    // Fetch current user's bets
    useEffect(() => {
        if (!user) {
            setUserBets({});
            return;
        }
        
        const q = query(collection(db, "bets"), where("userId", "==", user.uid));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const betsData = {};
            snapshot.forEach((doc) => {
                const data = doc.data();
                betsData[data.matchId] = {
                    id: doc.id,
                    ...data
                };
            });
            setUserBets(betsData);
        });

        return () => unsubscribe();
    }, [user]);

    // Filter the matches based on the selected tab
    const filteredMatches = useMemo(() => {
        return matches.filter((match) => {
            if (activeTab === "upcoming") {
                return match.status === "upcoming" || match.status === "UPCOMING";
            }
            return match.status === "finished" || match.status === "FINAL";
        });
    }, [activeTab, matches]);

    // Group the matches by date for display purposes
    const matchesByDate = useMemo(() => {
        const grouped = {};
        filteredMatches.forEach(match => {
            if (!grouped[match.date]) {
                grouped[match.date] = [];
            }
            grouped[match.date].push(match);
        });
        return grouped;
    }, [filteredMatches])

    return (
        <div className="flex flex-col w-full h-full">
            <TopHeader title="Match Center">
                {/* Navigation Tabs (Upcoming / Past) */}
                <div className="px-4">
                    <div className="flex border-b border-slate-200 dark:border-primary/20">
                        <button
                            onClick={() => setActiveTab("upcoming")}
                            className={`flex-1 flex flex-col items-center justify-center border-b-2 pb-3 pt-2 ${activeTab === "upcoming" ? "border-primary" : "border-transparent"
                                }`}
                        >
                            <span className={`text-sm font-bold ${activeTab === "upcoming" ? "text-primary" : "text-slate-500"}`}>
                                Upcoming
                            </span>
                        </button>
                        <button
                            onClick={() => setActiveTab("past")}
                            className={`flex-1 flex flex-col items-center justify-center border-b-2 pb-3 pt-2 ${activeTab === "past" ? "border-primary" : "border-transparent"
                                }`}
                        >
                            <span className={`text-sm font-bold ${activeTab === "past" ? "text-primary dark:text-primary" : "text-slate-500 dark:text-slate-400"}`}>
                                Past
                            </span>
                        </button>
                    </div>
                </div>
            </TopHeader>

            {/* Main Content Area */}
            <main className="flex-1 overflow-y-auto custom-scrollbar w-full pb-6 max-w-md mx-auto">

                {Object.entries(matchesByDate).length === 0 && (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-12 opacity-50">
                        <span className="material-symbols-outlined text-4xl mb-2">calendar_today</span>
                        <p>No matches available.</p>
                    </div>
                )}

                {Object.entries(matchesByDate).map(([date, matches], index) => (
                    <React.Fragment key={date}>
                        {/* Date Header string */}
                        <div className={`px-4 pt-${index === 0 ? '6' : '8'} pb-2`}>
                            <h3 className="text-xs font-bold uppercase tracking-widest text-primary">
                                {date}
                            </h3>
                        </div>

                        {/* Matches list for that date */}
                        <div className={`px-4 ${activeTab === 'past' ? 'space-y-3' : 'space-y-3'}`}>
                            {matches.map((match) => (
                                <MatchCard key={match.id} match={match} userBet={userBets[match.id]} />
                            ))}
                        </div>
                    </React.Fragment>
                ))}

            </main>
        </div>
    );
}
