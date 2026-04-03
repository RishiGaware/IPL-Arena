/**
 * seedMatches.js
 * ──────────────
 * Seeds the `matches` collection in Firestore from src/data/matches.json.
 *
 * Usage:
 *   node scripts/seedMatches.js          → seeds all matches
 *   node scripts/seedMatches.js --clear  → deletes existing matches first, then seeds
 *
 * Requirements:
 *   - .env file at project root with VITE_FIREBASE_* variables
 *   - `firebase` package installed (already a project dependency)
 */

/* global process */

import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  Timestamp,
} from "firebase/firestore";

// ─── Resolve paths ───────────────────────────────────────────────
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, "..");

// ─── Load .env manually (avoids adding dotenv dependency) ────────
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

// ─── Initialize Firebase (standalone, not using Vite's import.meta.env) ──
const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
};

// Validate that we have the required config
const missingKeys = Object.entries(firebaseConfig)
  .filter(([, v]) => !v || v.includes("your_"))
  .map(([k]) => k);

if (missingKeys.length > 0) {
  console.error("❌ Missing or placeholder Firebase config keys:");
  missingKeys.forEach((k) => console.error(`   • ${k}`));
  console.error(
    "\n   Please update your .env file with real Firebase credentials.",
  );
  process.exit(1);
}

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ─── Load matches JSON ───────────────────────────────────────────
const matchesPath = resolve(ROOT, "src", "data", "matches.json");
const matchesRaw = readFileSync(matchesPath, "utf-8");
const matches = JSON.parse(matchesRaw);

// ─── Clear existing matches (optional) ──────────────────────────
async function clearMatches() {
  console.log("🗑️  Clearing existing matches...");
  const snapshot = await getDocs(collection(db, "matches"));

  if (snapshot.empty) {
    console.log("   Collection is already empty.");
    return;
  }

  let count = 0;
  for (const docSnap of snapshot.docs) {
    await deleteDoc(doc(db, "matches", docSnap.id));
    count++;
  }
  console.log(`   Deleted ${count} existing match(es).`);
}

// ─── Seed matches ────────────────────────────────────────────────
async function seedMatches() {
  console.log(`\n🏏 Seeding ${matches.length} matches into Firestore...\n`);

  const now = Timestamp.now();

  for (const match of matches) {
    const matchDoc = {
      teamA: match.teamA,
      teamB: match.teamB,
      venue: match.venue,
      matchStartTime: Timestamp.fromDate(new Date(match.matchStartTime)),
      status: "upcoming",
      winner: null,
      createdAt: now,
    };

    const docRef = await addDoc(collection(db, "matches"), matchDoc);
    console.log(`   ✅ ${match.teamA} vs ${match.teamB} → ${docRef.id}`);
  }

  console.log(`\n🎉 Successfully seeded ${matches.length} matches!\n`);
}

// ─── Main ────────────────────────────────────────────────────────
async function main() {
  const args = process.argv.slice(2);
  const shouldClear = args.includes("--clear");

  console.log("━".repeat(50));
  console.log("  🏟️  IPL Match Seeder");
  console.log("━".repeat(50));
  console.log(`  Project:   ${firebaseConfig.projectId}`);
  console.log(`  Matches:   ${matches.length}`);
  console.log(`  Clear:     ${shouldClear ? "Yes" : "No"}`);
  console.log("━".repeat(50));

  if (shouldClear) {
    await clearMatches();
  }

  await seedMatches();
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Seed failed:", err.message);
  process.exit(1);
});
