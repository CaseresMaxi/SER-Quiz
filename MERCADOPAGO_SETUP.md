# 💰 Configuración de MercadoPago

Esta guía te ayudará a configurar MercadoPago en tu aplicación para recibir pagos.

## 📋 Requisitos Previos

1. **Cuenta de MercadoPago**: Necesitas una cuenta de desarrollador en MercadoPago
2. **Credenciales**: Access Token y Public Key de tu aplicación

## 🔧 Configuración Inicial

### 1. Obtener Credenciales de MercadoPago

1. Ve a [MercadoPago Developers](https://www.mercadopago.com.ar/developers/panel)
2. Inicia sesión con tu cuenta
3. Crea una nueva aplicación o selecciona una existente
4. Ve a la sección "Credenciales"
5. Copia tu **Public Key** y **Access Token**

### 2. Configurar Variables de Entorno

Copia el archivo `env.example` a `.env` y configura las siguientes variables:

```bash
# MercadoPago Configuration
VITE_MERCADOPAGO_PUBLIC_KEY=tu-public-key-aqui
MERCADOPAGO_ACCESS_TOKEN=tu-access-token-aqui
VITE_MERCADOPAGO_ENVIRONMENT=sandbox
```

**Importante:**
- `VITE_MERCADOPAGO_PUBLIC_KEY`: Se usa en el frontend (visible al usuario)
- `MERCADOPAGO_ACCESS_TOKEN`: Se usa en el backend (MANTENER SECRETO)
- `VITE_MERCADOPAGO_ENVIRONMENT`: `sandbox` para pruebas, `production` para producción

### 3. Configuración de Sandbox vs Producción

#### Modo Sandbox (Pruebas)
```bash
VITE_MERCADOPAGO_ENVIRONMENT=sandbox
```
- Usa credenciales de prueba
- Los pagos no son reales
- Perfecto para desarrollo y testing

#### Modo Producción
```bash
VITE_MERCADOPAGO_ENVIRONMENT=production
```
- Usa credenciales de producción
- Los pagos son reales
- Solo usar cuando la aplicación esté lista

## 🚀 Funcionalidades Implementadas

### ✅ Lo que ya está funcionando:

1. **Botón de Precios**: Acceso desde el header principal
2. **Planes de Pago**: Tres planes predefinidos (Básico, Premium, Profesional)
3. **Integración con MercadoPago**: SDK configurado y listo
4. **UI Moderna**: Diseño responsive y atractivo
5. **Manejo de Estados**: Loading, success, error states
6. **Contexto Global**: MercadoPagoProvider para toda la app

### 🔄 Componentes Principales:

- `MercadoPagoContext`: Maneja la inicialización y estado global
- `PaymentButton`: Botón de pago individual
- `PricingCard`: Tarjeta de plan de pago
- `PricingSection`: Sección completa de precios

## 🛠️ Próximos Pasos para Producción

### 1. Backend para Preferencias de Pago

Necesitarás crear endpoints en tu backend para:

```javascript
// Crear preferencia de pago
POST /api/create-preference
{
  "items": [...],
  "payer": { "email": "user@example.com" },
  "back_urls": {...}
}

// Webhook para notificaciones
POST /api/webhooks/mercadopago
```

### 2. Base de Datos

Crear tablas para:
- Suscripciones de usuarios
- Historial de pagos
- Estados de pago

### 3. Lógica de Negocio

Implementar:
- Activación automática de premium
- Renovación de suscripciones
- Cancelación de planes
- Reportes de pagos

## 🧪 Testing

### Tarjetas de Prueba (Sandbox)

**Visa (Aprobada):**
- Número: 4509 9535 6623 3704
- CVV: 123
- Vencimiento: 11/25

**Mastercard (Rechazada):**
- Número: 5031 7557 3453 0604
- CVV: 123
- Vencimiento: 11/25

### Usuarios de Prueba

Puedes crear usuarios de prueba en el panel de MercadoPago para simular diferentes escenarios.

## 🔒 Seguridad

### Variables Sensibles

**NUNCA** expongas en el frontend:
- Access Token
- Credenciales de producción
- Información de pagos sensible

### Validación Backend

Siempre valida en el backend:
- Autenticidad de las notificaciones
- Estados de pago
- Montos y productos

## 📱 Responsive Design

La interfaz está optimizada para:
- ✅ Mobile (320px+)
- ✅ Tablet (768px+)
- ✅ Desktop (1024px+)
- ✅ Large screens (1440px+)

## 🎨 Personalización

### Modificar Planes

Edita `src/components/PricingSection.jsx`:

```javascript
const pricingPlans = [
  {
    title: 'Tu Plan',
    price: '1999',
    description: 'Descripción del plan',
    features: ['Feature 1', 'Feature 2'],
    isPopular: false
  }
];
```

### Cambiar Colores

Modifica los CSS en:
- `src/components/ui/PricingCard.css`
- `src/components/PricingSection.css`
- `src/App.css` (botón pricing)

## 🐛 Troubleshooting

### Error: "MercadoPago not initialized"
- Verifica que `VITE_MERCADOPAGO_PUBLIC_KEY` esté configurado
- Revisa la consola del navegador para errores

### Error: "Invalid public key"
- Asegúrate de usar la public key correcta para el environment
- Sandbox keys empiezan con `TEST-`
- Production keys empiezan con `APP_USR-`

### Pagos no se procesan
- Verifica que estés en el environment correcto
- Revisa los webhooks en el panel de MercadoPago
- Chequea los logs del backend

## 📞 Soporte

- [Documentación MercadoPago](https://www.mercadopago.com.ar/developers/es/docs)
- [SDKs y Herramientas](https://www.mercadopago.com.ar/developers/es/tools)
- [Comunidad de Desarrolladores](https://www.mercadopago.com.ar/developers/es/community)

---

¡Tu sistema de pagos está listo para generar ingresos! 🚀💰 