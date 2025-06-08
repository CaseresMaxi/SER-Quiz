import OpenAI from "openai";
import * as pdfjsLib from "pdfjs-dist";
import {
  AI_CONFIG,
  getSystemPrompt,
  getFormattedInstructions,
  getModelConfig,
  getQuestionsCount,
  getEvaluationSystemPrompt,
} from "./aiSettings";
import {
  ENV_CONFIG,
  debugLog,
  apiLog,
  errorLog,
  isDevelopment,
} from "./environment";
import { diagnosePdfFile, logPdfDiagnosis } from "../utils/pdfDiagnostic";

// Configurar worker de PDF.js para Vite con manejo de errores mejorado
try {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;
  debugLog("✅ PDF.js worker configurado correctamente");
} catch (error) {
  errorLog("❌ Error configurando PDF.js worker:", error);
}

// Inicializar cliente de OpenAI con configuración de entorno
const DEFAULT_API_KEY = ENV_CONFIG.OPENAI_API_KEY;

// Función para crear cliente OpenAI con API key
const createOpenAIClient = (apiKey = null) => {
  const effectiveApiKey = apiKey || DEFAULT_API_KEY;

  if (!effectiveApiKey) {
    errorLog("No se ha configurado una API key de OpenAI");
    throw new Error(
      "API key de OpenAI no configurada. Configúrala en el archivo .env o en la interfaz de usuario."
    );
  }

  apiLog(
    "Creando cliente OpenAI con API key:",
    effectiveApiKey.substring(0, 8) + "..."
  );

  return new OpenAI({
    apiKey: effectiveApiKey,
    dangerouslyAllowBrowser: true, // Permite usar en el navegador
  });
};

// Cliente OpenAI por defecto (si hay API key configurada)
export const openai = DEFAULT_API_KEY ? createOpenAIClient() : null;

// Function to generate questions with automatic PDF Assistant detection
export async function generateQuestionsWithSmartDetection(
  files,
  customApiKey = null,
  questionType = "choice",
  aiConfig = null
) {
  // Auto-detect if we should use Assistants for PDFs
  const hasPdfFiles = files.some(
    (file) =>
      file.type === "application/pdf" ||
      file.name.toLowerCase().endsWith(".pdf")
  );

  // Use Assistants API for PDFs by default for better quality and native PDF support
  const useAssistants = hasPdfFiles;

  return await generateQuestionsFromFiles(
    files,
    customApiKey,
    questionType,
    aiConfig,
    useAssistants
  );
}

