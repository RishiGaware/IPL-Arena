import { create } from "zustand";
import {
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
  signOut,
} from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../firebase";

const STARTING_POINTS = 10000;

const useAuthStore = create((set) => ({
  user: null,
  loading: true,

  initializeAuth: () => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        const ref = doc(db, "users", currentUser.uid);
        const snap = await getDoc(ref);

        if (!snap.exists()) {
          // First-time sign-in → create user doc with starting balance
          await setDoc(ref, {
            displayName: currentUser.displayName || "",
            email: currentUser.email,
            photoURL: currentUser.photoURL || "",
            points: STARTING_POINTS,
            createdAt: serverTimestamp(),
          });
        } else {
          // Returning user → sync profile fields (never overwrite points)
          await setDoc(
            ref,
            {
              displayName: currentUser.displayName || "",
              photoURL: currentUser.photoURL || "",
            },
            { merge: true },
          );
        }
      }
      set({ user: currentUser, loading: false });
    });
    return unsubscribe;
  },

  signInWithGoogle: async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  },

  signOutUser: async () => {
    await signOut(auth);
    set({ user: null });
  },
}));

export default useAuthStore;
