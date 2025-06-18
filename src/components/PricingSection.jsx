import React, { useState } from "react";
import PricingCard from "./ui/PricingCard";
import { useSubscription, SUBSCRIPTION_PLANS } from "../hooks/useSubscription";
import { useAuth } from "../hooks/useAuth";
import "./PricingSection.css";

const PricingSection = ({ userEmail, onClose }) => {
  const [paymentStatus, setPaymentStatus] = useState(null);
  const [paymentMessage, setPaymentMessage] = useState("");
  const { user } = useAuth();
  const {
    subscription,
    createSubscription,
    hasActiveSubscription,
    getDaysRemaining,
    getSubscriptionStatus,
    loading: subscriptionLoading,
  } = useSubscription();

  // Convert SUBSCRIPTION_PLANS to array format for rendering
  const pricingPlans = Object.values(SUBSCRIPTION_PLANS).map((plan) => ({
    id: plan.id,
    title: plan.name,
    price: plan.price.toString(),
    description:
      plan.id === "basic"
        ? "Perfecto para estudiantes que quieren mejorar sus habilidades"
        : plan.id === "premium"
        ? "La mejor opción para un aprendizaje completo"
        : "Para profesionales y equipos de trabajo",
    features: plan.features,
    isPopular: plan.id === "premium",
    duration: plan.duration,
  }));

  const handlePaymentSuccess = async (paymentData) => {
    console.log("Payment successful:", paymentData);
    setPaymentStatus("success");
    setPaymentMessage(
      "¡Pago procesado exitosamente! Tu plan premium ha sido activado."
    );

    try {
      // Create subscription in Firebase
      const planId = paymentData.planId || "premium"; // fallback to premium
      const result = await createSubscription(planId, {
        status: "completed",
        payment_id: paymentData.payment_id,
        merchant_order_id: paymentData.merchant_order_id,
        paymentMethod: "mercadopago",
        transactionId: paymentData.preference_id,
      });

      if (result.success) {
        console.log("Subscription created successfully");
      }
    } catch (error) {
      console.error("Error creating subscription:", error);
      setPaymentStatus("error");
      setPaymentMessage("Error al activar la suscripción: " + error.message);
    }
  };

  const handlePaymentError = (error) => {
    console.error("Payment error:", error);
    setPaymentStatus("error");
    setPaymentMessage(error || "Error al procesar el pago");
  };

  // Debug: Log user information
  console.log("PricingSection - User:", user);
  console.log("PricingSection - UserEmail:", userEmail);

  return (
    <div className="pricing-section">
      <div className="pricing-header">
        <button className="close-button" onClick={onClose}>
          ×
        </button>
        <h2>Elige tu plan</h2>
        <p>Accede a contenido premium y mejora tus habilidades</p>
      </div>

      {paymentStatus === "success" && (
        <div className="payment-success-banner">
          <span className="success-icon">✅</span>
          {paymentMessage}
          <button
            className="success-close-btn"
            onClick={() => setPaymentStatus(null)}
          >
            ×
          </button>
        </div>
      )}

      {paymentStatus === "error" && (
        <div className="payment-error-banner">
          <span className="error-icon">⚠️</span>
          {paymentMessage}
          <button
            className="error-close-btn"
            onClick={() => setPaymentStatus(null)}
          >
            ×
          </button>
        </div>
      )}

      <div className="pricing-grid">
        {pricingPlans.map((plan, index) => (
          <PricingCard
            key={index}
            planId={plan.id}
            title={plan.title}
            price={plan.price}
            description={plan.description}
            features={plan.features}
            isPopular={plan.isPopular}
            user={user}
            userEmail={userEmail || user?.email}
            onPaymentSuccess={handlePaymentSuccess}
            onPaymentError={handlePaymentError}
            currentSubscription={subscription}
            hasActiveSubscription={hasActiveSubscription()}
          />
        ))}
      </div>

      <div className="pricing-footer">
        <div className="security-badges">
          <div className="security-badge">🔒 Pago 100% Seguro</div>
          <div className="security-badge">✅ Garantía de 7 días</div>
          <div className="security-badge">💳 Todos los medios de pago</div>
        </div>

        <p className="pricing-note">
          * Todos los precios están en pesos argentinos (ARS) e incluyen IVA
        </p>
      </div>
    </div>
  );
};

export default PricingSection;