// Function to generate questions with AI
export async function generateQuestionsFromFiles(
  files,
  customApiKey = null,
  questionType = "choice",
  aiConfig = null, // Nuevo parámetro para configuraciones de IA
  useAssistants = false // Nuevo parámetro para usar Assistants API
) {
  try {
    // Use custom API key if provided, otherwise use default
    const effectiveApiKey = customApiKey || DEFAULT_API_KEY;

    apiLog(
      `🚀 Generando preguntas con ${
        questionType === "development" ? "desarrollo" : "opción múltiple"
      } ${useAssistants ? "(usando Assistants API)" : "(método tradicional)"}`
    );
    debugLog("Configuración AI:", {
      effectiveApiKey: effectiveApiKey?.substring(0, 8) + "...",
      questionType,
      aiConfig,
      useAssistants,
    });

    // Create OpenAI client with the appropriate API key
    const openaiClient = createOpenAIClient(effectiveApiKey);

    // Check if we should use Assistants API for PDFs
    const hasPdfFiles = files.some(
      (file) =>
        file.type === "application/pdf" ||
        file.name.toLowerCase().endsWith(".pdf")
    );

    if (useAssistants && hasPdfFiles) {
      // Use new Assistants API flow for PDFs
      return await generateQuestionsWithAssistants(
        files,
        openaiClient,
        questionType,
        aiConfig
      );
    }

    // Original flow for other files or when Assistants is disabled
    // Validate files before processing
    const validFiles = files.filter((file) => {
      if (file.size > AI_CONFIG.maxFileSize) {
        console.warn(
          `Archivo ${file.name} es demasiado grande (${(
            file.size /
            1024 /
            1024
          ).toFixed(1)}MB)`
        );
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) {
      throw new Error("No hay archivos válidos para procesar");
    }

    // Process files and extract content
    const fileContents = await processFiles(validFiles);

    // Validate content quality before sending to API
    const contentValidation = validateContentForAPI(fileContents);

    if (!contentValidation.isValid) {
      // Don't waste API tokens on invalid content
      throw new Error(contentValidation.errorMessage);
    }

    debugLog(
      `✅ Contenido validado para API: ${contentValidation.totalUsableContent} caracteres útiles`
    );

    // Create prompt for question generation based on question type
    const prompt = createQuestionGenerationPrompt(
      fileContents,
      questionType,
      aiConfig
    );

    // Get model configuration
    const modelConfig = getModelConfig();

    // Call OpenAI with the appropriate client
    const response = await openaiClient.chat.completions.create({
      model: modelConfig.model,
      messages: [
        {
          role: "system",
          content: getSystemPrompt(questionType),
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      max_tokens: modelConfig.max_tokens,
      temperature: modelConfig.temperature,
    });

    // Process response and convert to app format
    const questions = parseQuestionsFromResponse(
      response.choices[0].message.content,
      questionType
    );

    return questions;
  } catch (error) {
    console.error("Error generating questions with OpenAI:", error);

    // Specific OpenAI error handling
    if (error.message.includes("API key")) {
      throw new Error("API key de OpenAI inválida. Verifica tu configuración.");
    } else if (error.message.includes("quota")) {
      throw new Error("Has excedido tu cuota de OpenAI. Verifica tu cuenta.");
    } else if (error.message.includes("rate limit")) {
      throw new Error(
        "Límite de velocidad excedido. Intenta de nuevo en unos minutos."
      );
    }

    throw new Error(`Error al generar preguntas: ${error.message}`);
  }
}

// Function to generate questions using OpenAI Assistants API
async function generateQuestionsWithAssistants(
  files,
  openaiClient,
  questionType,
  aiConfig
) {
  try {
    apiLog("📤 Subiendo archivos a OpenAI...");

    // Step 1: Upload files to OpenAI
    const uploadedFiles = [];
    for (const file of files) {
      if (
        file.type === "application/pdf" ||
        file.name.toLowerCase().endsWith(".pdf")
      ) {
        debugLog(`🔄 Subiendo PDF: ${file.name}`);
        const uploadedFile = await uploadFileToOpenAI(openaiClient, file);
        uploadedFiles.push(uploadedFile);
      } else {
        debugLog(`⏭️  Saltando archivo no-PDF: ${file.name}`);
        // For non-PDF files, we could still process them traditionally
        // or convert them to text and upload as text files
      }
    }

    if (uploadedFiles.length === 0) {
      throw new Error("No se pudieron subir archivos PDF para procesamiento");
    }

    apiLog(`✅ ${uploadedFiles.length} archivo(s) subido(s) exitosamente`);

    // Step 2: Create or get Assistant
    const assistantId = await createQuestionGeneratorAssistant(
      openaiClient,
      questionType,
      aiConfig
    );

    // Step 3: Create thread and process with Assistant
    const questions = await processFilesWithAssistant(
      openaiClient,
      assistantId,
      uploadedFiles,
      questionType,
      aiConfig
    );

    // Step 4: Clean up uploaded files (optional but recommended)
    await cleanupUploadedFiles(openaiClient, uploadedFiles);

    return questions;
  } catch (error) {
    errorLog("❌ Error en generación con Assistants:", error);
    throw new Error(`Error usando Assistants API: ${error.message}`);
  }
}

// Function to upload a file to OpenAI
async function uploadFileToOpenAI(openaiClient, file) {
  try {
    debugLog(
      `📤 Subiendo archivo: ${file.name} (${(file.size / 1024 / 1024).toFixed(
        2
      )}MB)`
    );

    // Check file size limits (512MB max for Assistants)
    const maxSize = 512 * 1024 * 1024; // 512MB
    if (file.size > maxSize) {
      throw new Error(
        `Archivo ${file.name} es demasiado grande (${(
          file.size /
          1024 /
          1024
        ).toFixed(2)}MB). Máximo permitido: 512MB`
      );
    }

    // Convert File to the format expected by OpenAI
    const formData = new FormData();
    formData.append("file", file);
    formData.append("purpose", "assistants");

    // Use fetch directly for file upload (OpenAI client doesn't handle FormData well)
    const response = await fetch("https://api.openai.com/v1/files", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiClient.apiKey}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        `Error subiendo archivo: ${response.status} - ${
          errorData.error?.message || "Error desconocido"
        }`
      );
    }

    const uploadResult = await response.json();
    debugLog(`✅ Archivo subido: ${uploadResult.id}`);

    return {
      id: uploadResult.id,
      filename: uploadResult.filename,
      originalFile: file,
    };
  } catch (error) {
    errorLog(`❌ Error subiendo archivo ${file.name}:`, error);
    throw error;
  }
}

// Function to create or get a question generator assistant
async function createQuestionGeneratorAssistant(
  openaiClient,
  questionType,
  aiConfig
) {
  try {
    apiLog("🤖 Creando Assistant para generación de preguntas...");

    const modelConfig = getModelConfig();
    const systemPrompt = getSystemPrompt(questionType);

    const assistant = await openaiClient.beta.assistants.create({
      name: `Generador de Preguntas ${
        questionType === "development" ? "Desarrollo" : "Opción Múltiple"
      }`,
      instructions: `${systemPrompt}

CONTEXTO ADICIONAL:
Eres un asistente especializado en generar preguntas educativas de alta calidad basándote en documentos PDF proporcionados por el usuario. Tu objetivo es crear preguntas que evalúen la comprensión profunda del material.

REGLAS ESPECÍFICAS:
1. Analiza completamente los documentos PDF proporcionados
2. Basa todas las preguntas ÚNICAMENTE en el contenido de los documentos
3. NO agregues información externa o conocimiento general
4. Mantén el nivel académico apropiado (universitario)
5. Asegúrate de que las preguntas sean claras y precisas
6. Incluye contexto suficiente en cada pregunta para que sea autocontenida

IMPORTANTE: Siempre responde con formato JSON válido sin texto adicional antes o después.`,
      model: modelConfig.model,
      tools: [
        { type: "file_search" }, // Enable file search for PDFs
      ],
    });

    debugLog(`✅ Assistant creado: ${assistant.id}`);
    return assistant.id;
  } catch (error) {
    errorLog("❌ Error creando Assistant:", error);
    throw new Error(`Error creando Assistant: ${error.message}`);
  }
}

// Function to process files with the Assistant
async function processFilesWithAssistant(
  openaiClient,
  assistantId,
  uploadedFiles,
  questionType,
  aiConfig
) {
  try {
    apiLog("🧵 Creando thread y procesando con Assistant...");

    // Step 1: Create a thread
    const thread = await openaiClient.beta.threads.create();
    debugLog(`✅ Thread creado: ${thread.id}`);

    // Step 2: Create the prompt for question generation
    const fileIds = uploadedFiles.map((f) => f.id);
    const questionsToGenerate = getQuestionsCount(questionType);

    const promptMessage = createAssistantPrompt(
      questionType,
      questionsToGenerate,
      aiConfig
    );

    // Step 3: Add message to thread with file attachments
    await openaiClient.beta.threads.messages.create(thread.id, {
      role: "user",
      content: promptMessage,
      attachments: fileIds.map((fileId) => ({
        file_id: fileId,
        tools: [{ type: "file_search" }],
      })),
    });

    debugLog("📨 Mensaje enviado al Assistant con archivos adjuntos");

    // Step 4: Run the assistant
    const run = await openaiClient.beta.threads.runs.create(thread.id, {
      assistant_id: assistantId,
    });

    debugLog(`🏃 Run iniciado: ${run.id}`);

    // Step 5: Wait for completion
    let runStatus = run;
    let attempts = 0;
    const maxAttempts = 60; // 5 minutes max

    while (runStatus.status !== "completed" && attempts < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 5000)); // Wait 5 seconds
      runStatus = await openaiClient.beta.threads.runs.retrieve(
        thread.id,
        run.id
      );
      attempts++;

      debugLog(
        `🔄 Status del run: ${runStatus.status} (${attempts}/${maxAttempts})`
      );

      if (runStatus.status === "failed") {
        throw new Error(
          `Assistant run falló: ${
            runStatus.last_error?.message || "Error desconocido"
          }`
        );
      }

      if (runStatus.status === "requires_action") {
        // Handle any required actions if needed
        debugLog(
          "⚠️  Run requiere acción - esto no debería ocurrir en este flujo"
        );
      }
    }

    if (runStatus.status !== "completed") {
      throw new Error("Timeout: El Assistant tardó demasiado en responder");
    }

    // Step 6: Get the response
    const messages = await openaiClient.beta.threads.messages.list(thread.id);
    const assistantMessage = messages.data.find(
      (msg) => msg.role === "assistant"
    );

    if (!assistantMessage || !assistantMessage.content[0]) {
      throw new Error("No se recibió respuesta del Assistant");
    }

    const responseContent = assistantMessage.content[0].text.value;
    debugLog("✅ Respuesta recibida del Assistant");

    // Step 7: Parse and return questions
    const questions = parseQuestionsFromResponse(responseContent, questionType);

    // Step 8: Clean up thread
    try {
      await openaiClient.beta.threads.del(thread.id);
      debugLog("🧹 Thread eliminado");
    } catch (cleanupError) {
      debugLog("⚠️  No se pudo eliminar el thread:", cleanupError.message);
    }

    return questions;
  } catch (error) {
    errorLog("❌ Error procesando con Assistant:", error);
    throw error;
  }
}

