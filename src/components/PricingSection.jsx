import React, { useState } from "react";
import PricingCard from "./ui/PricingCard";
import { useSubscription, SUBSCRIPTION_PLANS } from "../hooks/useSubscription";
import "./PricingSection.css";

const PricingSection = ({ userEmail, onClose }) => {
  const [paymentStatus, setPaymentStatus] = useState(null);
  const [paymentMessage, setPaymentMessage] = useState("");
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
        console.log("Subscription created successfully:", result.subscription);
        setPaymentMessage(
          "¡Pago procesado exitosamente! Tu plan premium ha sido activado."
        );
      } else {
        console.error("Error creating subscription:", result.error);
        setPaymentMessage(
          "Pago exitoso, pero hubo un error activando tu plan. Contacta soporte."
        );
      }
    } catch (error) {
      console.error("Error processing subscription:", error);
      setPaymentMessage(
        "Pago exitoso, pero hubo un error activando tu plan. Contacta soporte."
      );
    }

    setTimeout(() => {
      onClose?.();
    }, 3000);
  };

  const handlePaymentError = (error) => {
    console.error("Payment error:", error);
    setPaymentStatus("error");
    setPaymentMessage(
      "Hubo un error al procesar el pago. Por favor, intenta nuevamente."
    );
  };

  if (paymentStatus === "success") {
    return (
      <div className="pricing-section">
        <div className="payment-success-container">
          <div className="success-icon">🎉</div>
          <h2>¡Pago Exitoso!</h2>
          <p>{paymentMessage}</p>
          <div className="success-animation">
            <div className="checkmark">✓</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pricing-section">
      <div className="pricing-header">
        <h2 className="pricing-main-title">Elige tu Plan Premium</h2>
        <p className="pricing-subtitle">
          Desbloquea todo el potencial de nuestros quizzes con IA
        </p>
      </div>

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
            userEmail={userEmail}
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
