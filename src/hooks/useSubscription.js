import { useState, useEffect } from "react";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  addDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "../config/firebase";
import { useAuth } from "./useAuth";

// Subscription plans configuration
export const SUBSCRIPTION_PLANS = {
  basic: {
    id: "basic",
    name: "Plan Básico",
    price: 1999,
    duration: 30, // days
    features: [
      "Acceso a 100 preguntas premium",
      "Quizzes personalizados",

      "Acceso por 30 días",
    ],
  },
  premium: {
    id: "premium",
    name: "Plan Premium",
    price: 3999,
    duration: 90, // days
    features: [
      "Acceso ilimitado a todas las preguntas",
      "Quizzes personalizados avanzados",
      // "IA personalizada para generar preguntas",
      // "Análisis detallado de rendimiento",
      // "Soporte prioritario",
      "Acceso por 90 días",
      // "Exportar resultados en PDF",
    ],
  },
  professional: {
    id: "professional",
    name: "Plan Profesional",
    price: 8999,
    duration: 365, // days
    features: [
      // "Todo lo incluido en Premium",
      // "Acceso para hasta 5 usuarios",
      // "Dashboard administrativo",
      // "API access para integraciones",
      // "Reportes avanzados",
      // "Soporte telefónico",
      // "Acceso por 1 año",
      // "Personalizaciones exclusivas",
      "Acceso ilimitado a todas las preguntas",
      "Quizzes personalizados avanzados",
      // "IA personalizada para generar preguntas",
      // "Análisis detallado de rendimiento",
      // "Soporte prioritario",
      "Acceso por 1 año",
      // "Exportar resultados en PDF",
    ],
  },
};

export const useSubscription = () => {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState(null);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Subscribe to user subscription changes
  useEffect(() => {
    if (!user) {
      setSubscription(null);
      setPaymentHistory([]);
      setLoading(false);
      return;
    }

    const unsubscribe = onSnapshot(
      doc(db, "subscriptions", user.uid),
      (doc) => {
        if (doc.exists()) {
          const data = doc.data();
          setSubscription({
            ...data,
            expiresAt: data.expiresAt?.toDate(),
            createdAt: data.createdAt?.toDate(),
            updatedAt: data.updatedAt?.toDate(),
          });
        } else {
          setSubscription(null);
        }
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching subscription:", error);
        setError(error.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  // Subscribe to payment history
  useEffect(() => {
    if (!user) {
      setPaymentHistory([]);
      return;
    }

    const q = query(
      collection(db, "payments"),
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const payments = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate(),
      }));
      setPaymentHistory(payments);
    });

    return () => unsubscribe();
  }, [user]);

  // Create or update subscription
  const createSubscription = async (planId, paymentData = null) => {
    if (!user) throw new Error("User not authenticated");

    const plan = SUBSCRIPTION_PLANS[planId];
    if (!plan) throw new Error("Invalid plan");

    try {
      const now = new Date();
      const expiresAt = new Date(
        now.getTime() + plan.duration * 24 * 60 * 60 * 1000
      );

      const subscriptionData = {
        userId: user.uid,
        userEmail: user.email,
        planId: plan.id,
        planName: plan.name,
        status: "active",
        price: plan.price,
        duration: plan.duration,
        expiresAt: Timestamp.fromDate(expiresAt),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        autoRenew: false,
        features: plan.features,
      };

      // Update subscription
      await setDoc(doc(db, "subscriptions", user.uid), subscriptionData);

      // Record payment if provided
      if (paymentData) {
        await recordPayment(planId, paymentData);
      }

      return { success: true, subscription: subscriptionData };
    } catch (error) {
      console.error("Error creating subscription:", error);
      setError(error.message);
      return { success: false, error: error.message };
    }
  };

  // Record payment transaction
  const recordPayment = async (planId, paymentData) => {
    if (!user) throw new Error("User not authenticated");

    const plan = SUBSCRIPTION_PLANS[planId];
    if (!plan) throw new Error("Invalid plan");

    try {
      const paymentRecord = {
        userId: user.uid,
        userEmail: user.email,
        planId: plan.id,
        planName: plan.name,
        amount: plan.price,
        currency: "ARS",
        status: paymentData.status || "completed",
        paymentMethod: paymentData.paymentMethod || "mercadopago",
        transactionId: paymentData.transactionId || null,
        mercadopagoPaymentId: paymentData.payment_id || null,
        mercadopagoOrderId: paymentData.merchant_order_id || null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        metadata: paymentData,
      };

      await addDoc(collection(db, "payments"), paymentRecord);
      return { success: true, payment: paymentRecord };
    } catch (error) {
      console.error("Error recording payment:", error);
      return { success: false, error: error.message };
    }
  };

  // Cancel subscription
  const cancelSubscription = async () => {
    if (!user || !subscription) throw new Error("No active subscription");

    try {
      await updateDoc(doc(db, "subscriptions", user.uid), {
        status: "cancelled",
        cancelledAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      return { success: true };
    } catch (error) {
      console.error("Error cancelling subscription:", error);
      setError(error.message);
      return { success: false, error: error.message };
    }
  };

  // Reactivate subscription
  const reactivateSubscription = async () => {
    if (!user || !subscription) throw new Error("No subscription found");

    try {
      await updateDoc(doc(db, "subscriptions", user.uid), {
        status: "active",
        cancelledAt: null,
        updatedAt: serverTimestamp(),
      });

      return { success: true };
    } catch (error) {
      console.error("Error reactivating subscription:", error);
      setError(error.message);
      return { success: false, error: error.message };
    }
  };

  // Check if user has active subscription
  const hasActiveSubscription = () => {
    if (!subscription) return false;
    if (subscription.status !== "active") return false;
    if (!subscription.expiresAt) return false;

    return new Date() < subscription.expiresAt;
  };

  // Check if user has specific plan
  const hasPlan = (planId) => {
    return hasActiveSubscription() && subscription.planId === planId;
  };

  // Get days remaining
  const getDaysRemaining = () => {
    if (!hasActiveSubscription()) return 0;

    const now = new Date();
    const expiry = subscription.expiresAt;
    const diffTime = expiry - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return Math.max(0, diffDays);
  };

  // Check if subscription is expiring soon (within 7 days)
  const isExpiringSoon = () => {
    const daysRemaining = getDaysRemaining();
    return daysRemaining > 0 && daysRemaining <= 7;
  };

  // Get subscription status for UI
  const getSubscriptionStatus = () => {
    if (!subscription) return "none";
    if (!hasActiveSubscription()) return "expired";
    if (isExpiringSoon()) return "expiring";
    return "active";
  };

  return {
    subscription,
    paymentHistory,
    loading,
    error,
    createSubscription,
    recordPayment,
    cancelSubscription,
    reactivateSubscription,
    hasActiveSubscription,
    hasPlan,
    getDaysRemaining,
    isExpiringSoon,
    getSubscriptionStatus,
    plans: SUBSCRIPTION_PLANS,
  };
};