// Function to create prompt for Assistant
function createAssistantPrompt(questionType, questionsToGenerate, aiConfig) {
  const basePrompt = `Analiza los documentos PDF adjuntos y genera exactamente ${questionsToGenerate} preguntas de ${
    questionType === "development" ? "desarrollo" : "opción múltiple"
  } en español.

INSTRUCCIONES CRÍTICAS:
1. Basa las preguntas ÚNICAMENTE en el contenido de los PDFs adjuntos
2. NO uses conocimiento externo - solo lo que aparece en los documentos
3. Las preguntas deben ser autocontenidas con contexto suficiente
4. Nivel universitario pero basado estrictamente en el material proporcionado
5. Responde ÚNICAMENTE con JSON válido sin texto adicional

${
  questionType === "development"
    ? `FORMATO PARA PREGUNTAS DE DESARROLLO:
[
  {
    "question": "Considerando que [contexto del documento], desarrolla y analiza [qué se espera]...",
    "options": ["Puntos clave del PDF", "Aspectos del material", "Criterios del documento"],
    "correct": ["Respuestas esperadas del contenido", "Puntos del PDF"],
    "suggestedAnswer": "Respuesta detallada de 200-400 palabras basada exclusivamente en el contenido del PDF",
    "source": "Generado de: nombre_archivo.pdf"
  }
]`
    : `FORMATO PARA PREGUNTAS DE OPCIÓN MÚLTIPLE:
[
  {
    "question": "En el contexto de [tema del PDF], ¿cuál/cómo/qué [pregunta específica]?",
    "options": ["Opción A", "Opción B", "Opción C", "Opción D"],
    "correct": ["Opción A", "Opción C"],
    "suggestedAnswer": "Explicación de por qué estas opciones son correctas según el PDF",
    "source": "Generado de: nombre_archivo.pdf"
  }
]`
}

Genera exactamente ${questionsToGenerate} preguntas basándote exclusivamente en los PDFs adjuntos.`;

  return basePrompt;
}

// Function to clean up uploaded files
async function cleanupUploadedFiles(openaiClient, uploadedFiles) {
  try {
    apiLog("🧹 Limpiando archivos subidos...");

    for (const file of uploadedFiles) {
      try {
        await openaiClient.files.del(file.id);
        debugLog(`🗑️  Archivo eliminado: ${file.filename}`);
      } catch (error) {
        debugLog(
          `⚠️  No se pudo eliminar archivo ${file.filename}:`,
          error.message
        );
      }
    }

    debugLog("✅ Limpieza de archivos completada");
  } catch (error) {
    debugLog("⚠️  Error en limpieza de archivos:", error.message);
  }
}

// Función para procesar archivos y extraer contenido con mejor logging
async function processFiles(files) {
  debugLog(`📂 Procesando ${files.length} archivo(s)...`);
  const contents = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    debugLog(
      `🔄 Procesando archivo ${i + 1}/${files.length}: ${file.name} (${
        file.type
      })`
    );

    try {
      let content = "";

      if (file.type.startsWith("text/")) {
        debugLog(`📝 Procesando archivo de texto: ${file.name}`);
        content = await readTextFile(file);
        debugLog(`✅ Archivo de texto procesado: ${content.length} caracteres`);
      } else if (
        file.type === "application/pdf" ||
        file.name.toLowerCase().endsWith(".pdf")
      ) {
        debugLog(`📄 Procesando archivo PDF: ${file.name}`);

        // Diagnosticar PDF antes del procesamiento
        const diagnosis = diagnosePdfFile(file);
        logPdfDiagnosis(diagnosis);

        if (!diagnosis.canProcess) {
          throw new Error(
            `PDF no se puede procesar: ${diagnosis.issues
              .map((i) => i.message)
              .join(", ")}`
          );
        }

        content = await readPdfFile(file);
        debugLog(`✅ PDF procesado: ${content.length} caracteres`);
      } else if (file.type.startsWith("image/")) {
        debugLog(`🖼️  Archivo de imagen detectado: ${file.name}`);
        content = `[Imagen: ${file.name} - ${(file.size / 1024).toFixed(
          1
        )}KB]\nNota: El contenido de imágenes se puede procesar con GPT-4 Vision en futuras versiones.`;
      } else if (
        file.type.includes("csv") ||
        file.name.toLowerCase().endsWith(".csv")
      ) {
        debugLog(`📊 Procesando archivo CSV: ${file.name}`);
        content = await readTextFile(file);
        debugLog(`✅ CSV procesado: ${content.length} caracteres`);
      } else if (file.name.toLowerCase().endsWith(".txt")) {
        debugLog(`📄 Procesando archivo TXT: ${file.name}`);
        content = await readTextFile(file);
        debugLog(`✅ TXT procesado: ${content.length} caracteres`);
      } else {
        debugLog(
          `❓ Tipo de archivo no reconocido: ${file.name} (${file.type})`
        );
        content = `[Archivo: ${file.name} - ${(file.size / 1024).toFixed(
          1
        )}KB]\nTipo: ${
          file.type
        }\nNota: Contenido no procesable directamente, pero puede contener información relevante.`;
      }

      // Verificar que se extrajo contenido útil
      const contentLength = content.trim().length;
      if (contentLength < 10) {
        debugLog(
          `⚠️  Archivo con muy poco contenido: ${file.name} (${contentLength} caracteres)`
        );
      }

      contents.push({
        filename: file.name,
        type: file.type,
        content: content,
        size: file.size,
        processedSuccessfully: !content.includes("[Error al procesar"),
        contentLength: contentLength,
      });

      debugLog(`📋 Archivo agregado al procesamiento: ${file.name}`);
    } catch (error) {
      errorLog(`❌ Error procesando archivo ${file.name}:`, {
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        error: error.message,
      });

      contents.push({
        filename: file.name,
        type: file.type,
        content:
          `[❌ Error al procesar archivo: ${file.name}]\n\n` +
          `🔍 Detalles del error: ${error.message}\n\n` +
          `💡 Posibles soluciones:\n` +
          `- Verifica que el archivo no esté corrupto\n` +
          `- Intenta con un archivo más pequeño\n` +
          `- Verifica el formato del archivo\n` +
          `- Contacta soporte si el problema persiste`,
        size: file.size,
        processedSuccessfully: false,
        contentLength: 0,
      });
    }
  }

  // Resumen del procesamiento
  const successfulFiles = contents.filter(
    (c) => c.processedSuccessfully
  ).length;
  const totalContentLength = contents.reduce(
    (sum, c) => sum + c.contentLength,
    0
  );

  debugLog(`📊 Resumen del procesamiento:`);
  debugLog(
    `  - Archivos procesados exitosamente: ${successfulFiles}/${files.length}`
  );
  debugLog(`  - Contenido total extraído: ${totalContentLength} caracteres`);
  debugLog(`  - Archivos con errores: ${files.length - successfulFiles}`);

  if (successfulFiles === 0) {
    errorLog("❌ No se pudo procesar ningún archivo correctamente");
  } else if (totalContentLength < 100) {
    debugLog("⚠️  Muy poco contenido extraído de los archivos");
  }

  return contents;
}

