import React, { useState, useEffect } from "react";
import { collection, query, orderBy, limit, onSnapshot, doc } from "firebase/firestore";
import { db } from "../firebase";
import useAuthStore from "../store/useAuthStore";
import TopHeader from "../components/ui/TopHeader";
import UserRow from "../components/ui/UserRow";
import WalletCard from "../components/ui/WalletCard";

export default function Leaderboard() {
    const user = useAuthStore((state) => state.user);
    const [users, setUsers] = useState([]);
    const [userPoints, setUserPoints] = useState(0);

    // Fetch top users ordered by points
    useEffect(() => {
        const q = query(
            collection(db, "users"),
            orderBy("points", "desc"),
            limit(50),
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const usersData = [];
            let rank = 1;
            snapshot.forEach((doc) => {
                usersData.push({
                    id: doc.id,
                    rank,
                    ...doc.data(),
                });
                rank++;
            });
            setUsers(usersData);
        });

        return () => unsubscribe();
    }, []);

    // Fetch current user's points in real-time
    useEffect(() => {
        if (!user) return;

        const unsubscribe = onSnapshot(doc(db, "users", user.uid), (docSnap) => {
            if (docSnap.exists()) {
                setUserPoints(docSnap.data().points || 0);
            }
        });

        return () => unsubscribe();
    }, [user]);

    // Check if we should show the podium (needs at least 2 users and different scores)
    const uniqueScores = new Set(users.map((u) => u.points));
    const showPodium = users.length > 1 && uniqueScores.size > 1;

    // Separate top 3 for the podium
    const top3 = showPodium ? users.slice(0, 3) : [];
    const rank1 = top3.find((u) => u.rank === 1);
    const rank2 = top3.find((u) => u.rank === 2);
    const rank3 = top3.find((u) => u.rank === 3);

    // The rest of the leaderboard
    const remainingUsers = showPodium ? users.slice(3) : users;

    // Helper for avatar rendering
    const renderAvatar = (userData, size = "size-16") => {
        if (userData.photoURL) {
            return (
                <img
                    className={`${size} rounded-full object-cover`}
                    alt={userData.displayName}
                    src={userData.photoURL}
                    referrerPolicy="no-referrer"
                />
            );
        }
        // Fallback: initials
        const initials = (userData.displayName || "?")
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2);
        return (
            <div className={`${size} rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold`}>
                {initials}
            </div>
        );
    };

    return (
        <div className="flex flex-col w-full h-full">
            <TopHeader title="Leaderboard">
                {/* Wallet Component inside header */}
                <div className="px-4 pb-4 max-w-md mx-auto w-full">
                    <WalletCard balance={userPoints} showRedeemBtn={false} />
                </div>
            </TopHeader>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto custom-scrollbar w-full px-4 py-6 space-y-4 max-w-md mx-auto">
                {/* Top 3 Podium Cards */}
                {showPodium && (
                    <div className="grid grid-cols-3 gap-3 items-end pb-4">

                        {/* Rank 2 */}
                        {rank2 && (
                            <div className="flex flex-col items-center gap-2">
                                <div className="relative">
                                    <div className="border-2 border-slate-400 p-0.5 rounded-full">
                                        {renderAvatar(rank2, "size-16")}
                                    </div>
                                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-slate-400 text-slate-900 rounded-full size-6 flex items-center justify-center text-xs font-bold">
                                        2
                                    </div>
                                </div>
                                <div className="text-center">
                                    <p className="text-xs font-bold truncate w-24">{rank2.displayName}</p>
                                    <p className="text-[10px] text-primary">{rank2.points.toLocaleString()} pts</p>
                                </div>
                            </div>
                        )}

                        {/* Rank 1 */}
                        {rank1 && (
                            <div className="flex flex-col items-center gap-2">
                                <div className="relative">
                                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-yellow-500 animate-bounce">
                                        <span className="material-symbols-outlined text-3xl font-variation-settings-['FILL'_1]">
                                            workspace_premium
                                        </span>
                                    </div>
                                    <div className="border-4 border-yellow-500 p-1 rounded-full">
                                        {renderAvatar(rank1, "size-20")}
                                    </div>
                                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-yellow-500 text-slate-900 rounded-full size-8 flex items-center justify-center text-sm font-bold">
                                        1
                                    </div>
                                </div>
                                <div className="text-center">
                                    <p className="text-sm font-black truncate w-28">{rank1.displayName}</p>
                                    <p className="text-xs font-bold text-primary">{rank1.points.toLocaleString()} pts</p>
                                </div>
                            </div>
                        )}

                        {/* Rank 3 */}
                        {rank3 && (
                            <div className="flex flex-col items-center gap-2">
                                <div className="relative">
                                    <div className="border-2 border-orange-600 p-0.5 rounded-full">
                                        {renderAvatar(rank3, "size-16")}
                                    </div>
                                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-orange-600 text-slate-900 rounded-full size-6 flex items-center justify-center text-xs font-bold">
                                        3
                                    </div>
                                </div>
                                <div className="text-center">
                                    <p className="text-xs font-bold truncate w-24">{rank3.displayName}</p>
                                    <p className="text-[10px] text-primary">{rank3.points.toLocaleString()} pts</p>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Leaderboard List */}
                <div className="space-y-2">
                    {remainingUsers.map((u) => (
                        <UserRow
                            key={u.id}
                            user={u}
                            type="leaderboard"
                            rank={u.rank}
                            isCurrentUser={user?.uid === u.id}
                        />
                    ))}
                </div>
            </main>
        </div>
    );
}
