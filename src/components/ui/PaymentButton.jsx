import React, { useState } from "react";
import "./PaymentButton.css";

const PaymentButton = ({
  item,
  userEmail,
  onPaymentSuccess,
  onPaymentError,
  className = "",
  user,
}) => {
  const [isCreatingPreference, setIsCreatingPreference] = useState(false);

  const handlePayment = async () => {
    setIsCreatingPreference(true);

    try {
      // Validate required data
      if (!user?.uid) {
        throw new Error("Usuario no autenticado. Por favor, inicia sesión.");
      }

      if (!item?.id) {
        throw new Error("Plan no seleccionado correctamente.");
      }

      const finalUserEmail = userEmail || user?.email;
      if (!finalUserEmail) {
        throw new Error("Email del usuario no disponible.");
      }

      // Prepare payment data
      const paymentData = {
        title: item.title || "Plan Premium",
        price: item.price,
        quantity: item.quantity || 1,
        user_id: user.uid,
        plan_id: item.id,
        user_email: finalUserEmail,
      };

      // Debug: Log payment data being sent
      console.log("PaymentButton - Sending payment data:", paymentData);

      // Call backend to create payment preference
      const response = await fetch(
        "https://ser-back-production.up.railway.app/api/create-payment",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(paymentData),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || "Error al crear la preferencia de pago"
        );
      }

      const data = await response.json();
      console.log("Payment preference response:", data);

      if (data.init_point) {
        // Redirect to MercadoPago
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
        disabled={isCreatingPreference || !user?.uid}
        className="payment-init-button"
      >
        {isCreatingPreference ? (
          <>
            <span className="loading-spinner"></span>
            Procesando pago...
          </>
        ) : !user?.uid ? (
          <>🔒 Inicia sesión para pagar</>
        ) : (
          <>💳 Pagar ${item.price}</>
        )}
      </button>

      {/* Debug info in development */}
      {process.env.NODE_ENV === "development" && (
        <div style={{ fontSize: "10px", color: "#666", marginTop: "5px" }}>
          Debug: user_id={user?.uid}, plan_id={item?.id}, email=
          {userEmail || user?.email}
        </div>
      )}
    </div>
  );
};

export default PaymentButton;
