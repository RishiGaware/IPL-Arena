/**
 * settleMatch.js
 * ──────────────
 * Settles a finished match: marks the winner, resolves all bets,
 * and redistributes points from losers' pool to winners proportionally.
 *
 * Usage:
 *   node scripts/settleMatch.js <matchId> <winnerTeamCode>
 *
 * Example:
 *   node scripts/settleMatch.js abc123def456 201
 *
 * What it does:
 *   1. Sets match status → "finished" and winner → <winnerTeamCode>
 *   2. Fetches all bets for that match
 *   3. Splits bets into winners and losers
 *   4. Calculates the losers' total pool
 *   5. Distributes the losers' pool to winners proportionally
 *      (based on each winner's bet size relative to total winning bets)
 *   6. Updates each bet result → "won" or "lost"
 *   7. Credits winners: their original bet + proportional share of losers' pool
 *   8. Logs bet_win / bet_loss transactions
 *
 * Edge cases:
 *   - If nobody bet → just marks match finished, no point movement
 *   - If all bets are on the winner → everyone gets their bet back (no losers' pool)
 *   - If all bets are on the loser → all lose, no winners to pay out
 *
 * Requirements:
 *   - .env file at project root with VITE_FIREBASE_* variables
 */

/* global process */

import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  addDoc,
  increment,
  Timestamp,
  serverTimestamp,
} from "firebase/firestore";

// ─── Resolve paths ───────────────────────────────────────────────
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, "..");

// ─── Load .env manually ─────────────────────────────────────────
function loadEnv() {
  const envPath = resolve(ROOT, ".env");
  const envContent = readFileSync(envPath, "utf-8");
  const envVars = {};

  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    const value = trimmed.slice(eqIndex + 1).trim();
    envVars[key] = value;
  }

  return envVars;
}

const env = loadEnv();

