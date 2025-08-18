import { useState, useCallback } from "react";
import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  getDocs,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { db } from "../config/firebase";
import { useAuth } from "./useAuth";

/**
 * Hook for managing quiz history in Firebase
 * Handles saving previous quizzes before they are replaced
 */
export const useQuizHistory = () => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  // Get reference to quiz_history collection
  const getHistoryCollectionRef = useCallback(() => {
    return collection(db, "quiz_history");
  }, []);

  /**
   * Save a quiz to history before it gets replaced
   * @param {string} quizData - JSON string of quiz questions
   * @param {string} fileName - Name of the quiz file
   * @param {string} type - Quiz type ('choice' or 'development')
   * @param {string} name - Display name for the quiz (optional)
   * @returns {Promise<string>} Document ID of saved history entry
   */
  const saveQuizToHistory = useCallback(
    async (quizData, fileName, type, name = null) => {
      if (!user?.uid) {
        console.warn("⚠️ Cannot save quiz history: User not authenticated");
        return null;
      }

      if (!quizData || !fileName || !type) {
        console.warn("⚠️ Cannot save quiz history: Missing required data");
        return null;
      }

      try {
        setIsLoading(true);

        // Generate display name if not provided
        const displayName =
          name ||
          `${
            type === "development" ? "🧠 Desarrollo" : "📝 Opción múltiple"
          } - ${fileName}`;

        const historyEntry = {
          userId: user.uid,
          userEmail: user.email || null,
          quizData: quizData, // JSON string
          fileName: fileName,
          type: type, // 'choice' or 'development'
          name: displayName,
          createdAt: new Date(),
          // Additional metadata for future use
          version: 1,
          source: "manual_upload", // Could be 'manual_upload', 'ai_generated', etc.
        };

        const historyCollectionRef = getHistoryCollectionRef();
        const docRef = await addDoc(historyCollectionRef, historyEntry);

        console.log(
          `📚 Quiz saved to history: ${displayName} (ID: ${docRef.id})`
        );

        return docRef.id;
      } catch (error) {
        console.error("❌ Error saving quiz to history:", error);

        if (error.code === "permission-denied") {
          console.error(
            "🚫 Permission denied! Make sure Firestore rules allow quiz_history collection access."
          );
        }

        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [user?.uid, user?.email, getHistoryCollectionRef]
  );

  /**
   * Get quiz history for current user
   * @param {string} type - Optional filter by quiz type ('choice' or 'development')
   * @param {number} limit - Optional limit on number of results (default: 50)
   * @returns {Promise<Array>} Array of history entries
   */
  const getQuizHistory = useCallback(
    async (type = null, limit = 50) => {
      if (!user?.uid) {
        console.warn("⚠️ Cannot get quiz history: User not authenticated");
        return [];
      }

      try {
        setIsLoading(true);

        const historyCollectionRef = getHistoryCollectionRef();

        // Build query
        let historyQuery = query(
          historyCollectionRef,
          where("userId", "==", user.uid),
          orderBy("createdAt", "desc")
        );

        // Add type filter if specified
        if (type && (type === "choice" || type === "development")) {
          historyQuery = query(
            historyCollectionRef,
            where("userId", "==", user.uid),
            where("type", "==", type),
            orderBy("createdAt", "desc")
          );
        }

        const querySnapshot = await getDocs(historyQuery);

        const historyEntries = [];
        let count = 0;

        querySnapshot.forEach((doc) => {
          if (count < limit) {
            historyEntries.push({
              id: doc.id,
              ...doc.data(),
              // Convert Firestore timestamp to Date
              createdAt: doc.data().createdAt?.toDate() || new Date(),
            });
            count++;
          }
        });

        console.log(
          `📚 Retrieved ${historyEntries.length} quiz history entries`
        );

        return historyEntries;
      } catch (error) {
        console.error("❌ Error getting quiz history:", error);

        if (error.code === "permission-denied") {
          console.error(
            "🚫 Permission denied! Make sure Firestore rules allow quiz_history collection read access."
          );
        }

        return [];
      } finally {
        setIsLoading(false);
      }
    },
    [user?.uid, getHistoryCollectionRef]
  );

  /**
   * Delete a specific quiz from history
   * @param {string} historyId - Document ID of the history entry to delete
   * @returns {Promise<boolean>} Success status
   */
  const deleteHistoryEntry = useCallback(
    async (historyId) => {
      if (!user?.uid) {
        console.warn("⚠️ Cannot delete quiz history: User not authenticated");
        return false;
      }

      if (!historyId) {
        console.warn("⚠️ Cannot delete quiz history: Missing history ID");
        return false;
      }

      try {
        setIsLoading(true);

        const historyDocRef = doc(db, "quiz_history", historyId);
        await deleteDoc(historyDocRef);

        console.log(`🗑️ Quiz history entry deleted: ${historyId}`);

        return true;
      } catch (error) {
        console.error("❌ Error deleting quiz history:", error);

        if (error.code === "permission-denied") {
          console.error(
            "🚫 Permission denied! Make sure Firestore rules allow quiz_history collection delete access."
          );
        }

        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [user?.uid]
  );

  /**
   * Get count of quiz history entries for current user
   * @param {string} type - Optional filter by quiz type
   * @returns {Promise<number>} Count of history entries
   */
  const getHistoryCount = useCallback(
    async (type = null) => {
      if (!user?.uid) {
        return 0;
      }

      try {
        const historyCollectionRef = getHistoryCollectionRef();

        let countQuery = query(
          historyCollectionRef,
          where("userId", "==", user.uid)
        );

        if (type && (type === "choice" || type === "development")) {
          countQuery = query(
            historyCollectionRef,
            where("userId", "==", user.uid),
            where("type", "==", type)
          );
        }

        const querySnapshot = await getDocs(countQuery);
        return querySnapshot.size;
      } catch (error) {
        console.error("❌ Error getting quiz history count:", error);
        return 0;
      }
    },
    [user?.uid, getHistoryCollectionRef]
  );

  return {
    saveQuizToHistory,
    getQuizHistory,
    deleteHistoryEntry,
    getHistoryCount,
    isLoading,
    isEnabled: Boolean(user?.uid),
  };
};
