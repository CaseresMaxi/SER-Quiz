# 🔧 Modo Mantenimiento - Sistema de Pagos

## Configuración del Modo Mantenimiento

El sistema de pagos incluye un modo mantenimiento que permite deshabilitar temporalmente todas las funcionalidades de pago mostrando un cartel informativo atractivo.

## Cómo Habilitar/Deshabilitar el Modo Mantenimiento

### 1. Configuración Central
Edita el archivo `src/config/maintenance.js`:

```javascript
export const MAINTENANCE_CONFIG = {
  // Cambiar a false para deshabilitar el modo mantenimiento
  isMaintenanceMode: true,  // ← Cambia esto
  
  // Configuración del mensaje de mantenimiento
  maintenanceSettings: {
    title: "Sistema de Pagos en Mantenimiento",
    description: "Estamos mejorando nuestro sistema de pagos para ofrecerte una mejor experiencia.",
    estimatedTime: "Los pagos estarán disponibles próximamente",
    contactEmail: "soporte@ejemplo.com",
    features: [
      { icon: "🔧", text: "Actualizando sistema de pagos" },
      { icon: "🚀", text: "Optimizando rendimiento" },
      { icon: "🔒", text: "Mejorando seguridad" }
    ]
  }
};
```

### 2. Estados del Sistema

#### Modo Mantenimiento ACTIVADO (`isMaintenanceMode: true`)
- ✅ Se muestra un cartel de mantenimiento bonito
- ❌ Los botones de pago están deshabilitados
- ❌ La sección de precios está oculta
- ❌ Los códigos promocionales están ocultos
- ✅ Los usuarios pueden seguir usando el contenido gratuito

#### Modo Mantenimiento DESACTIVADO (`isMaintenanceMode: false`)
- ❌ No se muestra el cartel de mantenimiento
- ✅ Los botones de pago funcionan normalmente
- ✅ La sección de precios está visible
- ✅ Los códigos promocionales están disponibles
- ✅ Funcionalidad completa de pagos

## Personalización del Mensaje

Puedes personalizar el mensaje de mantenimiento editando `maintenanceSettings` en el archivo de configuración:

```javascript
maintenanceSettings: {
  title: "Tu título personalizado",
  description: "Tu descripción personalizada",
  estimatedTime: "Tu tiempo estimado personalizado",
  contactEmail: "tu-email@ejemplo.com",
  features: [
    { icon: "🛠️", text: "Tu característica personalizada 1" },
    { icon: "⚡", text: "Tu característica personalizada 2" },
    { icon: "🔐", text: "Tu característica personalizada 3" }
  ]
}
```

## Características del Cartel de Mantenimiento

### Diseño Atractivo
- 🎨 Gradiente moderno con colores llamativos
- ⚙️ Animación del ícono de engranaje rotando
- ✨ Efecto de brillo animado
- 📱 Completamente responsive

### Información Clara
- 📋 Título y descripción personalizables
- 📝 Lista de características con íconos
- 🔴 Indicador de estado pulsante
- 📧 Información de contacto
- ⏰ Tiempo estimado de finalización

### Experiencia de Usuario
- 🚫 Botones de pago deshabilitados con indicación visual
- 💡 Tooltip explicativo en botones
- 📱 Adaptable a todos los tamaños de pantalla
- 🎯 Mensaje claro y profesional

## Componentes Afectados

Cuando el modo mantenimiento está activado, los siguientes componentes se ven afectados:

1. **PricingSection** - Muestra el cartel de mantenimiento
2. **PaymentButton** - Botones deshabilitados con indicación
3. **PricingCard** - Tarjetas de precio ocultas
4. **Códigos promocionales** - Sección oculta

## Casos de Uso

### Cuándo Habilitar el Modo Mantenimiento
- 🔧 Actualizaciones del sistema de pagos
- 🛠️ Mantenimiento de MercadoPago
- 📝 Cambios en los planes de precios
- 🔒 Actualizaciones de seguridad
- 🌐 Migraciones de servidor

### Cuándo Deshabilitar el Modo Mantenimiento
- ✅ Mantenimiento completado
- ✅ Sistema de pagos funcionando correctamente
- ✅ Pruebas de pago exitosas
- ✅ Confirmación de funcionalidad completa

## Notas Importantes

- ⚠️ Recuerda cambiar el email de contacto en la configuración
- ⚠️ Prueba el sistema después de deshabilitar el mantenimiento
- ⚠️ Comunica a los usuarios sobre el mantenimiento con anticipación
- ⚠️ Considera hacer el mantenimiento en horarios de menor tráfico

## Comandos Rápidos

### Habilitar Mantenimiento
```bash
# Editar el archivo de configuración
nano src/config/maintenance.js
# Cambiar isMaintenanceMode: true
```

### Deshabilitar Mantenimiento
```bash
# Editar el archivo de configuración
nano src/config/maintenance.js
# Cambiar isMaintenanceMode: false
```

### Reiniciar el Servidor de Desarrollo
```bash
npm run dev
# o
yarn dev
```

---

*Este sistema de mantenimiento está diseñado para proporcionar una experiencia de usuario profesional y clara durante períodos de mantenimiento del sistema de pagos.* 