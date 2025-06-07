// ==================================================
// 🔍 PDF Diagnostic Utilities
// ==================================================

import { debugLog, errorLog } from "../config/environment.js";

// Función para diagnosticar problemas con archivos PDF
export const diagnosePdfFile = (file) => {
  const diagnosis = {
    file: {
      name: file.name,
      size: file.size,
      type: file.type,
      sizeInMB: (file.size / 1024 / 1024).toFixed(2),
    },
    issues: [],
    suggestions: [],
    canProcess: true,
  };

  // Verificar nombre del archivo
  if (!file.name.toLowerCase().endsWith(".pdf")) {
    diagnosis.issues.push({
      type: "warning",
      message: "El archivo no tiene extensión .pdf",
    });
    diagnosis.suggestions.push("Verifica que sea realmente un archivo PDF");
  }

  // Verificar tipo MIME
  if (!file.type.includes("pdf") && !file.type.includes("application/pdf")) {
    diagnosis.issues.push({
      type: "warning",
      message: `Tipo MIME inesperado: ${file.type}`,
    });
    diagnosis.suggestions.push("El archivo podría no ser un PDF válido");
  }

  // Verificar tamaño
  if (file.size === 0) {
    diagnosis.issues.push({
      type: "error",
      message: "El archivo está vacío",
    });
    diagnosis.canProcess = false;
    diagnosis.suggestions.push("Selecciona un archivo PDF con contenido");
  } else if (file.size > 50 * 1024 * 1024) {
    // 50MB
    diagnosis.issues.push({
      type: "error",
      message: `Archivo muy grande: ${diagnosis.file.sizeInMB}MB`,
    });
    diagnosis.canProcess = false;
    diagnosis.suggestions.push(
      "Reduce el tamaño del PDF o divídelo en partes más pequeñas"
    );
  } else if (file.size > 10 * 1024 * 1024) {
    // 10MB
    diagnosis.issues.push({
      type: "warning",
      message: `Archivo grande: ${diagnosis.file.sizeInMB}MB - podría ser lento`,
    });
    diagnosis.suggestions.push(
      "Considera usar un PDF más pequeño para mejor rendimiento"
    );
  }

  // Verificar tamaño mínimo razonable
  if (file.size < 1024) {
    // 1KB
    diagnosis.issues.push({
      type: "warning",
      message: "Archivo muy pequeño - podría estar vacío o corrupto",
    });
    diagnosis.suggestions.push("Verifica que el PDF contenga información");
  }

  return diagnosis;
};

// Función para mostrar diagnóstico en consola
export const logPdfDiagnosis = (diagnosis) => {
  debugLog("🔍 DIAGNÓSTICO DE PDF:", diagnosis.file.name);
  debugLog(`  📁 Tamaño: ${diagnosis.file.sizeInMB}MB`);
  debugLog(`  📄 Tipo: ${diagnosis.file.type}`);

  if (diagnosis.issues.length === 0) {
    debugLog("  ✅ No se detectaron problemas");
  } else {
    debugLog(`  ⚠️  Se detectaron ${diagnosis.issues.length} problema(s):`);
    diagnosis.issues.forEach((issue, index) => {
      const icon = issue.type === "error" ? "❌" : "⚠️";
      debugLog(`    ${index + 1}. ${icon} ${issue.message}`);
    });
  }

  if (diagnosis.suggestions.length > 0) {
    debugLog("  💡 Sugerencias:");
    diagnosis.suggestions.forEach((suggestion, index) => {
      debugLog(`    ${index + 1}. ${suggestion}`);
    });
  }

  debugLog(`  🎯 ¿Se puede procesar? ${diagnosis.canProcess ? "Sí" : "No"}`);
};

// Función para verificar compatibilidad con PDF.js
export const checkPdfJsCompatibility = async () => {
  try {
    // Verificar que PDF.js esté disponible
    const pdfjsLib = await import("pdfjs-dist");

    if (!pdfjsLib) {
      throw new Error("PDF.js no está disponible");
    }

    // Verificar configuración del worker
    if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
      throw new Error("Worker de PDF.js no configurado");
    }

    // Intentar crear un documento de prueba básico
    const testData = new Uint8Array([
      0x25,
      0x50,
      0x44,
      0x46,
      0x2d,
      0x31,
      0x2e,
      0x34, // "%PDF-1.4"
    ]);

    debugLog("✅ PDF.js está disponible y configurado");
    return {
      available: true,
      workerConfigured: true,
      version: pdfjsLib.version || "unknown",
    };
  } catch (error) {
    errorLog("❌ Problema con PDF.js:", error);
    return {
      available: false,
      workerConfigured: false,
      error: error.message,
    };
  }
};

// Función para generar reporte de compatibilidad
export const generateCompatibilityReport = async () => {
  const report = {
    timestamp: new Date().toISOString(),
    browser: {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
    },
    features: {
      fileReader: typeof FileReader !== "undefined",
      arrayBuffer: typeof ArrayBuffer !== "undefined",
      worker: typeof Worker !== "undefined",
    },
    pdfjs: await checkPdfJsCompatibility(),
  };

  debugLog("📋 Reporte de compatibilidad:", report);
  return report;
};

// Tipos de archivos PDF problemáticos comunes
export const PDF_ISSUE_TYPES = {
  SCANNED: {
    name: "PDF Escaneado",
    description: "PDF que contiene solo imágenes escaneadas",
    symptoms: ["Muy poco texto extraído", "Solo imágenes visibles"],
    solutions: [
      "Usar PDF con texto seleccionable",
      "Aplicar OCR al documento",
      "Convertir a PDF con texto",
    ],
  },
  PROTECTED: {
    name: "PDF Protegido",
    description: "PDF con restricciones de copia o contraseña",
    symptoms: ["Error de permisos", "Solicitud de contraseña"],
    solutions: [
      "Desbloquear el PDF",
      "Usar PDF sin protección",
      "Contactar al propietario del documento",
    ],
  },
  CORRUPTED: {
    name: "PDF Corrupto",
    description: "Archivo PDF dañado o incompleto",
    symptoms: ["Errores de formato", "No se puede abrir"],
    solutions: [
      "Volver a descargar el archivo",
      "Reparar el PDF",
      "Usar una copia diferente",
    ],
  },
  COMPLEX: {
    name: "PDF Complejo",
    description: "PDF con formato muy complejo o fuentes especiales",
    symptoms: ["Texto mal extraído", "Caracteres extraños"],
    solutions: [
      "Simplificar el formato",
      "Convertir a PDF estándar",
      "Usar fuentes comunes",
    ],
  },
};

// Función para identificar tipo de problema
export const identifyPdfIssueType = (diagnosis, extractedText) => {
  const possibleIssues = [];

  // PDF escaneado
  if (
    extractedText &&
    extractedText.length < 100 &&
    diagnosis.file.size > 1024 * 1024
  ) {
    possibleIssues.push(PDF_ISSUE_TYPES.SCANNED);
  }

  // PDF protegido
  if (extractedText && extractedText.includes("Password")) {
    possibleIssues.push(PDF_ISSUE_TYPES.PROTECTED);
  }

  // PDF corrupto
  if (extractedText && extractedText.includes("Error al leer PDF")) {
    possibleIssues.push(PDF_ISSUE_TYPES.CORRUPTED);
  }

  // PDF complejo
  if (
    extractedText &&
    extractedText.length > 0 &&
    extractedText.includes("�")
  ) {
    possibleIssues.push(PDF_ISSUE_TYPES.COMPLEX);
  }

  return possibleIssues;
};
