import { useState, useEffect, useCallback } from "react";
import { doc, setDoc, getDoc, onSnapshot, updateDoc } from "firebase/firestore";
import { db } from "../config/firebase";
import { useAuth } from "./useAuth";
import {
  diagnoseFirebase,
  testFirebaseConnection,
} from "../utils/firebaseDebug";

// Hook that provides localStorage-like interface but uses Firebase when authenticated
export const useFirebaseStorage = () => {
  const { user } = useAuth();
  const [cachedData, setCachedData] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [hasMigrated, setHasMigrated] = useState(false);

  // Get user document reference
  const getUserDocRef = useCallback(() => {
    if (!user?.uid) return null;
    return doc(db, "users", user.uid);
  }, [user?.uid]);

  // Clean localStorage after successful migration
  const cleanLocalStorage = useCallback(() => {
    const keysToClean = [
      "customQuizData_choice",
      "customQuizData_development",
      "customQuizFileName_choice",
      "customQuizFileName_development",
      "questionType",
    ];

    keysToClean.forEach((key) => {
      localStorage.removeItem(key);
    });

    console.log("🧹 localStorage limpiado después de migración a Firebase");
  }, []);

  // Initialize user document if it doesn't exist
  const initializeUserDoc = useCallback(async () => {
    if (!user?.uid) return;

    console.log(`🔍 Checking user document for: ${user.uid}`);
    const userDocRef = getUserDocRef();
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists()) {
      // Migrate localStorage data to Firebase when user first authenticates
      const localData = {
        customQuizData_choice: localStorage.getItem("customQuizData_choice"),
        customQuizData_development: localStorage.getItem(
          "customQuizData_development"
        ),
        customQuizFileName_choice: localStorage.getItem(
          "customQuizFileName_choice"
        ),
        customQuizFileName_development: localStorage.getItem(
          "customQuizFileName_development"
        ),
        questionType: localStorage.getItem("questionType") || "choice",
      };

      try {
        await setDoc(userDocRef, {
          createdAt: new Date(),
          lastUpdated: new Date(),
          quizData: localData,
          migrated: true,
        });

        console.log("📦 Datos migrados de localStorage a Firebase");
      } catch (error) {
        console.error("❌ Error creating user document:", error);
        if (error.code === "permission-denied") {
          console.error(
            "🚫 Permission denied! Make sure Firestore rules allow user document creation."
          );
        }
        throw error;
      }

      // Clean localStorage after successful migration
      setTimeout(() => {
        cleanLocalStorage();
        setHasMigrated(true);
      }, 1000); // Small delay to ensure Firebase write is complete
    } else {
      // User document exists, check if we need to clean localStorage
      const data = userDoc.data();
      if (data.migrated && !hasMigrated) {
        cleanLocalStorage();
        setHasMigrated(true);
      }
    }
  }, [user?.uid, getUserDocRef, cleanLocalStorage, hasMigrated]);

  // Storage interface that uses Firebase when authenticated, localStorage otherwise
  const hybridStorage = {
    setItem: async (key, value) => {
      if (user?.uid) {
        // User is authenticated - use Firebase
        try {
          const userDocRef = getUserDocRef();
          await initializeUserDoc();

          await updateDoc(userDocRef, {
            [`quizData.${key}`]: value,
            lastUpdated: new Date(),
          });

          // Update local cache
          setCachedData((prev) => ({
            ...prev,
            [key]: value,
          }));

          console.log(`✅ Firebase data saved: ${key}`);
        } catch (error) {
          console.error("Error saving to Firebase:", error);

          // Check if it's a permission error
          if (error.code === "permission-denied") {
            console.error(
              "🚫 Firebase permission denied. Check Firestore rules!"
            );
            console.error("Make sure the following rule exists:");
            console.error(
              "match /users/{userId} { allow read, write: if request.auth != null && request.auth.uid == userId; }"
            );
          }

          // Fallback to localStorage on error only if not migrated
          if (!hasMigrated) {
            localStorage.setItem(key, value);
          }
        }
      } else {
        // User not authenticated - use localStorage
        localStorage.setItem(key, value);
        console.log(`💾 localStorage data saved: ${key}`);
      }
    },

    getItem: (key) => {
      if (user?.uid && isInitialized) {
        // User is authenticated and data is loaded - use cached Firebase data
        return cachedData[key] !== undefined ? cachedData[key] : null;
      } else {
        // User not authenticated or data not loaded - use localStorage
        return localStorage.getItem(key);
      }
    },

    removeItem: async (key) => {
      if (user?.uid) {
        // User is authenticated - remove from Firebase
        try {
          const userDocRef = getUserDocRef();
          await updateDoc(userDocRef, {
            [`quizData.${key}`]: null,
            lastUpdated: new Date(),
          });

          // Update local cache
          setCachedData((prev) => ({
            ...prev,
            [key]: null,
          }));

          console.log(`🗑️ Firebase data removed: ${key}`);
        } catch (error) {
          console.error("Error removing from Firebase:", error);

          // Check if it's a permission error
          if (error.code === "permission-denied") {
            console.error(
              "🚫 Firebase permission denied. Check Firestore rules!"
            );
          }

          // Fallback to localStorage on error only if not migrated
          if (!hasMigrated) {
            localStorage.removeItem(key);
          }
        }
      } else {
        // User not authenticated - use localStorage
        localStorage.removeItem(key);
        console.log(`🗑️ localStorage data removed: ${key}`);
      }
    },
  };

  // Load initial data and set up real-time listener for authenticated users
  useEffect(() => {
    if (!user?.uid) {
      // No user - mark as ready immediately (will use localStorage)
      setCachedData({});
      setIsInitialized(true);
      setIsLoading(false);
      setHasMigrated(false);
      return;
    }

    const userDocRef = getUserDocRef();
    if (!userDocRef) return;

    setIsLoading(true);

    // Test Firebase connection
    testFirebaseConnection();

    // Run diagnostic if this is the first time
    diagnoseFirebase(user).then((success) => {
      if (!success) {
        console.error(
          "🚨 Firebase diagnostic failed! Check the console for details."
        );
      }
    });

    // Set up real-time listener for authenticated users
    const unsubscribe = onSnapshot(userDocRef, async (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        const quizData = data.quizData || {};
        setCachedData(quizData);
        console.log("📡 Firebase data synced in real-time");

        // Check migration status
        if (data.migrated && !hasMigrated) {
          cleanLocalStorage();
          setHasMigrated(true);
        }
      } else {
        // Initialize document if it doesn't exist
        await initializeUserDoc();
      }
      setIsLoading(false);
      setIsInitialized(true);
    });

    return () => unsubscribe();
  }, [
    user?.uid,
    getUserDocRef,
    initializeUserDoc,
    hasMigrated,
    cleanLocalStorage,
  ]);

  return {
    storage: hybridStorage,
    isReady: !user?.uid || (Boolean(user?.uid) && isInitialized), // Ready if no user OR user with initialized data
    isLoading,
    cachedData,
    isUsingFirebase: Boolean(user?.uid),
    hasMigrated,
  };
};
