import React, { useState } from "react";
import { Wallet } from "@mercadopago/sdk-react";
import { useMercadoPago } from "../../contexts/MercadoPagoContext";
import "./PaymentButton.css";

const PaymentButton = ({
  item,
  userEmail,
  onPaymentSuccess,
  onPaymentError,
  className = "",
}) => {
  const { createPreference, isInitialized, loading } = useMercadoPago();
  const [preferenceId, setPreferenceId] = useState(null);
  const [isCreatingPreference, setIsCreatingPreference] = useState(false);

  const handlePayment = async () => {
    if (!isInitialized) {
      console.error("MercadoPago not initialized");
      onPaymentError?.("MercadoPago no está inicializado");
      return;
    }

    setIsCreatingPreference(true);

    try {
      // For demo purposes, we'll simulate a successful payment creation
      console.log("Creating payment preference for item:", item);

      // Show success immediately for demo
      setTimeout(() => {
        onPaymentSuccess?.({
          status: "approved",
          payment_id: `demo_payment_${Date.now()}`,
          merchant_order_id: `demo_order_${Date.now()}`,
          preference_id: `demo_pref_${Date.now()}`,
          planId: item.planId || "premium",
        });
      }, 2000);

      // Don't set preferenceId to avoid the Wallet component trying to load a fake preference
      console.log("Payment simulation started");
    } catch (error) {
      console.error("Error creating payment preference:", error);
      onPaymentError?.(error.message || "Error al procesar el pago");
    } finally {
      setIsCreatingPreference(false);
    }
  };

  const customization = {
    texts: {
      valueProp: "smart_option",
    },
  };

  if (!isInitialized) {
    return (
      <div className={`payment-button-container ${className}`}>
        <div className="payment-error">
          MercadoPago no está configurado correctamente
        </div>
      </div>
    );
  }

  return (
    <div className={`payment-button-container ${className}`}>
      <button
        onClick={handlePayment}
        disabled={loading || isCreatingPreference}
        className="payment-init-button"
      >
        {isCreatingPreference ? (
          <>
            <span className="loading-spinner"></span>
            Procesando pago...
          </>
        ) : (
          <>💳 Pagar ${item.price}</>
        )}
      </button>

      {isCreatingPreference && (
        <div className="payment-demo-notice">
          <span className="demo-icon">🎭</span>
          <span className="demo-text">
            MODO DEMO: Simulando pago de ${item.price} ARS
          </span>
        </div>
      )}
    </div>
  );
};

export default PaymentButton;
