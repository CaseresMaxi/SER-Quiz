import React, { useState } from "react";
import PricingCard from "./ui/PricingCard";
import { useSubscription, SUBSCRIPTION_PLANS } from "../hooks/useSubscription";
import { useAuth } from "../hooks/useAuth";
import {
  isMaintenanceModeActive,
  getMaintenanceSettings,
} from "../config/maintenance";
import "./PricingSection.css";

const PricingSection = ({ userEmail, onClose }) => {
  // Get maintenance mode status from config
  const isMaintenanceMode = isMaintenanceModeActive();
  const maintenanceSettings = getMaintenanceSettings();

  const [paymentStatus, setPaymentStatus] = useState(null);
  const [paymentMessage, setPaymentMessage] = useState("");
  const [promoCode, setPromoCode] = useState("");
  const [isPromoValid, setIsPromoValid] = useState(false);
  const [promoMessage, setPromoMessage] = useState("");
  const [discountPercent, setDiscountPercent] = useState(0);
  const { user } = useAuth();
  const {
    subscription,
    createSubscription,
    hasActiveSubscription,
    getDaysRemaining,
    getSubscriptionStatus,
    loading: subscriptionLoading,
  } = useSubscription();

  // Convert SUBSCRIPTION_PLANS to array format for rendering with discount applied
  const pricingPlans = Object.values(SUBSCRIPTION_PLANS).map((plan) => ({
    id: plan.id,
    title: plan.name,
    price:
      discountPercent > 0
        ? Math.round(plan.price * (1 - discountPercent / 100)).toString()
        : plan.price.toString(),
    originalPrice: discountPercent > 0 ? plan.price.toString() : null,
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

  // Add special promo plan when valid code is entered (only for promo-cange)
  const specialPromoPlans =
    isPromoValid && promoCode.toLowerCase() === "promo-cange"
      ? [
          {
            id: "promo-special",
            title: "🎉 Plan Especial Promocional",
            price: "1",
            description:
              "¡Oferta especial limitada! Acceso completo por solo $1",
            features: [
              "✅ Generación ilimitada de preguntas con IA",
              "✅ Preguntas a desarrollar (modo premium)",
              "✅ Evaluación inteligente de respuestas",
              "✅ Personalización del evaluador",
              "✅ Múltiples niveles de dificultad",
              "✅ Soporte para todos los formatos de archivo",
              "✅ Acceso completo durante 30 días",
            ],
            isPopular: true,
            duration: 30,
          },
        ]
      : [];

  const allPlans = [...specialPromoPlans, ...pricingPlans];

  const handlePromoCodeChange = (e) => {
    const code = e.target.value;
    setPromoCode(code);

    if (code.toLowerCase() === "promo-cange") {
      setIsPromoValid(true);
      setDiscountPercent(0);
      setPromoMessage(
        "🎉 ¡Código promocional válido! Se ha desbloqueado el plan especial de $1"
      );
    } else if (code.toLowerCase() === "descuento50") {
      setIsPromoValid(true);
      setDiscountPercent(50);
      setPromoMessage(
        "🎉 ¡Código de descuento válido! Se ha aplicado un 50% de descuento a todos los planes"
      );
    } else if (code === "") {
      setIsPromoValid(false);
      setDiscountPercent(0);
      setPromoMessage("");
    } else {
      setIsPromoValid(false);
      setDiscountPercent(0);
      setPromoMessage("❌ Código promocional inválido");
    }
  };

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

  // Maintenance Mode Component
  const MaintenanceBanner = () => (
    <div className="maintenance-container">
      <div className="maintenance-banner">
        <div className="maintenance-icon">
          <div className="maintenance-gear">⚙️</div>
          <div className="maintenance-sparkles">✨</div>
        </div>

        <div className="maintenance-content">
          <h3 className="maintenance-title">{maintenanceSettings.title}</h3>
          <p className="maintenance-description">
            {maintenanceSettings.description}
            <br />
            Mientras tanto, puedes seguir disfrutando del contenido gratuito.
          </p>

          <div className="maintenance-features">
            {maintenanceSettings.features.map((feature, index) => (
              <div key={index} className="maintenance-feature">
                <span className="feature-icon">{feature.icon}</span>
                <span>{feature.text}</span>
              </div>
            ))}
          </div>

          <div className="maintenance-status">
            <div className="status-indicator">
              <div className="status-dot pulsing"></div>
              <span>Trabajando en mejoras...</span>
            </div>
          </div>

          <div className="maintenance-timeline">
            <p className="timeline-text">
              <strong>Tiempo estimado:</strong>{" "}
              {maintenanceSettings.estimatedTime}
            </p>
            <p className="contact-text">
              ¿Tienes preguntas? Contáctanos en{" "}
              <a href={`mailto:${maintenanceSettings.contactEmail}`}>
                {maintenanceSettings.contactEmail}
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="pricing-section">
      <div className="pricing-header">
        <h2>Elige tu plan</h2>
        <p>Accede a contenido premium y mejora tus habilidades</p>
      </div>

      {/* Show maintenance banner if maintenance mode is enabled */}
      {isMaintenanceMode && <MaintenanceBanner />}

      {/* Hide pricing content when in maintenance mode */}
      {!isMaintenanceMode && (
        <>
          {/* Promo Code Section */}
          <div className="promo-code-section">
            <div className="promo-code-container">
              <label htmlFor="promo-code" className="promo-code-label">
                🎫 ¿Tienes un código de descuento?
              </label>
              <div className="promo-code-input-group">
                <input
                  id="promo-code"
                  type="text"
                  value={promoCode}
                  onChange={handlePromoCodeChange}
                  placeholder="Ingresa tu código aquí..."
                  className="promo-code-input"
                />
                <div className="promo-code-icon">
                  {isPromoValid
                    ? "✅"
                    : promoCode && !isPromoValid
                    ? "❌"
                    : "🎫"}
                </div>
              </div>
              {promoMessage && (
                <div
                  className={`promo-message ${
                    isPromoValid ? "valid" : "invalid"
                  }`}
                >
                  {promoMessage}
                </div>
              )}
            </div>
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
            {allPlans.map((plan, index) => (
              <PricingCard
                key={index}
                planId={plan.id}
                title={plan.title}
                price={plan.price}
                originalPrice={plan.originalPrice}
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
        </>
      )}
    </div>
  );
};

export default PricingSection;