// Función para validar que el contenido es apto para enviar a la API
function validateContentForAPI(fileContents) {
  debugLog("🔍 Validando contenido para envío a API...");

  const validation = {
    isValid: false,
    totalUsableContent: 0,
    processedFiles: 0,
    failedFiles: 0,
    issues: [],
    errorMessage: "",
    suggestions: [],
  };

  let usableText = "";
  let hasAnyValidContent = false;

  for (const fileContent of fileContents) {
    debugLog(`🔎 Analizando: ${fileContent.filename}`);

    // Verificar si el archivo se procesó exitosamente
    if (!fileContent.processedSuccessfully) {
      validation.failedFiles++;
      validation.issues.push({
        file: fileContent.filename,
        issue: "No se pudo procesar el archivo",
        type: "error",
      });
      continue;
    }

    // Extraer texto útil (sin mensajes de error o advertencias)
    const content = fileContent.content;

    // Filtrar contenido que NO es útil para la API
    if (
      content.includes("[Error al procesar") ||
      content.includes("[❌ Error") ||
      content.includes("[⚠️  PDF procesado pero con muy poco texto extraíble]")
    ) {
      validation.failedFiles++;
      validation.issues.push({
        file: fileContent.filename,
        issue: "Archivo con errores o sin texto extraíble",
        type: "content_error",
      });

      // Extraer información específica del error
      if (content.includes("PDF escaneado")) {
        validation.suggestions.push(
          "El PDF parece ser escaneado - usa un PDF con texto seleccionable o aplica OCR"
        );
      }
      if (content.includes("protegido con contraseña")) {
        validation.suggestions.push(
          "El PDF está protegido - desbloquéalo antes de subirlo"
        );
      }
      if (content.includes("demasiado grande")) {
        validation.suggestions.push(
          "El PDF es demasiado grande - reduce su tamaño o aumenta VITE_MAX_FILE_SIZE"
        );
      }

      continue;
    }

    // Extraer solo el texto real (sin metadatos de procesamiento)
    let cleanContent = content;

    // Remover metadatos de procesamiento pero conservar el texto real
    cleanContent = cleanContent
      .replace(/\[📊 Resumen:.*?\]/gs, "")
      .replace(/\[📈 Estadísticas:.*?\]/gs, "")
      .replace(/--- Página \d+ ---/g, "")
      .replace(/\[Sin texto extraíble.*?\]/g, "")
      .replace(/\[Nota:.*?\]/g, "")
      .trim();

    if (cleanContent.length > 50) {
      // Mínimo 50 caracteres de contenido real
      usableText += cleanContent + "\n\n";
      hasAnyValidContent = true;
      validation.processedFiles++;

      debugLog(
        `✅ ${fileContent.filename}: ${cleanContent.length} caracteres útiles`
      );
    } else {
      validation.failedFiles++;
      validation.issues.push({
        file: fileContent.filename,
        issue: `Muy poco contenido útil (${cleanContent.length} caracteres)`,
        type: "insufficient_content",
      });

      validation.suggestions.push(
        `${fileContent.filename}: Verifica que el archivo contenga texto seleccionable`
      );
    }
  }

  validation.totalUsableContent = usableText.trim().length;

  // Determinar si es válido para enviar a la API
  if (!hasAnyValidContent || validation.totalUsableContent < 100) {
    validation.isValid = false;

    // Crear mensaje de error elegante y específico
    validation.errorMessage = createUserFriendlyErrorMessage(validation);
  } else {
    validation.isValid = true;
    debugLog(
      `✅ Validación exitosa: ${validation.processedFiles} archivos procesados, ${validation.totalUsableContent} caracteres útiles`
    );
  }

  return validation;
}

// Función para crear mensaje de error elegante para el usuario
function createUserFriendlyErrorMessage(validation) {
  let message = "🚫 No se puede generar el cuestionario\n\n";

  // Título específico según el problema principal
  if (validation.failedFiles === validation.issues.length) {
    message += "❌ No se pudo procesar ningún archivo correctamente.\n\n";
  } else {
    message +=
      "⚠️  Los archivos no contienen suficiente contenido útil para generar preguntas.\n\n";
  }

  // Detalles de problemas encontrados
  message += "🔍 PROBLEMAS DETECTADOS:\n";

  const errorsByType = {};
  validation.issues.forEach((issue) => {
    if (!errorsByType[issue.type]) {
      errorsByType[issue.type] = [];
    }
    errorsByType[issue.type].push(issue);
  });

  // Agrupar errores similares
  if (errorsByType.content_error) {
    message += `📄 Archivos con problemas de procesamiento: ${errorsByType.content_error.length}\n`;
    errorsByType.content_error.forEach((issue) => {
      message += `   • ${issue.file}: ${issue.issue}\n`;
    });
  }

  if (errorsByType.insufficient_content) {
    message += `📝 Archivos con poco contenido: ${errorsByType.insufficient_content.length}\n`;
    errorsByType.insufficient_content.forEach((issue) => {
      message += `   • ${issue.file}: ${issue.issue}\n`;
    });
  }

  if (errorsByType.error) {
    message += `💥 Archivos con errores: ${errorsByType.error.length}\n`;
    errorsByType.error.forEach((issue) => {
      message += `   • ${issue.file}: ${issue.issue}\n`;
    });
  }

  // Sugerencias específicas
  if (validation.suggestions.length > 0) {
    message += "\n💡 SOLUCIONES RECOMENDADAS:\n";
    const uniqueSuggestions = [...new Set(validation.suggestions)];
    uniqueSuggestions.forEach((suggestion) => {
      message += `   • ${suggestion}\n`;
    });
  }

  // Sugerencias generales
  message += "\n🛠️  ACCIONES SUGERIDAS:\n";
  message +=
    "   • Verifica que los PDFs contengan texto seleccionable (no sean escaneados)\n";
  message +=
    "   • Asegúrate de que los archivos no estén protegidos con contraseña\n";
  message += "   • Prueba con archivos más pequeños (menos de 10MB)\n";
  message += "   • Consulta 'PDF_TROUBLESHOOTING.md' para guía detallada\n";
  message += "   • Revisa la consola del navegador (F12) para logs técnicos\n";

  // Información adicional
  message += "\n📊 ESTADÍSTICAS:\n";
  message += `   • Total de archivos: ${
    validation.processedFiles + validation.failedFiles
  }\n`;
  message += `   • Archivos procesados: ${validation.processedFiles}\n`;
  message += `   • Archivos con errores: ${validation.failedFiles}\n`;
  message += `   • Contenido útil extraído: ${validation.totalUsableContent} caracteres\n`;

  return message;
}

// Función para leer archivos de texto
function readTextFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = (e) => reject(e);
    reader.readAsText(file);
  });
}

