import React, { createContext, useContext, useEffect, useState } from "react";
import { initMercadoPago } from "@mercadopago/sdk-react";

const MercadoPagoContext = createContext();

export const useMercadoPago = () => {
  const context = useContext(MercadoPagoContext);
  if (!context) {
    throw new Error("useMercadoPago must be used within a MercadoPagoProvider");
  }
  return context;
};

export const MercadoPagoProvider = ({ children }) => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const publicKey = import.meta.env.VITE_MERCADOPAGO_PUBLIC_KEY;
  const environment = import.meta.env.VITE_MERCADOPAGO_ENVIRONMENT || "sandbox";

  useEffect(() => {
    if (publicKey) {
      try {
        initMercadoPago(publicKey, {
          locale: "es-AR",
        });
        setIsInitialized(true);
      } catch (err) {
        console.error("Error initializing MercadoPago:", err);
        setError("Error al inicializar MercadoPago");
      }
    } else {
      setError("MercadoPago public key not found");
    }
  }, [publicKey]);

  // Create preference for payment
  const createPreference = async (items, userEmail = null) => {
    setLoading(true);
    setError(null);

    try {
      const preference = {
        items: items.map((item) => ({
          id: item.id || "quiz-premium",
          title: item.title || "Quiz Premium",
          description: item.description || "Acceso premium a quizzes",
          quantity: item.quantity || 1,
          currency_id: "ARS",
          unit_price: item.price,
        })),
        payer: userEmail
          ? {
              email: userEmail,
            }
          : undefined,
        back_urls: {
          success: `${window.location.origin}/payment/success`,
          failure: `${window.location.origin}/payment/failure`,
          pending: `${window.location.origin}/payment/pending`,
        },
        auto_return: "approved",
        notification_url: `${window.location.origin}/api/webhooks/mercadopago`,
      };

      // This would typically be a call to your backend
      // For now, we'll simulate the response
      console.log("Creating preference:", preference);

      // In a real application, you would call your backend here
      // const response = await fetch('/api/create-preference', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(preference)
      // });
      // const data = await response.json();

      return preference;
    } catch (err) {
      console.error("Error creating preference:", err);
      setError("Error al crear la preferencia de pago");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const value = {
    isInitialized,
    loading,
    error,
    createPreference,
    environment,
    publicKey,
  };

  return (
    <MercadoPagoContext.Provider value={value}>
      {children}
    </MercadoPagoContext.Provider>
  );
};
