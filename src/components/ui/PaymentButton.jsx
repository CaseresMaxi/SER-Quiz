import React, { useState } from "react";
import "./PaymentButton.css";

const PaymentButton = ({
  item,
  userEmail,
  onPaymentSuccess,
  onPaymentError,
  className = "",
}) => {
  const [isCreatingPreference, setIsCreatingPreference] = useState(false);

  const handlePayment = async () => {
    setIsCreatingPreference(true);
    try {
      // Llama a tu backend para crear la preferencia de pago
      const response = await fetch(
        "https://ser-back-production.up.railway.app/api/create-payment",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title: item.title || "Producto SER Quiz",
            price: item.price,
            quantity: item.quantity || 1,
          }),
        }
      );
      if (!response.ok)
        throw new Error("Error al crear la preferencia de pago");
      const data = await response.json();
      if (data.init_point) {
        window.location.href = data.init_point;
      } else {
        throw new Error("No se recibió la URL de pago");
      }
    } catch (error) {
      console.error("Error creando preferencia de pago:", error);
      onPaymentError?.(error.message || "Error al procesar el pago");
    } finally {
      setIsCreatingPreference(false);
    }
  };

  return (
    <div className={`payment-button-container ${className}`}>
      <button
        onClick={handlePayment}
        disabled={isCreatingPreference}
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
    </div>
  );
};

export default PaymentButton;