// Función para leer archivos PDF con manejo de errores mejorado
async function readPdfFile(file) {
  debugLog(
    `📄 Procesando PDF: ${file.name} (${(file.size / 1024 / 1024).toFixed(
      2
    )}MB)`
  );

  try {
    // Validaciones previas
    if (!file || file.size === 0) {
      throw new Error("Archivo PDF vacío o inválido");
    }

    if (file.size > ENV_CONFIG.MAX_FILE_SIZE) {
      throw new Error(
        `Archivo demasiado grande: ${(file.size / 1024 / 1024).toFixed(
          2
        )}MB (máximo: ${ENV_CONFIG.MAX_FILE_SIZE / 1024 / 1024}MB)`
      );
    }

    // Verificar que sea realmente un PDF
    if (
      !file.type.includes("pdf") &&
      !file.name.toLowerCase().endsWith(".pdf")
    ) {
      throw new Error("El archivo no parece ser un PDF válido");
    }

    debugLog(`🔄 Convirtiendo PDF a ArrayBuffer...`);
    const arrayBuffer = await file.arrayBuffer();

    if (!arrayBuffer || arrayBuffer.byteLength === 0) {
      throw new Error("No se pudo leer el contenido del archivo PDF");
    }

    debugLog(`📖 Cargando documento PDF con PDF.js...`);
    const pdf = await pdfjsLib.getDocument({
      data: arrayBuffer,
      // Configuraciones adicionales para mejor compatibilidad
      verbosity: isDevelopment()
        ? pdfjsLib.VerbosityLevel.WARNINGS
        : pdfjsLib.VerbosityLevel.ERRORS,
      isEvalSupported: false, // Seguridad
      disableFontFace: false, // Permitir fuentes para mejor extracción
      useSystemFonts: true,
    }).promise;

    if (!pdf) {
      throw new Error("No se pudo cargar el documento PDF");
    }

    let fullText = "";
    const numPages = pdf.numPages;
    debugLog(`📊 PDF cargado: ${numPages} páginas`);

    // Usar configuración personalizable para límite de páginas
    const maxPages = Math.min(numPages, AI_CONFIG.maxPdfPages);
    debugLog(`🔢 Procesando ${maxPages} de ${numPages} páginas`);

    // Procesar páginas con mejor manejo de errores
    let successfulPages = 0;
    let failedPages = 0;

    for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
      try {
        debugLog(`📑 Procesando página ${pageNum}/${maxPages}...`);

        const page = await pdf.getPage(pageNum);
        if (!page) {
          errorLog(`❌ No se pudo obtener la página ${pageNum}`);
          failedPages++;
          continue;
        }

        const textContent = await page.getTextContent();
        if (!textContent || !textContent.items) {
          debugLog(`⚠️  Página ${pageNum} sin contenido de texto extraíble`);
          fullText += `\n--- Página ${pageNum} ---\n[Sin texto extraíble]\n`;
          continue;
        }

        // Extraer texto con mejor formateo
        const pageText = textContent.items
          .map((item) => {
            if (item && item.str) {
              return item.str.trim();
            }
            return "";
          })
          .filter((text) => text.length > 0)
          .join(" ");

        if (pageText.length > 0) {
          fullText += `\n--- Página ${pageNum} ---\n${pageText}\n`;
          successfulPages++;
          debugLog(
            `✅ Página ${pageNum} procesada: ${pageText.length} caracteres`
          );
        } else {
          fullText += `\n--- Página ${pageNum} ---\n[Sin texto extraíble en esta página]\n`;
          debugLog(`⚠️  Página ${pageNum} sin texto extraíble`);
        }
      } catch (pageError) {
        errorLog(`❌ Error procesando página ${pageNum}:`, pageError);
        fullText += `\n--- Página ${pageNum} ---\n[Error al procesar página: ${pageError.message}]\n`;
        failedPages++;
      }
    }

    // Agregar información adicional
    if (numPages > AI_CONFIG.maxPdfPages) {
      fullText += `\n[📊 Resumen: PDF tiene ${numPages} páginas, se procesaron las primeras ${AI_CONFIG.maxPdfPages} páginas]`;
    }

    fullText += `\n[📈 Estadísticas: ${successfulPages} páginas exitosas, ${failedPages} páginas con errores]`;

    // Verificar si se extrajo algo de texto
    const extractedText = fullText.trim();
    if (!extractedText || extractedText.length < 50) {
      const warningMsg =
        `[⚠️  PDF procesado pero con muy poco texto extraíble: ${file.name}]\n` +
        `Posibles causas:\n` +
        `- PDF escaneado (imagen) sin OCR\n` +
        `- PDF protegido o con restricciones\n` +
        `- PDF con formato complejo\n` +
        `- Fuentes no estándar\n\n` +
        `Texto extraído (${extractedText.length} caracteres):\n${extractedText}`;

      debugLog("⚠️  PDF con poco texto extraíble:", {
        fileName: file.name,
        extractedLength: extractedText.length,
        successfulPages,
        failedPages,
      });

      return warningMsg;
    }

    debugLog(
      `🎉 PDF procesado exitosamente: ${extractedText.length} caracteres extraídos`
    );
    return extractedText;
  } catch (error) {
    errorLog("❌ Error leyendo PDF:", {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      error: error.message,
      stack: error.stack,
    });

    // Mensajes de error más específicos
    let errorMessage = `[❌ Error al leer PDF: ${file.name}]\n\n`;

    if (error.message.includes("Invalid PDF")) {
      errorMessage += `🔍 Diagnóstico: El archivo no es un PDF válido o está corrupto.\n`;
      errorMessage += `💡 Soluciones:\n`;
      errorMessage += `- Verifica que el archivo sea un PDF real\n`;
      errorMessage += `- Intenta abrir el PDF en otro visor para verificar que funciona\n`;
      errorMessage += `- El archivo podría estar dañado\n`;
    } else if (error.message.includes("Password")) {
      errorMessage += `🔒 Diagnóstico: El PDF está protegido con contraseña.\n`;
      errorMessage += `💡 Soluciones:\n`;
      errorMessage += `- Desbloquea el PDF antes de subirlo\n`;
      errorMessage += `- Usa un PDF sin protección\n`;
    } else if (error.message.includes("demasiado grande")) {
      errorMessage += `📦 Diagnóstico: El archivo supera el límite de tamaño.\n`;
      errorMessage += `💡 Soluciones:\n`;
      errorMessage += `- Reduce el tamaño del PDF\n`;
      errorMessage += `- Divide el PDF en partes más pequeñas\n`;
      errorMessage += `- Aumenta VITE_MAX_FILE_SIZE en tu .env\n`;
    } else if (error.message.includes("Worker")) {
      errorMessage += `⚙️  Diagnóstico: Error en el procesador PDF de la aplicación.\n`;
      errorMessage += `💡 Soluciones:\n`;
      errorMessage += `- Recarga la página e intenta de nuevo\n`;
      errorMessage += `- Verifica tu conexión a internet\n`;
      errorMessage += `- El archivo podría tener un formato no compatible\n`;
    } else {
      errorMessage += `🔍 Diagnóstico: Error técnico durante el procesamiento.\n`;
      errorMessage += `💡 Soluciones:\n`;
      errorMessage += `- Intenta con otro archivo PDF\n`;
      errorMessage += `- Verifica que el PDF se abra correctamente en otros programas\n`;
      errorMessage += `- Contacta soporte si el problema persiste\n`;
    }

    errorMessage += `\n📋 Detalles técnicos: ${error.message}`;

    return errorMessage;
  }
}

