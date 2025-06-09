import React from "react";
import { useSubscription } from "../hooks/useSubscription";
import "./SubscriptionDashboard.css";

const SubscriptionDashboard = () => {
  const {
    subscription,
    paymentHistory,
    hasActiveSubscription,
    getDaysRemaining,
    getSubscriptionStatus,
    isExpiringSoon,
    cancelSubscription,
    reactivateSubscription,
    loading,
  } = useSubscription();

  if (loading) {
    return (
      <div className="subscription-dashboard">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Cargando información de suscripción...</p>
        </div>
      </div>
    );
  }

  if (!subscription) {
    return (
      <div className="subscription-dashboard">
        <div className="no-subscription">
          <div className="no-sub-icon">📋</div>
          <h3>Sin Suscripción Activa</h3>
          <p>
            No tienes ninguna suscripción actualmente. ¡Upgrade para acceder a
            todas las funcionalidades premium!
          </p>
        </div>
      </div>
    );
  }

  const status = getSubscriptionStatus();
  const daysRemaining = getDaysRemaining();
  const isActive = hasActiveSubscription();

  const handleCancelSubscription = async () => {
    if (window.confirm("¿Estás seguro que quieres cancelar tu suscripción?")) {
      const result = await cancelSubscription();
      if (result.success) {
        alert("Suscripción cancelada exitosamente");
      } else {
        alert("Error al cancelar la suscripción");
      }
    }
  };

  const handleReactivateSubscription = async () => {
    const result = await reactivateSubscription();
    if (result.success) {
      alert("Suscripción reactivada exitosamente");
    } else {
      alert("Error al reactivar la suscripción");
    }
  };

  const getStatusBadge = () => {
    switch (status) {
      case "active":
        return <span className="status-badge active">✅ Activa</span>;
      case "expiring":
        return <span className="status-badge expiring">⚠️ Por Vencer</span>;
      case "expired":
        return <span className="status-badge expired">❌ Expirada</span>;
      default:
        return <span className="status-badge inactive">⏸️ Inactiva</span>;
    }
  };

  const formatDate = (date) => {
    return date
      ? new Intl.DateTimeFormat("es-AR", {
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }).format(date)
      : "N/A";
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
    }).format(price);
  };

  return (
    <div className="subscription-dashboard">
      <div className="dashboard-header">
        <h2>🔥 Mi Suscripción</h2>
        <p>Gestiona tu plan y revisa tu historial de pagos</p>
      </div>

      {/* Current Subscription Card */}
      <div className="subscription-card">
        <div className="subscription-header">
          <div className="plan-info">
            <h3 className="plan-name">{subscription.planName}</h3>
            {getStatusBadge()}
          </div>
          <div className="plan-price">{formatPrice(subscription.price)}</div>
        </div>

        <div className="subscription-details">
          <div className="detail-item">
            <span className="detail-label">📅 Inicio:</span>
            <span className="detail-value">
              {formatDate(subscription.createdAt)}
            </span>
          </div>
          <div className="detail-item">
            <span className="detail-label">⏰ Vence:</span>
            <span className="detail-value">
              {formatDate(subscription.expiresAt)}
            </span>
          </div>
          <div className="detail-item">
            <span className="detail-label">⏳ Días restantes:</span>
            <span
              className={`detail-value ${isExpiringSoon() ? "expiring" : ""}`}
            >
              {isActive ? `${daysRemaining} días` : "0 días"}
            </span>
          </div>
          <div className="detail-item">
            <span className="detail-label">🔄 Renovación:</span>
            <span className="detail-value">
              {subscription.autoRenew ? "Automática" : "Manual"}
            </span>
          </div>
        </div>

        {/* Subscription Actions */}
        <div className="subscription-actions">
          {isActive && subscription.status === "active" && (
            <button
              className="btn btn-cancel"
              onClick={handleCancelSubscription}
            >
              Cancelar Suscripción
            </button>
          )}
          {subscription.status === "cancelled" && (
            <button
              className="btn btn-reactivate"
              onClick={handleReactivateSubscription}
            >
              Reactivar Suscripción
            </button>
          )}
        </div>

        {/* Features List */}
        <div className="features-section">
          <h4>✨ Características de tu Plan:</h4>
          <ul className="features-list">
            {subscription.features?.map((feature, index) => (
              <li key={index} className="feature-item">
                <span className="feature-check">✓</span>
                {feature}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Payment History */}
      <div className="payment-history">
        <h3>💳 Historial de Pagos</h3>
        {paymentHistory.length === 0 ? (
          <div className="no-payments">
            <p>No hay pagos registrados aún.</p>
          </div>
        ) : (
          <div className="payments-list">
            {paymentHistory.map((payment) => (
              <div key={payment.id} className="payment-item">
                <div className="payment-info">
                  <div className="payment-plan">{payment.planName}</div>
                  <div className="payment-date">
                    {formatDate(payment.createdAt)}
                  </div>
                </div>
                <div className="payment-amount">
                  {formatPrice(payment.amount)}
                </div>
                <div className={`payment-status ${payment.status}`}>
                  {payment.status === "completed"
                    ? "✅ Completado"
                    : payment.status === "pending"
                    ? "⏳ Pendiente"
                    : "❌ Fallido"}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Expiring Soon Warning */}
      {isExpiringSoon() && (
        <div className="expiring-warning">
          <div className="warning-icon">⚠️</div>
          <div className="warning-content">
            <h4>Tu suscripción está por vencer</h4>
            <p>
              Te quedan {daysRemaining} días. ¡Renueva ahora para no perder el
              acceso!
            </p>
            <button className="btn btn-renew">Renovar Suscripción</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubscriptionDashboard;