// ─── Initialize Firebase ─────────────────────────────────────────
const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ─── Main settlement logic ───────────────────────────────────────
async function settleMatch(matchId, winnerTeamCode) {
  console.log("━".repeat(55));
  console.log("  ⚖️  Match Settlement Engine");
  console.log("━".repeat(55));
  console.log(`  Project:  ${firebaseConfig.projectId}`);
  console.log(`  Match ID: ${matchId}`);
  console.log(`  Winner:   Team ${winnerTeamCode}`);
  console.log("━".repeat(55));

  // ── 1. Validate the match exists ──────────────────────────────
  const matchRef = doc(db, "matches", matchId);
  const matchSnap = await getDoc(matchRef);

  if (!matchSnap.exists()) {
    console.error(`\n❌ Match "${matchId}" not found in Firestore.`);
    process.exit(1);
  }

  const matchData = matchSnap.data();
  console.log(`\n🏏 Match: Team ${matchData.teamA} vs Team ${matchData.teamB}`);
  console.log(`   Venue:  ${matchData.venue}`);
  console.log(`   Status: ${matchData.status}`);

  if (matchData.status === "finished") {
    console.error("\n❌ This match has already been settled!");
    process.exit(1);
  }

  // Validate winner is one of the teams
  const winner = winnerTeamCode.toString();
  if (winner !== matchData.teamA.toString() && winner !== matchData.teamB.toString()) {
    console.error(`\n❌ Winner "${winner}" is not a team in this match (${matchData.teamA} vs ${matchData.teamB}).`);
    process.exit(1);
  }

  // ── 2. Update match status to finished ────────────────────────
  await updateDoc(matchRef, {
    status: "finished",
    winner: winner,
    settledAt: serverTimestamp(),
  });
  console.log(`\n✅ Match status updated to "finished", winner: ${winner}`);

  // ── 3. Fetch all bets for this match ──────────────────────────
  const betsQuery = query(
    collection(db, "bets"),
    where("matchId", "==", matchId),
  );
  const betsSnap = await getDocs(betsQuery);

  if (betsSnap.empty) {
    console.log("\n📭 No bets placed on this match. Nothing to settle.");
    process.exit(0);
  }

  const allBets = [];
  betsSnap.forEach((d) => allBets.push({ id: d.id, ...d.data() }));

  console.log(`\n📊 Total bets: ${allBets.length}`);

  // ── 4. Split into winners and losers ──────────────────────────
  const winningBets = allBets.filter((b) => b.team.toString() === winner);
  const losingBets = allBets.filter((b) => b.team.toString() !== winner);

  const totalWinnerPool = winningBets.reduce((sum, b) => sum + b.points, 0);
  const totalLoserPool = losingBets.reduce((sum, b) => sum + b.points, 0);

  console.log(`   🏆 Winning bets: ${winningBets.length} (total pool: ${totalWinnerPool} pts)`);
  console.log(`   💀 Losing bets:  ${losingBets.length} (total pool: ${totalLoserPool} pts)`);

  // ── 5. Process losing bets ────────────────────────────────────
  console.log("\n💀 Processing losing bets...");
  for (const bet of losingBets) {
    // Update bet result
    await updateDoc(doc(db, "bets", bet.id), {
      result: "lost",
      settledAt: serverTimestamp(),
    });

    // Log bet_loss transaction
    await addDoc(collection(db, "transactions"), {
      userId: bet.userId,
      type: "bet_loss",
      points: -bet.points,
      matchId: matchId,
      betId: bet.id,
      createdAt: serverTimestamp(),
    });

    console.log(`   ❌ User ${bet.userId} lost ${bet.points} pts (bet: ${bet.id})`);
  }

  // ── 6. Process winning bets ───────────────────────────────────
  console.log("\n🏆 Processing winning bets...");

  if (winningBets.length === 0) {
    console.log("   No winners — entire loser pool is forfeited (stays deducted).");
  } else {
    for (const bet of winningBets) {
      // Calculate proportional share of losers' pool
      // winShare = (bet.points / totalWinnerPool) * totalLoserPool
      const winShare = totalWinnerPool > 0
        ? Math.floor((bet.points / totalWinnerPool) * totalLoserPool)
        : 0;

      // Total payout = original bet returned + share of losers' pool
      const totalPayout = bet.points + winShare;

      // Update bet result
      await updateDoc(doc(db, "bets", bet.id), {
        result: "won",
        winnings: totalPayout,
        settledAt: serverTimestamp(),
      });

      // Credit user's balance
      await updateDoc(doc(db, "users", bet.userId), {
        points: increment(totalPayout),
      });

      // Log bet_win transaction
      await addDoc(collection(db, "transactions"), {
        userId: bet.userId,
        type: "bet_win",
        points: totalPayout,
        matchId: matchId,
        betId: bet.id,
        originalBet: bet.points,
        winShare: winShare,
        createdAt: serverTimestamp(),
      });

      console.log(`   ✅ User ${bet.userId}: bet ${bet.points} → won ${totalPayout} pts (+${winShare} from losers' pool)`);
    }
  }

  // ── 7. Summary ────────────────────────────────────────────────
  console.log("\n" + "━".repeat(55));
  console.log("  📋 SETTLEMENT SUMMARY");
  console.log("━".repeat(55));
  console.log(`  Match:          Team ${matchData.teamA} vs Team ${matchData.teamB}`);
  console.log(`  Winner:         Team ${winner}`);
  console.log(`  Total bets:     ${allBets.length}`);
  console.log(`  Winners:        ${winningBets.length} (${totalWinnerPool} pts bet)`);
  console.log(`  Losers:         ${losingBets.length} (${totalLoserPool} pts forfeited)`);
  console.log(`  Points moved:   ${totalLoserPool} pts redistributed`);
  console.log("━".repeat(55));
  console.log("\n🎉 Settlement complete!\n");
}

// ─── CLI Entry Point ─────────────────────────────────────────────
const args = process.argv.slice(2);

if (args.length < 2) {
  console.error("\n⚠️  Usage: node scripts/settleMatch.js <matchId> <winnerTeamCode>");
  console.error("   Example: node scripts/settleMatch.js abc123def456 201\n");
  console.error("   Team codes:");
  console.error("     201 = CSK, 202 = DC, 203 = GT, 204 = KKR, 205 = LSG");
  console.error("     206 = MI, 207 = PBKS, 208 = RCB, 209 = RR, 210 = SRH\n");
  process.exit(1);
}

const [matchId, winnerTeamCode] = args;

settleMatch(matchId, winnerTeamCode).catch((err) => {
  console.error("❌ Settlement failed:", err.message);
  console.error(err.stack);
  process.exit(1);
});