// Función para crear el prompt de generación de preguntas
function createQuestionGenerationPrompt(fileContents, questionType, aiConfig) {
  const filesInfo = fileContents
    .map(
      (f) =>
        `Archivo: ${f.filename}\nTipo: ${f.type}\nTamaño: ${(
          f.size / 1024
        ).toFixed(1)}KB\nContenido:\n${f.content}`
    )
    .join("\n\n---\n\n");

  if (questionType === "development") {
    // Prompt específico para preguntas a desarrollar
    return `Basándote EXCLUSIVAMENTE en el siguiente contenido de archivos, genera exactamente ${getQuestionsCount(
      "development"
    )} preguntas a desarrollar de nivel universitario avanzado en español.

CONTENIDO DE ARCHIVOS:
${filesInfo}

REGLAS CRÍTICAS - DEBES SEGUIRLAS ESTRICTAMENTE:
1. Las preguntas DEBEN estar basadas ÚNICAMENTE en el contenido proporcionado
2. NO inventes información que no esté en los archivos
3. NO agregues conocimiento externo o general del tema
4. Cada pregunta debe ser respondible COMPLETAMENTE con la información proporcionada
5. Si el contenido es limitado, enfócate en análisis profundo de lo que SÍ está presente
6. NO hagas referencias a conceptos no mencionados en el material
7. Las preguntas deben ser AUTOCONTENIDAS con CONTEXTO SUFICIENTE para entenderlas
8. NO hagas referencia a "secciones", "tablas" o "figuras" específicas del documento
9. INCLUYE en la pregunta el CONTEXTO y TEMA necesario para entender de qué se trata
10. Las preguntas deben ser CONCRETAS sobre temas específicos pero con contexto claro
11. Lo que se espera responder debe estar CLARAMENTE explicado en la pregunta

CARACTERÍSTICAS DE LAS PREGUNTAS A DESARROLLAR:
- Nivel universitario avanzado pero basado en el contenido real
- Requieren análisis profundo del material proporcionado
- Apropiadas para exámenes pero respondibles con el contenido dado
- Deben promover la reflexión sobre los temas específicos del material
- Cada pregunta debe poder responderse en 200-500 palabras usando solo el contenido
- Enfócate en conceptos, relaciones e ideas que aparecen explícitamente en los archivos
- INCLUYE EL CONTEXTO NECESARIO: "Considerando que [contexto del documento], desarrolla y analiza..."
- EVITA REFERENCIAS VAGAS: "según la sección X" o "en la tabla Y"

EJEMPLOS DE PREGUNTAS CON CONTEXTO ADECUADO:
✅ BUENO: "Considerando que en el material se describe un proceso de validación que incluye tres etapas específicas (verificación, análisis y confirmación), desarrolla un análisis detallado de cada etapa explicando su función y cómo se interrelacionan."
❌ MALO: "Según la sección 4, analiza el proceso de validación."

✅ BUENO: "Dado que el documento presenta un modelo conceptual donde intervienen factores económicos, sociales y tecnológicos en la toma de decisiones, analiza críticamente cómo estos factores se integran y cuál es su impacto relativo."
❌ MALO: "Reflexiona sobre la importancia de los factores en general."

FORMATO DE RESPUESTA (JSON):
Responde ÚNICAMENTE con un array JSON válido en este formato exacto:

[
  {
    "question": "Considerando que [contexto específico del material], desarrolla y analiza [qué se espera como respuesta]...",
    "options": ["Puntos clave del contenido", "Aspectos mencionados en el material", "Criterios basados en el archivo"],
    "correct": ["Puntos esperados basados en el contenido", "Aspectos del material", "Ideas del archivo"],
    "suggestedAnswer": "Respuesta detallada y completa de 200-400 palabras que muestra cómo debe responderse la pregunta usando exclusivamente el contenido proporcionado. Esta respuesta servirá como referencia para evaluar otras respuestas.",
    "source": "Generado de: nombre_archivo.ext"
  }
]

IMPORTANTE: 
- Responde SOLO con el JSON, sin texto adicional
- Asegúrate de que el JSON sea válido
- Usa comillas dobles para todas las cadenas
- En "options": incluye puntos que aparecen en el material proporcionado
- En "correct": incluye respuestas basadas estrictamente en el contenido dado
- En "suggestedAnswer": proporciona una respuesta modelo completa, detallada y basada 100% en el contenido
- Genera exactamente ${getQuestionsCount("development")} preguntas
- TODA pregunta debe ser verificable contra el contenido proporcionado
- Si menciones un concepto, debe estar presente en los archivos
- NO agregues información externa, por conocida que sea
- CADA PREGUNTA debe incluir el CONTEXTO NECESARIO para entenderla sin consultar el documento
- Las preguntas deben ser AUTOCONTENIDAS y CLARAS sobre qué se espera como respuesta`;
  } else {
    // Prompt original para preguntas de opción múltiple
    const instructions = getFormattedInstructions("choice");
    const questionsToGenerate = getQuestionsCount("choice");

    return `Basándote en el siguiente contenido de archivos, genera exactamente ${questionsToGenerate} preguntas de opción múltiple en español.

CONTENIDO DE ARCHIVOS:
${filesInfo}

REGLAS ESPECÍFICAS PARA PREGUNTAS AUTOCONTENIDAS:
1. Las preguntas deben ser AUTOCONTENIDAS con CONTEXTO SUFICIENTE para entenderlas
2. NO hagas referencia a "secciones", "tablas" o "figuras" específicas del documento
3. INCLUYE en la pregunta el CONTEXTO necesario del tema
4. Las preguntas deben ser CONCRETAS sobre información específica del material
5. EVITA preguntas vagas o que requieran consultar el documento para entender el contexto
6. Lo que se pregunta debe estar CLARAMENTE explicado

EJEMPLOS DE PREGUNTAS AUTOCONTENIDAS:
✅ BUENO: "En el contexto de un sistema de gestión que maneja tres tipos de usuarios (administradores, editores y lectores), ¿cuáles son los permisos específicos que tienen los editores?"
❌ MALO: "¿Cuáles son los permisos mencionados en la tabla 3?"

✅ BUENO: "Considerando el proceso de autenticación que involucra verificación biométrica y contraseña, ¿cuál es el orden correcto de los pasos?"
❌ MALO: "¿Cuál es el proceso descrito en la sección 2?"

INSTRUCCIONES ORIGINALES:
${instructions}

FORMATO DE RESPUESTA (JSON):
Responde ÚNICAMENTE con un array JSON válido en este formato exacto:

[
  {
    "question": "En el contexto de [tema específico del material], ¿cuál/cómo/qué [pregunta concreta con contexto incluido]?",
    "options": ["Opción A", "Opción B", "Opción C", "Opción D"],
    "correct": ["Opción A", "Opción C"],
    "suggestedAnswer": "Explicación detallada de por qué estas opciones son correctas basándose en el contenido específico del material proporcionado.",
    "source": "Generado de: nombre_archivo.ext"
  }
]

IMPORTANTE: 
- Responde SOLO con el JSON, sin texto adicional
- Asegúrate de que el JSON sea válido
- Usa comillas dobles para todas las cadenas
- Las respuestas correctas deben estar exactamente como aparecen en las opciones
- En "suggestedAnswer": proporciona explicación clara de por qué las opciones marcadas son correctas
- Genera exactamente ${questionsToGenerate} preguntas (mínimo 10)
- Cada pregunta debe tener entre 3-${AI_CONFIG.optionsPerQuestion} opciones
- TODA pregunta debe incluir el CONTEXTO NECESARIO para entenderla sin consultar el documento
- Las preguntas deben ser AUTOCONTENIDAS y CLARAS sobre el tema específico
- NO generes preguntas que requieran consultar referencias del documento para entender el contexto`;
  }
}

