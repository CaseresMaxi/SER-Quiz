import React from "react";
import PaymentButton from "./PaymentButton";
import "./PricingCard.css";

const PricingCard = ({
  planId,
  title,
  price,
  originalPrice,
  description,
  features,
  isPopular = false,
  user,
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

  // Debug: Log props
  console.log("PricingCard - Props:", { planId, user, userEmail });

  return (
    <div className={`pricing-card ${isPopular ? "popular" : ""}`}>
      {isPopular && <div className="popular-badge">🔥 Más Popular</div>}

      <div className="pricing-header">
        <h3 className="pricing-title">{title}</h3>
        <div className="pricing-price">
          {originalPrice && (
            <div className="original-price">
              <span className="currency">$</span>
              <span className="amount">{originalPrice}</span>
              <span className="period">ARS</span>
            </div>
          )}
          <div className={`current-price ${originalPrice ? "discounted" : ""}`}>
            <span className="currency">$</span>
            <span className="amount">{price}</span>
            <span className="period">ARS</span>
            {originalPrice && <span className="discount-badge">50% OFF</span>}
          </div>
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
        {isCurrentPlan && hasActiveSubscription ? (
          <div className="current-plan-badge">✅ Plan Actual</div>
        ) : (
          <PaymentButton
            item={paymentItem}
            user={user}
            userEmail={userEmail}
            onPaymentSuccess={onPaymentSuccess}
            onPaymentError={onPaymentError}
            className="pricing-payment-button"
          />
        )}
      </div>
    </div>
  );
};

export default PricingCard;
