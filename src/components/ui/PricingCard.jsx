import React from "react";
import PaymentButton from "./PaymentButton";
import "./PricingCard.css";

const PricingCard = ({
  planId,
  title,
  price,
  description,
  features,
  isPopular = false,
  userEmail,
  onPaymentSuccess,
  onPaymentError,
  currentSubscription,
  hasActiveSubscription,
}) => {
  const paymentItem = {
    id: planId || title.toLowerCase().replace(/\s+/g, "-"),
    planId: planId,
    title,
    description,
    price: parseFloat(price),
    quantity: 1,
  };

  // Check if this is the user's current plan
  const isCurrentPlan =
    currentSubscription && currentSubscription.planId === planId;
  const isDowngrade =
    currentSubscription &&
    hasActiveSubscription &&
    ((currentSubscription.planId === "professional" &&
      planId !== "professional") ||
      (currentSubscription.planId === "premium" && planId === "basic"));

  return (
    <div className={`pricing-card ${isPopular ? "popular" : ""}`}>
      {isPopular && <div className="popular-badge">🔥 Más Popular</div>}

      <div className="pricing-header">
        <h3 className="pricing-title">{title}</h3>
        <div className="pricing-price">
          <span className="currency">$</span>
          <span className="amount">{price}</span>
          <span className="period">ARS</span>
        </div>
        <p className="pricing-description">{description}</p>
      </div>

      <div className="pricing-features">
        <ul>
          {features.map((feature, index) => (
            <li key={index} className="feature-item">
              {feature}
            </li>
          ))}
        </ul>
      </div>

      <div className="pricing-action">
        <PaymentButton
          item={paymentItem}
          userEmail={userEmail}
          onPaymentSuccess={onPaymentSuccess}
          onPaymentError={onPaymentError}
          className="pricing-payment-button"
        />
      </div>
    </div>
  );
};

export default PricingCard;