// Función para parsear las preguntas desde la respuesta de OpenAI
function parseQuestionsFromResponse(responseContent, questionType) {
  try {
    // Limpiar la respuesta para extraer solo el JSON
    let jsonString = responseContent.trim();

    // Remover cualquier texto antes o después del JSON
    const jsonStart = jsonString.indexOf("[");
    const jsonEnd = jsonString.lastIndexOf("]");

    if (jsonStart !== -1 && jsonEnd !== -1) {
      jsonString = jsonString.substring(jsonStart, jsonEnd + 1);
    }

    // Parsear JSON
    const questions = JSON.parse(jsonString);

    // Validar y agregar IDs
    return questions.map((q, index) => ({
      id: Date.now() + index,
      question: q.question,
      options: q.options,
      correct: q.correct,
      suggestedAnswer: q.suggestedAnswer || "Respuesta sugerida no disponible", // Campo para contexto de IA
      source: q.source || "Generado por IA",
    }));
  } catch (error) {
    console.error("Error parsing questions from OpenAI response:", error);
    console.log("Raw response:", responseContent);

    // Fallback: crear preguntas de ejemplo según el tipo
    if (questionType === "development") {
      return [
        {
          id: Date.now(),
          question:
            "Desarrolla un análisis crítico sobre los conceptos principales presentados en el material. Fundamenta tu respuesta con ejemplos específicos y establece relaciones entre las diferentes ideas.",
          options: [
            "Identificación de conceptos clave",
            "Análisis crítico y argumentación",
            "Uso de ejemplos específicos",
            "Establecimiento de relaciones conceptuales",
          ],
          correct: [
            "Demostrar comprensión profunda de los conceptos principales",
            "Desarrollar argumentos sólidos con evidencia del material",
            "Establecer conexiones lógicas entre ideas",
            "Aplicar pensamiento crítico en el análisis",
          ],
          suggestedAnswer:
            "Una respuesta completa debe incluir: 1) Identificación clara de los conceptos principales presentados en el material, 2) Análisis crítico que evalúe la relevancia y aplicabilidad de estos conceptos, 3) Uso de ejemplos específicos extraídos del contenido para fundamentar los argumentos, 4) Establecimiento de relaciones lógicas entre las diferentes ideas presentadas, mostrando cómo se conectan y complementan entre sí, y 5) Una conclusión que sintetice el análisis realizado.",
          source: "Pregunta de fallback generada por IA",
        },
        {
          id: Date.now() + 1,
          question:
            "Evalúa críticamente las metodologías o enfoques presentados en el contenido. ¿Cuáles son sus fortalezas y limitaciones? Propón mejoras o alternativas fundamentadas.",
          options: [
            "Evaluación crítica de metodologías",
            "Identificación de fortalezas y debilidades",
            "Propuesta de mejoras",
            "Fundamentación teórica",
          ],
          correct: [
            "Análisis objetivo de las metodologías presentadas",
            "Identificación clara de ventajas y desventajas",
            "Propuestas de mejora fundamentadas",
            "Demostración de pensamiento crítico avanzado",
          ],
          suggestedAnswer:
            "La evaluación debe comenzar con una descripción objetiva de las metodologías presentadas en el material. Luego, analizar sistemáticamente sus fortalezas, identificando qué aspectos funcionan bien y por qué. Seguidamente, examinar las limitaciones o debilidades, explicando los problemas o restricciones encontrados. Finalmente, proponer mejoras específicas o alternativas, justificando cada sugerencia con argumentos sólidos basados en el análisis previo y en principios teóricos mencionados en el contenido.",
          source: "Pregunta de fallback generada por IA",
        },
      ];
    } else {
      // Fallback original para preguntas de opción múltiple
      return [
        {
          id: Date.now(),
          question:
            "¿Cuál de las siguientes es una buena práctica en programación?",
          options: [
            "Escribir código sin comentarios",
            "Usar nombres de variables descriptivos",
            "Nunca hacer refactoring",
            "Evitar la documentación",
          ],
          correct: ["Usar nombres de variables descriptivos"],
          suggestedAnswer:
            "Usar nombres de variables descriptivos es correcto porque mejora la legibilidad del código, facilita el mantenimiento y permite que otros desarrolladores (y uno mismo en el futuro) comprendan rápidamente el propósito de cada variable sin necesidad de comentarios adicionales.",
          source: "Pregunta de fallback generada por IA",
        },
        {
          id: Date.now() + 1,
          question: "¿Qué es importante al subir archivos a un sistema?",
          options: [
            "Validar el tipo de archivo",
            "No verificar el tamaño",
            "Permitir cualquier extensión",
            "Guardar sin procesamiento",
          ],
          correct: ["Validar el tipo de archivo"],
          suggestedAnswer:
            "Validar el tipo de archivo es fundamental para la seguridad del sistema, ya que previene la subida de archivos maliciosos, asegura que solo se procesen los formatos esperados y protege contra vulnerabilidades de seguridad relacionadas con la ejecución de código no autorizado.",
          source: "Pregunta de fallback generada por IA",
        },
      ];
    }
  }
}

