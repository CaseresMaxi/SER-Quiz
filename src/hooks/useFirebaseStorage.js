import { useState, useEffect, useCallback } from "react";
import { doc, setDoc, getDoc, onSnapshot, updateDoc } from "firebase/firestore";
import { db } from "../config/firebase";
import { useAuth } from "./useAuth";
import { useQuizHistory } from "./useQuizHistory";
import {
  diagnoseFirebase,
  testFirebaseConnection,
} from "../utils/firebaseDebug";

// Hook that provides localStorage-like interface but uses Firebase when authenticated
export const useFirebaseStorage = () => {
  const { user } = useAuth();
  const { saveQuizToHistory } = useQuizHistory();
  const [cachedData, setCachedData] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [hasMigrated, setHasMigrated] = useState(false);
  const [isFromHistory, setIsFromHistory] = useState(false); // Track if current quiz is from history

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

  // Helper function to check if key is quiz data and extract quiz info
  const isQuizDataKey = useCallback((key) => {
    return (
      key === "customQuizData_choice" || key === "customQuizData_development"
    );
  }, []);

  // Helper function to get quiz type from key
  const getQuizTypeFromKey = useCallback((key) => {
    if (key === "customQuizData_choice") return "choice";
    if (key === "customQuizData_development") return "development";
    return null;
  }, []);

  // Helper function to get corresponding filename key
  const getFileNameKey = useCallback((dataKey) => {
    if (dataKey === "customQuizData_choice") return "customQuizFileName_choice";
    if (dataKey === "customQuizData_development")
      return "customQuizFileName_development";
    return null;
  }, []);

  // Function to save existing quiz to history before replacing
  const saveExistingQuizToHistory = useCallback(
    async (key, newValue, skipHistorySave = false) => {
      if (!user?.uid || !isQuizDataKey(key)) {
        return; // Not a quiz data key or no user
      }

      // Skip saving to history if explicitly requested (e.g., when loading from history)
      if (skipHistorySave) {
        console.log(
          `⏩ Skipping history save for ${key} (loaded from history)`
        );
        return;
      }

      // Skip saving to history if current quiz is from history
      if (isFromHistory) {
        console.log(
          `⏩ Skipping history save for ${key} (current quiz is from history)`
        );
        return;
      }

      // Get existing quiz data and filename
      const existingQuizData = cachedData[key];
      const fileNameKey = getFileNameKey(key);
      const existingFileName = cachedData[fileNameKey];

      // Only save to history if there's existing data and it's different from new value
      if (
        existingQuizData &&
        existingFileName &&
        existingQuizData !== newValue
      ) {
        try {
          const quizType = getQuizTypeFromKey(key);

          console.log(
            `📚 Saving existing ${quizType} quiz to history before replacement...`
          );

          await saveQuizToHistory(
            existingQuizData,
            existingFileName,
            quizType,
            `${
              quizType === "development"
                ? "🧠 Desarrollo"
                : "📝 Opción múltiple"
            } - ${existingFileName}`
          );

          console.log(`✅ Successfully saved ${quizType} quiz to history`);
        } catch (error) {
          console.error("❌ Error saving quiz to history:", error);
          // Don't prevent the new quiz from being saved even if history save fails
        }
      }
    },
    [
      user?.uid,
      cachedData,
      isQuizDataKey,
      getQuizTypeFromKey,
      getFileNameKey,
      saveQuizToHistory,
      isFromHistory,
    ]
  );

  // Function to mark that current quiz is from history
  const markAsFromHistory = useCallback(async () => {
    setIsFromHistory(true);
    console.log("🔖 Quiz marked as loaded from history");

    // Persist this flag in storage so it survives page reloads
    if (user?.uid) {
      try {
        const userDocRef = getUserDocRef();
        await updateDoc(userDocRef, {
          [`quizData.isFromHistory`]: true,
          lastUpdated: new Date(),
        });
        console.log("💾 History flag saved to Firebase");
      } catch (error) {
        console.error("❌ Error saving history flag to Firebase:", error);
        // Fallback to localStorage
        localStorage.setItem("isFromHistory", "true");
      }
    } else {
      localStorage.setItem("isFromHistory", "true");
    }
  }, [user?.uid, getUserDocRef]);

  // Function to reset history flag (when new quiz is uploaded or generated)
  const resetHistoryFlag = useCallback(async () => {
    setIsFromHistory(false);
    console.log("🔄 History flag reset - new quiz not from history");

    // Remove flag from storage
    if (user?.uid) {
      try {
        const userDocRef = getUserDocRef();
        await updateDoc(userDocRef, {
          [`quizData.isFromHistory`]: false,
          lastUpdated: new Date(),
        });
        console.log("🗑️ History flag removed from Firebase");
      } catch (error) {
        console.error("❌ Error removing history flag from Firebase:", error);
        // Fallback to localStorage
        localStorage.removeItem("isFromHistory");
      }
    } else {
      localStorage.removeItem("isFromHistory");
    }
  }, [user?.uid, getUserDocRef]);

  // Storage interface that uses Firebase when authenticated, localStorage otherwise
  const hybridStorage = {
    setItem: async (key, value, options = {}) => {
      const { skipHistorySave = false } = options;

      if (user?.uid) {
        // User is authenticated - use Firebase
        try {
          // Save existing quiz to history before replacing (if applicable)
          await saveExistingQuizToHistory(key, value, skipHistorySave);

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

      // Load isFromHistory flag from localStorage
      const localHistoryFlag = localStorage.getItem("isFromHistory") === "true";
      setIsFromHistory(localHistoryFlag);
      console.log(
        `🔍 History flag loaded from localStorage: ${localHistoryFlag}`
      );

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

        // Load isFromHistory flag from Firebase
        const historyFlag = quizData.isFromHistory || false;
        setIsFromHistory(historyFlag);
        console.log(`🔍 History flag loaded from Firebase: ${historyFlag}`);

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
    isFromHistory,
    markAsFromHistory,
    resetHistoryFlag,
  };
};
