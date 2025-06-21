// Maintenance Mode Configuration
export const MAINTENANCE_CONFIG = {
  // Set to true to enable maintenance mode
  isMaintenanceMode: true,

  // Maintenance settings
  maintenanceSettings: {
    title: "Sistema de Pagos en Mantenimiento",
    description:
      "Estamos mejorando nuestro sistema de pagos para ofrecerte una mejor experiencia.",
    estimatedTime: "Los pagos estarán disponibles próximamente",
    contactEmail: "soporte@ejemplo.com",
    features: [
      { icon: "🔧", text: "Actualizando sistema de pagos" },
      { icon: "🚀", text: "Optimizando rendimiento" },
      { icon: "🔒", text: "Mejorando seguridad" },
    ],
  },
};

// Helper function to check if maintenance mode is active
export const isMaintenanceModeActive = () => {
  return MAINTENANCE_CONFIG.isMaintenanceMode;
};

// Helper function to get maintenance settings
export const getMaintenanceSettings = () => {
  return MAINTENANCE_CONFIG.maintenanceSettings;
};
