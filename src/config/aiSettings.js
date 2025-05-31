// Configuración personalizable para la generación de preguntas con IA

export const AI_CONFIG = {
  // Configuración del modelo OpenAI
  model: "gpt-4o-mini", // Opciones: "gpt-4-turbo-preview", "gpt-3.5-turbo", "gpt-4"
  maxTokens: 3000, // Máximo de tokens por respuesta
  temperature: 0.7, // Creatividad (0.0 = conservador, 1.0 = creativo)

  // Configuración de preguntas
  questionsPerGeneration: 5, // Número de preguntas a generar
  optionsPerQuestion: 4, // Número de opciones por pregunta (3-4 recomendado)

  // Configuración de archivos
  maxFileSize: 10 * 1024 * 1024, // 10MB en bytes
  maxPdfPages: 10, // Máximo páginas de PDF a procesar

  // Tipos de archivo soportados
  supportedFileTypes: {
    text: [".txt", ".md", ".csv"],
    pdf: [".pdf"],
    images: [".jpg", ".jpeg", ".png", ".gif", ".bmp"],
    office: [".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx"],
  },

  // Configuración de prompts
  systemPrompt:
    "Eres un experto en crear preguntas de examen basadas en contenido educativo. Genera preguntas claras, precisas y educativas en español.",

  // Instrucciones específicas para la generación
  instructions: [
    "Genera preguntas educativas basadas en el contenido proporcionado",
    "Cada pregunta debe tener opciones de respuesta claras",
    "Puede haber una o múltiples respuestas correctas por pregunta",
    "Las preguntas deben ser claras, precisas y educativas",
    "Incluye una fuente para cada pregunta basada en el archivo correspondiente",
    "Si hay archivos sin contenido procesable, enfócate en los que sí tienen contenido útil",
    "Si no hay suficiente contenido, genera preguntas generales relacionadas con el tema",
  ],
};

// Función para obtener el prompt del sistema personalizado
export function getSystemPrompt() {
  return AI_CONFIG.systemPrompt;
}

// Función para obtener las instrucciones formateadas
export function getFormattedInstructions() {
  return AI_CONFIG.instructions
    .map((instruction, index) => `${index + 1}. ${instruction}`)
    .join("\n");
}

// Función para validar el tamaño de archivo
export function isFileSizeValid(fileSize) {
  return fileSize <= AI_CONFIG.maxFileSize;
}

// Función para verificar si un tipo de archivo es soportado
export function isFileTypeSupported(fileName, fileType) {
  const extension = fileName.toLowerCase().substring(fileName.lastIndexOf("."));

  return (
    Object.values(AI_CONFIG.supportedFileTypes).flat().includes(extension) ||
    fileType.startsWith("text/")
  );
}

// Función para obtener la configuración del modelo
export function getModelConfig() {
  return {
    model: AI_CONFIG.model,
    max_tokens: AI_CONFIG.maxTokens,
    temperature: AI_CONFIG.temperature,
  };
}

// Función para formatear el tamaño de archivo
export function formatFileSize(bytes) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}