// Function to evaluate a development question answer with AI
export async function evaluateAnswerWithAI(
  question,
  userAnswer,
  allQuestions,
  customApiKey = null,
  aiConfig = null // Nuevo parámetro para configuraciones de IA
) {
  try {
    // Use custom API key if provided, otherwise use default
    const effectiveApiKey = customApiKey || DEFAULT_API_KEY;

    apiLog(
      `🎯 Evaluando respuesta con personalidad: ${
        aiConfig?.evaluatorPersonality || "normal"
      }`
    );
    debugLog("Configuración evaluación:", {
      effectiveApiKey: effectiveApiKey?.substring(0, 8) + "...",
      aiConfig,
    });

    // Create OpenAI client with the appropriate API key
    const openaiClient = createOpenAIClient(effectiveApiKey);

    // Create context from all questions for better interpretation
    const questionsContext = allQuestions
      .map(
        (q, index) =>
          `${index + 1}. ${
            q.question
          }\n   Puntos clave esperados: ${q.correct.join(
            ", "
          )}\n   Respuesta modelo: ${q.suggestedAnswer || "No disponible"}`
      )
      .join("\n\n");

    // Get personality and difficulty settings
    const evaluatorPersonality = aiConfig?.evaluatorPersonality || "normal";
    const difficultyLevel = aiConfig?.difficultyLevel || "normal";

    // Debug logging para confirmar configuraciones
    console.log("🎭 Configuraciones de evaluación recibidas:", {
      evaluatorPersonality,
      difficultyLevel,
      aiConfig,
    });

    // Get personalized system prompt
    const systemPrompt = getEvaluationSystemPrompt(
      evaluatorPersonality,
      difficultyLevel
    );

    // Debug logging para confirmar el prompt personalizado
    console.log("🤖 Prompt del sistema generado:", systemPrompt);

    // Create evaluation prompt
    const evaluationPrompt = `CONTEXTO DEL CUESTIONARIO (Material base para todas las preguntas):
${questionsContext}

PREGUNTA ESPECÍFICA A EVALUAR:
${question.question}

PUNTOS CLAVE ESPERADOS EN LA RESPUESTA (basados en el material):
${question.correct.join(", ")}

RESPUESTA MODELO DE REFERENCIA:
${question.suggestedAnswer || "No disponible"}

RESPUESTA DEL ESTUDIANTE:
"${userAnswer}"

INSTRUCCIONES PARA LA EVALUACIÓN:
1. Evalúa la respuesta ÚNICAMENTE basándote en el contenido del material proporcionado
2. Usa la respuesta modelo como referencia de calidad y estructura esperada
3. Compara la respuesta del estudiante con la respuesta modelo y los puntos clave
4. Verifica si la respuesta del estudiante está alineada con la información del material
5. NO uses conocimiento externo para evaluar - solo el contenido dado
6. Sé muy específico con tu análisis, citando el material cuando sea relevante
7. Usa el contexto de todas las preguntas para interpretar mejor la respuesta
8. Proporciona feedback basado estrictamente en lo que aparece en el material
9. Si la respuesta va más allá del material, menciona que debe ceñirse al contenido
10. Si hay errores respecto al material, corrígelos citando el contenido correcto

INSTRUCCIÓN CRUCIAL SOBRE EL TONO:
- Usa tu personalidad y tono configurado en TODOS los campos de respuesta
- TODOS los textos (analysis, feedback, improvements, correctAnswer) deben reflejar tu personalidad
- Si eres el modo HATER: usa emojis de enojo, sarcasmo y frustración en TODAS las respuestas
- Si eres gracioso: incluye humor en TODAS las respuestas
- Si eres motivador: sé positivo en TODAS las respuestas
- Mantén consistencia de personalidad en TODO el JSON de respuesta

FORMATO DE RESPUESTA (JSON):
Responde ÚNICAMENTE con un objeto JSON válido en este formato exacto:

{
  "isCorrect": true/false,
  "score": "Correcto/Parcialmente correcto/Incorrecto",
  "analysis": "Análisis detallado con tu PERSONALIDAD y TONO específico, comparando la respuesta con el material proporcionado",
  "feedback": "Feedback con tu PERSONALIDAD y TONO específico, basado en el contenido del material",
  "improvements": "Sugerencias de mejora con tu PERSONALIDAD y TONO específico, usando únicamente el material disponible",
  "correctAnswer": "Respuesta ejemplar con tu PERSONALIDAD y TONO específico, basada en el contenido proporcionado"
}

IMPORTANTE:
- Responde SOLO con el JSON, sin texto adicional
- Basa toda evaluación en el material proporcionado y la respuesta modelo
- No introduzcas información externa
- Cita o referencie el material y la respuesta modelo cuando sea útil
- La respuesta modelo te da el estándar de calidad esperado
- CRUCIAL: Aplica tu personalidad y tono en TODOS los campos del JSON (analysis, feedback, improvements, correctAnswer)
- Si eres HATER: incluye emojis de enojo y sarcasmo en TODOS los campos
- Si eres gracioso: incluye humor en TODOS los campos
- Si eres motivador: sé positivo en TODOS los campos`;

    // Get model configuration
    const modelConfig = getModelConfig();

    // Call OpenAI for evaluation
    const response = await openaiClient.chat.completions.create({
      model: modelConfig.model,
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: evaluationPrompt,
        },
      ],
      max_tokens: modelConfig.max_tokens,
      temperature: 0.3, // Lower temperature for more consistent evaluation
    });

    // Parse the evaluation response
    const evaluation = parseEvaluationResponse(
      response.choices[0].message.content
    );

    return evaluation;
  } catch (error) {
    console.error("Error evaluating answer with OpenAI:", error);

    // Specific OpenAI error handling
    if (error.message.includes("API key")) {
      throw new Error("API key de OpenAI inválida. Verifica tu configuración.");
    } else if (error.message.includes("quota")) {
      throw new Error("Has excedido tu cuota de OpenAI. Verifica tu cuenta.");
    } else if (error.message.includes("rate limit")) {
      throw new Error(
        "Límite de velocidad excedido. Intenta de nuevo en unos minutos."
      );
    }

    throw new Error(`Error al evaluar respuesta: ${error.message}`);
  }
}

// Function to parse evaluation response from OpenAI
function parseEvaluationResponse(responseContent) {
  try {
    // Clean the response to extract only the JSON
    let jsonString = responseContent.trim();

    // Remove any text before or after the JSON
    const jsonStart = jsonString.indexOf("{");
    const jsonEnd = jsonString.lastIndexOf("}");

    if (jsonStart !== -1 && jsonEnd !== -1) {
      jsonString = jsonString.substring(jsonStart, jsonEnd + 1);
    }

    // Parse JSON
    const evaluation = JSON.parse(jsonString);

    // Validate required fields
    if (
      !evaluation.hasOwnProperty("isCorrect") ||
      !evaluation.hasOwnProperty("score") ||
      !evaluation.hasOwnProperty("analysis")
    ) {
      throw new Error("Respuesta de evaluación incompleta");
    }

    return evaluation;
  } catch (error) {
    console.error("Error parsing evaluation response:", error);
    console.log("Raw response:", responseContent);

    // Fallback evaluation
    return {
      isCorrect: false,
      score: "Evaluación no disponible",
      analysis:
        "No se pudo procesar la evaluación automática. La respuesta ha sido registrada.",
      feedback:
        "Por favor revisa tu respuesta con tu profesor para obtener feedback detallado.",
      improvements: "Intenta ser más específico y detallado en tu respuesta.",
      correctAnswer:
        "Consulta los materiales de estudio para la respuesta completa.",
    };
  }
}
