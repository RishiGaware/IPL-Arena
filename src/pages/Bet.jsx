import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import {
    collection,
    query,
    where,
    orderBy,
    limit,
    onSnapshot,
    doc,
    addDoc,
    updateDoc,
    deleteDoc,
    increment,
    serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";
import useAuthStore from "../store/useAuthStore";
import TopHeader from "../components/ui/TopHeader";
import WalletCard from "../components/ui/WalletCard";
import { getTeamLogo, getTeamName, TEAM_SHORT_NAMES } from "../constants/teamLogos";

export default function Bet() {
    const user = useAuthStore((state) => state.user);

    // Live data from Firestore
    const [nextMatch, setNextMatch] = useState(null);
    const [userPoints, setUserPoints] = useState(0);
    const [existingBet, setExistingBet] = useState(null);

    // Form state
    const [selectedTeam, setSelectedTeam] = useState(null);
    const [betAmount, setBetAmount] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [error, setError] = useState("");

    // ─── Fetch the first upcoming match ─────────────────────────
    useEffect(() => {
        const q = query(
            collection(db, "matches"),
            where("status", "==", "upcoming"),
            orderBy("matchStartTime", "asc"),
            limit(1),
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            if (!snapshot.empty) {
                const docSnap = snapshot.docs[0];
                const data = docSnap.data();
                const dateObj = data.matchStartTime.toDate();

                setNextMatch({
                    id: docSnap.id,
                    ...data,
                    date: format(dateObj, "EEE, MMM d"),
                    time: format(dateObj, "h:mm a"),
                });
            } else {
                setNextMatch(null);
            }
        });

        return () => unsubscribe();
    }, []);

    // ─── Fetch user's points balance in real-time ───────────────
    useEffect(() => {
        if (!user) return;

        const unsubscribe = onSnapshot(doc(db, "users", user.uid), (docSnap) => {
            if (docSnap.exists()) {
                setUserPoints(docSnap.data().points || 0);
            }
        });

        return () => unsubscribe();
    }, [user]);

    // ─── Fetch user's existing bet for this match ───────────────
    useEffect(() => {
        if (!user || !nextMatch) {
            setExistingBet(null);
            return;
        }

        const q = query(
            collection(db, "bets"),
            where("userId", "==", user.uid),
            where("matchId", "==", nextMatch.id),
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            if (!snapshot.empty) {
                const betDoc = snapshot.docs[0];
                const betData = { id: betDoc.id, ...betDoc.data() };
                setExistingBet(betData);
                // Pre-fill form with existing bet
                setSelectedTeam(betData.team);
                setBetAmount(betData.points.toString());
            } else {
                setExistingBet(null);
                setSelectedTeam(null);
                setBetAmount("");
            }
        });

        return () => unsubscribe();
    }, [user, nextMatch]);

    // ─── Quick-add buttons ──────────────────────────────────────
    const handleQuickAdd = (amount) => {
        const current = Number.parseInt(betAmount) || 0;
        setBetAmount((current + amount).toString());
    };

    // ─── Place or Update Bet ────────────────────────────────────
    const handlePlaceBet = async () => {
        if (!selectedTeam || !betAmount || !nextMatch || !user) return;

        const amount = Number.parseInt(betAmount);
        if (amount < 50) {
            setError("Minimum bet is 50 points");
            return;
        }

        // Calculate the effective balance (current points + any existing bet points that would be refunded)
        const effectiveBalance = userPoints + (existingBet ? existingBet.points : 0);

        if (amount > effectiveBalance) {
            setError("Insufficient balance");
            return;
        }

        setError("");
        setIsSubmitting(true);

        try {
            if (existingBet) {
                // ── UPDATE existing bet ──
                // 1. Refund old bet points, then deduct new amount
                const pointsDiff = existingBet.points - amount;

                await updateDoc(doc(db, "users", user.uid), {
                    points: increment(pointsDiff),
                });

                // 2. Update the bet document
                await updateDoc(doc(db, "bets", existingBet.id), {
                    team: selectedTeam,
                    points: amount,
                    updatedAt: serverTimestamp(),
                });

                // 3. Log the update transaction (the net difference)
                if (pointsDiff !== 0) {
                    await addDoc(collection(db, "transactions"), {
                        userId: user.uid,
                        type: "bet_place",
                        points: -amount,
                        refundedPoints: existingBet.points,
                        matchId: nextMatch.id,
                        betId: existingBet.id,
                        note: "bet_update",
                        createdAt: serverTimestamp(),
                    });
                }
            } else {
                // ── PLACE new bet ──
                // 1. Deduct points from user
                await updateDoc(doc(db, "users", user.uid), {
                    points: increment(-amount),
                });

                // 2. Create the bet document
                const betRef = await addDoc(collection(db, "bets"), {
                    userId: user.uid,
                    matchId: nextMatch.id,
                    team: selectedTeam,
                    points: amount,
                    result: "pending",
                    createdAt: serverTimestamp(),
                });

                // 3. Log the transaction
                await addDoc(collection(db, "transactions"), {
                    userId: user.uid,
                    type: "bet_place",
                    points: -amount,
                    matchId: nextMatch.id,
                    betId: betRef.id,
                    createdAt: serverTimestamp(),
                });
            }

            // Show success
            setIsSuccess(true);
            setTimeout(() => setIsSuccess(false), 2000);
        } catch (err) {
            console.error("Bet failed:", err);
            setError("Something went wrong. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    // ─── Remove existing bet ────────────────────────────────────
    const handleRemoveBet = async () => {
        if (!existingBet || !user) return;

        setIsSubmitting(true);
        try {
            // 1. Refund points
            await updateDoc(doc(db, "users", user.uid), {
                points: increment(existingBet.points),
            });

            // 2. Log refund transaction
            await addDoc(collection(db, "transactions"), {
                userId: user.uid,
                type: "bet_place",
                points: existingBet.points,
                matchId: nextMatch.id,
                betId: existingBet.id,
                note: "bet_removed",
                createdAt: serverTimestamp(),
            });

            // 3. Delete the bet
            await deleteDoc(doc(db, "bets", existingBet.id));

            setSelectedTeam(null);
            setBetAmount("");
        } catch (err) {
            console.error("Remove bet failed:", err);
            setError("Could not remove bet. Try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    // ─── No upcoming match state ────────────────────────────────
    if (!nextMatch) {
        return (
            <div className="flex flex-col w-full h-full">
                <TopHeader title="Place Your Bet" />
                <main className="flex-1 overflow-y-auto custom-scrollbar flex flex-col items-center justify-center text-center p-12 opacity-50">
                    <span className="material-symbols-outlined text-5xl mb-3">sports_cricket</span>
                    <p className="font-semibold">No upcoming matches</p>
                    <p className="text-sm text-slate-500 mt-1">Check back soon!</p>
                </main>
            </div>
        );
    }

    const hasChanges = existingBet
        ? selectedTeam !== existingBet.team || betAmount !== existingBet.points.toString()
        : selectedTeam && betAmount && Number.parseInt(betAmount) >= 50;

    const buttonLabel = () => {
        if (!selectedTeam || !betAmount || Number.parseInt(betAmount) < 50) return "Update Bet Details";
        if (isSubmitting) return "Processing...";
        if (existingBet) return "Update Bet";
        return "Place Bet Now";
    };

    return (
        <div className="flex flex-col w-full h-full relative">
            <TopHeader title="Place Your Bet" />

            <main className="flex-1 overflow-y-auto custom-scrollbar w-full pb-24 max-w-md mx-auto space-y-6 pt-4">

                {/* Match Highlight Card */}
                <div className="px-4">
                    <div className="card-base text-center !p-6 flex flex-col items-center justify-center relative overflow-hidden">
                        {/* Background graphic effect */}
                        <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ background: 'radial-gradient(circle at center, var(--color-primary), transparent 70%)' }}></div>

                        <span className="tag-primary absolute top-4 left-4 !text-[10px]">UPCOMING</span>
                        <span className="text-[10px] font-medium text-slate-500 absolute top-4 right-4">
                            {nextMatch.date} • {nextMatch.time}
                        </span>

                        <div className="flex items-center gap-6 mt-6 z-10 w-full justify-center">
                            <div className="flex flex-col items-center gap-1">
                                <img
                                    src={getTeamLogo(nextMatch.teamA)}
                                    alt={getTeamName(nextMatch.teamA)}
                                    className="size-16 object-contain drop-shadow-md bg-white rounded-full p-1 border border-slate-200"
                                />
                                <span className="text-xs font-bold mt-1">
                                    {TEAM_SHORT_NAMES[nextMatch.teamA] || nextMatch.teamA}
                                </span>
                            </div>

                            <span className="text-xl font-black text-slate-400 italic">VS</span>

                            <div className="flex flex-col items-center gap-1">
                                <img
                                    src={getTeamLogo(nextMatch.teamB)}
                                    alt={getTeamName(nextMatch.teamB)}
                                    className="size-16 object-contain drop-shadow-md bg-white rounded-full p-1 border border-slate-200"
                                />
                                <span className="text-xs font-bold mt-1">
                                    {TEAM_SHORT_NAMES[nextMatch.teamB] || nextMatch.teamB}
                                </span>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 text-slate-500 mt-4 z-10">
                            <span className="material-symbols-outlined text-[1rem]">location_on</span>
                            <span className="text-[10px]">{nextMatch.venue}</span>
                        </div>
                    </div>
                </div>

                {/* Wallet Balance */}
                <div className="px-4">
                    <WalletCard balance={userPoints} showRedeemBtn={false} />
                </div>

                <div className="px-4 space-y-6">
                    {/* Team Selection */}
                    <section>
                        <h4 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-3 px-1">Select Winning Team</h4>
                        <div className="grid grid-cols-2 gap-4">
                            {/* Team A Radio Card */}
                            <label className={`relative flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all cursor-pointer ${selectedTeam === nextMatch.teamA
                                ? 'border-primary bg-primary/5'
                                : 'border-slate-200 dark:border-primary/10 bg-slate-50 dark:bg-primary/5'
                                }`}>
                                <input
                                    type="radio"
                                    name="team"
                                    className="hidden"
                                    checked={selectedTeam === nextMatch.teamA}
                                    onChange={() => setSelectedTeam(nextMatch.teamA)}
                                />
                                <div className="size-12 mb-2 rounded-full bg-white flex items-center justify-center p-1 border border-slate-200 shadow-sm">
                                    <img alt={getTeamName(nextMatch.teamA)} className="h-full w-full object-contain" src={getTeamLogo(nextMatch.teamA)} />
                                </div>
                                <span className="font-bold text-sm">{TEAM_SHORT_NAMES[nextMatch.teamA] || nextMatch.teamA}</span>

                                {selectedTeam === nextMatch.teamA && (
                                    <div className="absolute top-2 right-2 text-primary">
                                        <span className="material-symbols-outlined font-variation-settings-['FILL'_1] text-sm">check_circle</span>
                                    </div>
                                )}
                            </label>

                            {/* Team B Radio Card */}
                            <label className={`relative flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all cursor-pointer ${selectedTeam === nextMatch.teamB
                                ? 'border-primary bg-primary/5'
                                : 'border-slate-200 dark:border-primary/10 bg-slate-50 dark:bg-primary/5'
                                }`}>
                                <input
                                    type="radio"
                                    name="team"
                                    className="hidden"
                                    checked={selectedTeam === nextMatch.teamB}
                                    onChange={() => setSelectedTeam(nextMatch.teamB)}
                                />
                                <div className="size-12 mb-2 rounded-full bg-white flex items-center justify-center p-1 border border-slate-200 shadow-sm">
                                    <img alt={getTeamName(nextMatch.teamB)} className="h-full w-full object-contain" src={getTeamLogo(nextMatch.teamB)} />
                                </div>
                                <span className="font-bold text-sm">{TEAM_SHORT_NAMES[nextMatch.teamB] || nextMatch.teamB}</span>

                                {selectedTeam === nextMatch.teamB && (
                                    <div className="absolute top-2 right-2 text-primary">
                                        <span className="material-symbols-outlined font-variation-settings-['FILL'_1] text-sm">check_circle</span>
                                    </div>
                                )}
                            </label>
                        </div>
                    </section>

                    {/* Bet Input */}
                    <section>
                        <div className="flex justify-between items-center mb-3 px-1">
                            <h4 className="text-sm font-bold uppercase tracking-wider text-slate-500">Enter Bet Amount</h4>
                            <span className="text-xs font-medium text-slate-400">Min: 50 pts</span>
                        </div>

                        <div className="relative">
                            <input
                                type="number"
                                value={betAmount}
                                onChange={(e) => {
                                    setBetAmount(e.target.value);
                                    setError("");
                                }}
                                placeholder="0"
                                className="w-full bg-slate-100 dark:bg-primary/5 border-2 border-slate-200 dark:border-primary/20 rounded-xl py-4 px-5 text-2xl font-bold focus:border-primary focus:ring-primary focus:outline-none transition-all text-slate-900 dark:text-slate-100"
                            />
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 flex gap-2">
                                <button type="button" onClick={() => handleQuickAdd(100)} className="bg-slate-200 dark:bg-primary/10 px-3 py-1 rounded-lg text-xs font-bold hover:bg-slate-300 dark:hover:bg-primary/20 transition-colors">+100</button>
                                <button type="button" onClick={() => handleQuickAdd(500)} className="bg-slate-200 dark:bg-primary/10 px-3 py-1 rounded-lg text-xs font-bold hover:bg-slate-300 dark:hover:bg-primary/20 transition-colors">+500</button>
                            </div>
                        </div>

                        {/* Error message */}
                        {error && (
                            <p className="text-xs text-red-500 font-medium mt-2 px-1">{error}</p>
                        )}
                    </section>

                    {/* Submit Button */}
                    <button
                        onClick={handlePlaceBet}
                        disabled={!hasChanges || isSubmitting}
                        className="btn-primary mt-8 disabled:opacity-50 disabled:cursor-not-allowed group"
                    >
                        <span className="material-symbols-outlined font-variation-settings-['FILL'_1] group-disabled:hidden">local_fire_department</span>
                        {buttonLabel()}
                    </button>

                    {/* Remove bet option */}
                    {existingBet && (
                        <button
                            onClick={handleRemoveBet}
                            disabled={isSubmitting}
                            className="w-full text-center text-sm font-medium text-red-500 hover:text-red-600 transition-colors py-2 disabled:opacity-50"
                        >
                            Remove Bet & Get Refund
                        </button>
                    )}

                    <p className="text-[10px] text-center text-slate-500 px-8 mt-4 leading-relaxed">
                        By placing this bet, you agree to our Terms of Service. Please play responsibly.
                    </p>
                </div>
            </main>

            {/* Success Modal Overlay */}
            {isSuccess && (
                <div className="absolute inset-0 z-50 bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-sm flex flex-col items-center justify-center p-8 animate-in fade-in duration-200">
                    <div className="relative">
                        <div className="size-24 rounded-full bg-primary/20 flex items-center justify-center animate-bounce">
                            <span className="material-symbols-outlined font-variation-settings-['FILL'_1] text-primary text-6xl">check_circle</span>
                        </div>
                    </div>
                    <h2 className="text-2xl font-black mt-8 text-center text-slate-900 dark:text-slate-100">
                        {existingBet ? "Bet Updated!" : "Bet Placed!"}
                    </h2>
                    <p className="text-slate-500 text-center mt-2 max-w-[240px]">Good luck! Your points have been locked.</p>
                </div>
            )}
        </div>
    );
}
