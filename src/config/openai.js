import OpenAI from "openai";
import * as pdfjsLib from "pdfjs-dist";
import {
  AI_CONFIG,
  getSystemPrompt,
  getFormattedInstructions,
  getModelConfig,
} from "./aiSettings";

// Configurar worker de PDF.js para Vite
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

// TODO: Agregar tu API key de OpenAI aquí
const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY || "tu-api-key-aqui";

// Inicializar cliente de OpenAI
export const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
  dangerouslyAllowBrowser: true, // Permite usar en el navegador
});

// Función para generar preguntas con IA
export async function generateQuestionsFromFiles(files) {
  try {
    // Validar archivos antes de procesarlos
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

    // Procesar archivos y extraer contenido
    const fileContents = await processFiles(validFiles);

    // Crear prompt para generar preguntas
    const prompt = createQuestionGenerationPrompt(fileContents);

    // Obtener configuración del modelo
    const modelConfig = getModelConfig();

    // Llamar a OpenAI
    const response = await openai.chat.completions.create({
      model: modelConfig.model,
      messages: [
        {
          role: "system",
          content: getSystemPrompt(),
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      max_tokens: modelConfig.max_tokens,
      temperature: modelConfig.temperature,
    });

    // Procesar respuesta y convertir a formato de la app
    const questions = parseQuestionsFromResponse(
      response.choices[0].message.content
    );

    return questions;
  } catch (error) {
    console.error("Error generating questions with OpenAI:", error);

    // Manejo específico de errores de OpenAI
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

// Función para procesar archivos y extraer contenido
async function processFiles(files) {
  const contents = [];

  for (const file of files) {
    try {
      let content = "";

      if (file.type.startsWith("text/")) {
        // Archivos de texto
        content = await readTextFile(file);
      } else if (file.type === "application/pdf") {
        // PDFs con extracción real de texto
        content = await readPdfFile(file);
      } else if (file.type.startsWith("image/")) {
        // Imágenes - placeholder para futura implementación con vision
        content = `[Imagen: ${file.name} - ${(file.size / 1024).toFixed(
          1
        )}KB]\nNota: El contenido de imágenes se puede procesar con GPT-4 Vision en futuras versiones.`;
      } else if (file.type.includes("csv")) {
        // CSV como texto
        content = await readTextFile(file);
      } else {
        // Otros archivos
        content = `[Archivo: ${file.name} - ${(file.size / 1024).toFixed(
          1
        )}KB]\nTipo: ${
          file.type
        }\nNota: Contenido no procesable directamente, pero puede contener información relevante.`;
      }

      contents.push({
        filename: file.name,
        type: file.type,
        content: content,
        size: file.size,
      });
    } catch (error) {
      console.error(`Error processing file ${file.name}:`, error);
      contents.push({
        filename: file.name,
        type: file.type,
        content: `[Error al procesar archivo: ${file.name}] - ${error.message}`,
        size: file.size,
      });
    }
  }

  return contents;
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

// Función para leer archivos PDF
async function readPdfFile(file) {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    let fullText = "";
    const numPages = pdf.numPages;

    // Usar configuración personalizable para límite de páginas
    const maxPages = Math.min(numPages, AI_CONFIG.maxPdfPages);

    for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item) => item.str).join(" ");
      fullText += `\n--- Página ${pageNum} ---\n${pageText}\n`;
    }

    if (numPages > AI_CONFIG.maxPdfPages) {
      fullText += `\n[Nota: PDF tiene ${numPages} páginas, solo se procesaron las primeras ${AI_CONFIG.maxPdfPages} páginas]`;
    }

    return (
      fullText.trim() ||
      `[PDF procesado pero sin texto extraíble: ${file.name}]`
    );
  } catch (error) {
    console.error("Error reading PDF:", error);
    return `[Error al leer PDF: ${file.name}] - ${error.message}`;
  }
}

// Función para crear el prompt de generación de preguntas
function createQuestionGenerationPrompt(fileContents) {
  const filesInfo = fileContents
    .map(
      (f) =>
        `Archivo: ${f.filename}\nTipo: ${f.type}\nTamaño: ${(
          f.size / 1024
        ).toFixed(1)}KB\nContenido:\n${f.content}`
    )
    .join("\n\n---\n\n");

  const instructions = getFormattedInstructions();

  return `Basándote en el siguiente contenido de archivos, genera exactamente ${AI_CONFIG.questionsPerGeneration} preguntas de opción múltiple en español.

CONTENIDO DE ARCHIVOS:
${filesInfo}

INSTRUCCIONES:
${instructions}

FORMATO DE RESPUESTA (JSON):
Responde ÚNICAMENTE con un array JSON válido en este formato exacto:

[
  {
    "question": "¿Cuál es la pregunta aquí?",
    "options": ["Opción A", "Opción B", "Opción C", "Opción D"],
    "correct": ["Opción A", "Opción C"],
    "source": "Generado de: nombre_archivo.ext"
  }
]

IMPORTANTE: 
- Responde SOLO con el JSON, sin texto adicional
- Asegúrate de que el JSON sea válido
- Usa comillas dobles para todas las cadenas
- Las respuestas correctas deben estar exactamente como aparecen en las opciones
- Genera exactamente ${AI_CONFIG.questionsPerGeneration} preguntas
- Cada pregunta debe tener entre 3-${AI_CONFIG.optionsPerQuestion} opciones`;
}

// Función para parsear las preguntas desde la respuesta de OpenAI
function parseQuestionsFromResponse(responseContent) {
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
      source: q.source || "Generado por IA",
    }));
  } catch (error) {
    console.error("Error parsing questions from OpenAI response:", error);
    console.log("Raw response:", responseContent);

    // Fallback: crear preguntas de ejemplo si el parsing falla
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
        source: "Pregunta de fallback generada por IA",
      },
    ];
  }
}
