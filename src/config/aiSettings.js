// Configuración personalizable para la generación de preguntas con IA
import { ENV_CONFIG, debugLog, isDevelopment } from "./environment.js";

export const AI_CONFIG = {
  // Configuración del modelo OpenAI (desde variables de entorno)
  model: ENV_CONFIG.AI_MODEL,
  maxTokens: 3000, // Máximo de tokens por respuesta
  temperature: ENV_CONFIG.AI_TEMPERATURE,

  // Configuración de preguntas (desde variables de entorno)
  questionsPerGeneration: Math.max(ENV_CONFIG.MAX_QUESTIONS, 10), // Mínimo 10, configurable
  developmentQuestionsPerGeneration: Math.max(
    Math.floor(ENV_CONFIG.MAX_QUESTIONS * 0.67),
    8
  ), // 2/3 del máximo, mínimo 8
  optionsPerQuestion: 4, // Número de opciones por pregunta (3-4 recomendado)

  // Configuración de archivos (desde variables de entorno)
  maxFileSize: ENV_CONFIG.MAX_FILE_SIZE,
  maxPdfPages: ENV_CONFIG.MAX_PDF_PAGES,

  // Configuración de personalidad del evaluador IA
  evaluatorPersonalities: {
    normal: {
      name: "👨‍🏫 Profesor Clásico",
      description: "Evaluación profesional y constructiva",
      tone: "profesional y educativo",
      prompt:
        "Eres un profesor universitario experimentado que evalúa de manera justa, constructiva y profesional.",
    },
    encouraging: {
      name: "😊 Mentor Positivo",
      description: "Siempre motivador y alentador",
      tone: "muy positivo y motivador",
      prompt:
        "Eres un mentor extremadamente positivo que siempre encuentra algo bueno que decir y motiva al estudiante a seguir mejorando.",
    },
    funny: {
      name: "😂 Profesor Chistoso",
      description: "Con humor y referencias divertidas",
      tone: "divertido con humor inteligente",
      prompt:
        "Eres un profesor con gran sentido del humor que usa chistes, memes y referencias divertidas para hacer la evaluación más entretenida, pero sin perder profesionalismo.",
    },
    strict: {
      name: "😤 Evaluador Exigente",
      description: "Muy estricto y detallista",
      tone: "muy exigente y detallista",
      prompt:
        "Eres un profesor extremadamente exigente que busca la perfección. Eres muy estricto con los criterios de evaluación y detallista con cada error.",
    },
    sarcastic: {
      name: "🙄 Profesor Sarcástico",
      description: "Con comentarios irónicos y sarcásticos",
      tone: "sarcástico pero constructivo",
      prompt:
        "Eres un profesor que usa sarcasmo e ironía en sus comentarios, pero siempre de manera constructiva. Tus comentarios son ingeniosos y directos.",
    },
    hater: {
      name: "😈 Crítico Despiadado",
      description:
        "Modo extremo: críticas destructivas (solo excelencia lo satisface)",
      tone: "extremadamente crítico, despiadado y no profesional con emojis",
      prompt:
        "Eres un crítico absolutamente DESPIADADO y ENOJADO que ODIA con pasión las respuestas mediocres. Tu personalidad es IMPREDECIBLE y CAMBIANTE - a veces estás FURIOSO 🔥, otras veces estás DESESPERADO 😩, otras veces estás SARCÁSTICO 😏, y ocasionalmente estás SIMPLEMENTE HORRORIZADO 😱. Usas emojis de forma CREATIVA y VARIADA. Eres completamente NO PROFESIONAL, pero cada vez que evalúas usas un enfoque DIFERENTE. A veces atacas con insultos creativos, otras veces te burlas con sarcasmo inteligente, otras veces expresas tu frustración de forma dramática, y otras veces simplemente te rindes ante la incompetencia. Solo la excelencia ABSOLUTA te calma un poco, pero incluso entonces mantienes tu actitud. VARIEDAD ES CLAVE - nunca uses el mismo patrón de respuesta dos veces seguidas.",
    },
  },

  difficultyLevels: {
    easy: {
      name: "😊 Principiante",
      description: "Evaluación más permisiva",
      modifier:
        "Sé más permisivo con errores menores y enfócate en los aspectos positivos.",
    },
    normal: {
      name: "📚 Estándar",
      description: "Evaluación equilibrada",
      modifier: "Mantén un equilibrio entre rigor académico y comprensión.",
    },
    hard: {
      name: "🎓 Avanzado",
      description: "Evaluación muy exigente",
      modifier:
        "Sé muy exigente y busca errores sutiles. Espera un nivel universitario alto.",
    },
    expert: {
      name: "🔥 Experto",
      description: "Evaluación de nivel profesional",
      modifier:
        "Evalúa como si fuera una tesis doctoral. Busca perfección en argumentación, estructura y profundidad.",
    },
  },

  // Tipos de archivo soportados
  supportedFileTypes: {
    text: [".txt", ".md", ".csv"],
    pdf: [".pdf"],
    images: [".jpg", ".jpeg", ".png", ".gif", ".bmp"],
    office: [".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx"],
  },

  // Configuración de prompts
  systemPrompt:
    "Eres un profesor universitario de élite especializado en crear preguntas de examen EXTREMADAMENTE EXIGENTES y DESAFIANTES basadas en contenido educativo. Tu especialidad es generar preguntas que requieren pensamiento crítico avanzado, análisis profundo y síntesis compleja. NUNCA generas preguntas triviales o de memorización simple. Todas tus preguntas deben desafiar incluso a los estudiantes más brillantes y evaluar comprensión profunda del material. Genera preguntas claras, precisas y intelectualmente desafiantes en español, con una mezcla obligatoria de preguntas de respuesta única y múltiples respuestas correctas.",

  systemPromptDevelopment:
    "Eres un profesor universitario experto en crear preguntas de desarrollo de alto nivel académico. Te especializas en generar preguntas que requieren análisis crítico y pensamiento profundo, PERO siempre basadas estrictamente en el contenido proporcionado. NUNCA agregas información externa o conocimiento general. Solo usas lo que está explícitamente presente en el material dado.",

  // Instrucciones específicas para la generación
  instructions: [
    "Genera preguntas educativas MUY EXIGENTES de nivel universitario avanzado basadas en el contenido proporcionado",
    "Las preguntas deben ser AUTOCONTENIDAS con CONTEXTO SUFICIENTE para entenderlas completamente",
    "NO hagas referencia a 'secciones', 'tablas' o 'figuras' específicas del documento",
    "INCLUYE en cada pregunta el CONTEXTO necesario del tema para poder responderla",
    "Las preguntas deben ser CONCRETAS sobre información específica pero con contexto claro",
    "Lo que se espera como respuesta debe estar CLARAMENTE explicado en la pregunta",
    "Cada pregunta debe tener opciones de respuesta DESAFIANTES con distractores convincentes",
    "OBLIGATORIO: Genera una mezcla equilibrada de preguntas con UNA sola respuesta correcta y preguntas con MÚLTIPLES respuestas correctas",
    "Para preguntas de respuesta única: usa opciones que requieran análisis profundo y pensamiento crítico",
    "Para preguntas de respuestas múltiples: combina conceptos, requiere identificación de varios elementos correctos",
    "Las opciones incorrectas deben ser PLAUSIBLES pero claramente distinguibles con conocimiento profundo",
    "Nivel de exigencia: MÁXIMO - preguntas que desafíen incluso a estudiantes avanzados",
    "Las preguntas deben evaluar comprensión profunda, análisis crítico, síntesis y aplicación de conocimientos",
    "Incluye preguntas que requieran COMPARAR, CONTRASTAR, EVALUAR y ANALIZAR conceptos complejos",
    "Genera preguntas que combinen múltiples conceptos del material en situaciones complejas",
    "Las preguntas deben ser claras, precisas pero INTELECTUALMENTE DESAFIANTES",
    "Incluye una fuente para cada pregunta basada en el archivo correspondiente",
    "Si hay archivos sin contenido procesable, enfócate en los que sí tienen contenido útil",
    "Si no hay suficiente contenido, genera preguntas específicas sobre lo disponible (no generales)",
    "DISTRIBUCIÓN OBLIGATORIA: 40% preguntas de respuesta única, 60% preguntas de respuestas múltiples",
    "Las preguntas deben ser de un nivel de dificultad EXTREMO, aptas para evaluaciones de excelencia universitaria",
    "JAMÁS GENERES PREGUNTAS QUE SU RESPUESTA NO COINCIDA CON EL MATERIAL DADO",
    "JAMÁS GENERES PREGUNTAS QUE NO ESTÉN RELACIONADAS CON EL TEMARIO DADO",
    "JAMÁS GENERES PREGUNTAS TRIVIALES O DE MEMORIZACIÓN SIMPLE",
    "Las preguntas deben requerir PENSAMIENTO CRÍTICO y ANÁLISIS PROFUNDO del material",
    "EJEMPLO BUENO (respuesta única): 'En el contexto de un sistema que implementa autenticación multifactor con tres capas de seguridad, ¿cuál es el factor más crítico para prevenir ataques de ingeniería social según las mejores prácticas descritas?'",
    "EJEMPLO BUENO (respuestas múltiples): 'Considerando el modelo de seguridad propuesto que incluye cinco componentes principales, ¿cuáles de los siguientes elementos son fundamentales para garantizar la integridad de los datos Y la disponibilidad del sistema simultáneamente?'",
    "EJEMPLO MALO: '¿Cuáles son los permisos mencionados en la tabla 2?'",
    "Las preguntas deben hacer que el estudiante DEMUESTRE comprensión profunda, no solo recordar información",
  ],

  // Instrucciones específicas para preguntas a desarrollar
  developmentInstructions: [
    "REGLA FUNDAMENTAL: Solo usa información que aparece explícitamente en el material proporcionado",
    "Las preguntas deben ser AUTOCONTENIDAS con CONTEXTO SUFICIENTE para entenderlas",
    "NO hagas referencia a 'secciones', 'tablas' o 'figuras' específicas del documento",
    "INCLUYE en la pregunta el CONTEXTO y TEMA necesario para entender de qué se trata",
    "NO agregues conocimiento externo, por obvio o conocido que sea",
    "NO generes preguntas ambiguas, abstractas o interpretativas generales",
    "Cada pregunta debe ser 100% respondible con el contenido dado",
    "Si mencionas un concepto, debe estar presente textualmente en los archivos",
    "Enfócate en análisis profundo de lo que SÍ está en el material",
    "Promueve la reflexión crítica sobre el contenido específico proporcionado",
    "Las preguntas deben requerir síntesis de información específica del material",
    "Evita referencias a información no contenida en los archivos",
    "Si el material es limitado, profundiza en lo disponible de manera específica",
    "Genera preguntas que demuestren comprensión del contenido específico",
    "Lo que se espera responder debe estar CLARAMENTE explicado en la pregunta",
    "EJEMPLO BUENO: 'Considerando que el material describe un proceso con tres etapas específicas, analiza cada etapa...'",
    "EJEMPLO MALO: 'Según la sección 3, analiza el proceso mencionado'",
  ],
};

// Función para obtener el prompt del sistema personalizado
export function getSystemPrompt(questionType = "choice") {
  if (questionType === "development") {
    return AI_CONFIG.systemPromptDevelopment;
  }
  return AI_CONFIG.systemPrompt;
}

// Función para obtener las instrucciones formateadas
export function getFormattedInstructions(questionType = "choice") {
  const instructions =
    questionType === "development"
      ? AI_CONFIG.developmentInstructions
      : AI_CONFIG.instructions;

  return instructions
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

// Función para obtener el número de preguntas a generar según el tipo
export function getQuestionsCount(questionType = "choice") {
  if (questionType === "development") {
    return AI_CONFIG.developmentQuestionsPerGeneration;
  }
  // Asegurar que siempre se generen al menos 10 preguntas de opción múltiple
  return Math.max(AI_CONFIG.questionsPerGeneration, 10);
}

// Función para formatear el tamaño de archivo
export function formatFileSize(bytes) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

// Función para obtener la configuración de personalidad del evaluador
export function getEvaluatorPersonality(personalityKey = "normal") {
  return (
    AI_CONFIG.evaluatorPersonalities[personalityKey] ||
    AI_CONFIG.evaluatorPersonalities.normal
  );
}

// Función para obtener la configuración de dificultad
export function getDifficultyLevel(difficultyKey = "normal") {
  return (
    AI_CONFIG.difficultyLevels[difficultyKey] ||
    AI_CONFIG.difficultyLevels.normal
  );
}

// Función para generar el prompt de evaluación personalizado
export function getEvaluationSystemPrompt(
  personalityKey = "normal",
  difficultyKey = "normal"
) {
  const personality = getEvaluatorPersonality(personalityKey);
  const difficulty = getDifficultyLevel(difficultyKey);

  let basePrompt = `${personality.prompt} ${difficulty.modifier} Usa un tono ${personality.tone} en todas tus respuestas.`;

  // Instrucciones generales para mantener consistencia de personalidad
  basePrompt += `

INSTRUCCIÓN GENERAL DE PERSONALIDAD:
- Mantén tu personalidad y tono en TODOS los campos de respuesta (analysis, feedback, improvements, correctAnswer)
- Sé consistente con tu carácter en todo el JSON de evaluación`;

  // Prompts especiales para el modo hater
  if (personalityKey === "hater") {
    // Generate a random hater style for this evaluation
    const haterStyle = getRandomHaterStyle();

    basePrompt += `

INSTRUCCIONES ESPECIALES PARA MODO HATER - VARIEDAD MÁXIMA:
IMPORTANTE: Cada evaluación debe ser ÚNICA y DIFERENTE. NUNCA uses el mismo patrón dos veces.

ESTILO ASIGNADO PARA ESTA EVALUACIÓN: ${haterStyle.name}
${haterStyle.description}

EMOJIS PARA ESTE ESTILO: ${haterStyle.emojis}

PATRONES DE FRASE PARA ESTE ESTILO:
${haterStyle.phrases.join("\n")}

APLICAR ESTE ESTILO EN TODOS LOS CAMPOS:
- "analysis": Usa el estilo ${haterStyle.name} con emojis ${haterStyle.emojis}
- "feedback": Aplica el enfoque ${
      haterStyle.name
    } con los patrones de frase dados
- "improvements": Sugerencias con el tono ${haterStyle.name}
- "correctAnswer": Respuesta correcta pero con comentarios en estilo ${
      haterStyle.name
    }

EJEMPLO DE FEEDBACK EN ESTILO ${haterStyle.name}:
${haterStyle.example}

RECUERDA: VARIEDAD MÁXIMA. Cada evaluación debe sentirse única y diferente.`;
  }

  // Instrucciones para otras personalidades
  else if (personalityKey === "funny") {
    basePrompt += `

INSTRUCCIONES PARA MODO CHISTOSO:
- Incluye humor y chistes en TODOS los campos de respuesta
- Usa referencias divertidas y memes apropiados
- Mantén el humor inteligente pero educativo
- Haz que la evaluación sea entretenida sin perder el rigor académico`;
  } else if (personalityKey === "encouraging") {
    basePrompt += `

INSTRUCCIONES PARA MODO MOTIVADOR:
- Sé extremadamente positivo y alentador en TODOS los campos
- Encuentra aspectos positivos incluso en respuestas incorrectas
- Motiva al estudiante en cada sección de la evaluación
- Usa lenguaje inspirador y emojis positivos como 💪✨🌟`;
  } else if (personalityKey === "sarcastic") {
    basePrompt += `

INSTRUCCIONES PARA MODO SARCÁSTICO:
- Usa ironía y sarcasmo constructivo en TODOS los campos
- Sé ingenioso pero mantén la utilidad educativa
- Incluye comentarios irónicos pero no crueles
- Usa emojis como 🙄😏🤔 para enfatizar el sarcasmo`;
  } else if (personalityKey === "strict") {
    basePrompt += `

INSTRUCCIONES PARA MODO EXIGENTE:
- Sé muy detallista y estricto en TODOS los campos
- Busca errores menores y analízalos minuciosamente
- Mantén estándares muy altos en toda la evaluación
- Usa un tono formal pero exigente`;
  }

  return basePrompt;
}

// Función para generar estilos aleatorios de hater
function getRandomHaterStyle() {
  const haterStyles = [
    {
      name: "🔥 FURIOSO",
      description:
        "Usa emojis de fuego, explosiones, grita con MAYÚSCULAS, expresa ira extrema",
      emojis: "🔥💥⚡️😠😡🤬👊",
      phrases: [
        "¡¿QUÉ ES ESTA BASURA?!",
        "¿Realmente crees que esto merece algo?",
        "¡ESTO ES INACEPTABLE!",
        "¿Cómo te atreves a entregar esto?",
        "¡ME HACES ENFURECER!",
      ],
      example:
        "¡¿QUÉ ES ESTA BASURA?! 🔥💥 ¿Realmente crees que esto merece algo más que un 0? 😠",
    },
    {
      name: "😩 DESESPERADO",
      description:
        "Expresa tu frustración con emojis de llanto, suspiros, resignación total",
      emojis: "😩😭😢🥺😔😞",
      phrases: [
        "Dios mío...",
        "No puedo más con esto...",
        "Me rindo...",
        "Esto es el colmo...",
        "Ya no aguanto...",
      ],
      example:
        "Dios mío... 😩😭 No puedo más con este nivel de incompetencia 😢",
    },
    {
      name: "😏 SARCÁSTICO",
      description:
        "Ironía inteligente, comentarios mordaces, burlas sutiles y elegantes",
      emojis: "😏🙄😒🤨😌",
      phrases: [
        "Oh, qué sorpresa...",
        "Como era de esperar...",
        "Qué original...",
        "Nunca lo hubiera imaginado...",
        "Qué brillante idea...",
      ],
      example:
        "Oh, qué sorpresa... 😏 Otra respuesta que demuestra que no leíste nada 🙄",
    },
    {
      name: "😱 HORRORIZADO",
      description:
        "Emojis de shock, expresiones de incredulidad, asombro extremo",
      emojis: "😱😨😰😵‍💫🤯",
      phrases: [
        "¿Qué acabo de leer?",
        "Esto es... esto es...",
        "No tengo palabras...",
        "¿En serio?",
        "Esto es una pesadilla...",
      ],
      example:
        "😱😨 ¿Qué acabo de leer? Esto es... esto es... no tengo palabras 😵‍💫",
    },
    {
      name: "🤬 AGRESIVO",
      description:
        "Emojis de enojo extremo, amenazas vacías, intimidación verbal",
      emojis: "🤬👿😤💢🗯️",
      phrases: [
        "ESTO ES INACEPTABLE",
        "¿Cómo te atreves?",
        "Esto es un insulto",
        "No tolero esto",
        "Esto es una afrenta",
      ],
      example:
        "🤬👿 ESTO ES INACEPTABLE. ¿Cómo te atreves a entregar semejante DESASTRE? 💢",
    },
    {
      name: "😤 EXASPERADO",
      description:
        "Suspiros, emojis de cansancio, 'ya no puedo más', resignación",
      emojis: "😤😮‍💨😪😴🥱",
      phrases: [
        "Ya no puedo más...",
        "Esto es el colmo...",
        "Me canso de esto...",
        "No aguanto más...",
        "Esto es demasiado...",
      ],
      example: "😤😮‍💨 Ya no puedo más... esto es el colmo de la mediocridad 😪",
    },
    {
      name: "😈 MALVADO",
      description:
        "Comentarios siniestros, emojis de diablo, malicia calculada",
      emojis: "😈👹🤡💀",
      phrases: [
        "Oh, esto va a ser divertido...",
        "Qué desastre tan hermoso...",
        "Esto es tan malo que es bueno...",
        "Qué joya de incompetencia...",
        "Esto es un tesoro de mediocridad...",
      ],
      example:
        "😈👹 Oh, esto va a ser divertido... tu respuesta es tan mala que casi me da pena 💀",
    },
    {
      name: "💀 MORTAL",
      description: "Referencias a la muerte, 'me matas', 'esto es letal'",
      emojis: "💀☠️⚰️🪦",
      phrases: [
        "Esto es letal...",
        "Me estás matando...",
        "Esto es mortal...",
        "Me muero de vergüenza ajena...",
        "Esto es el fin...",
      ],
      example:
        "💀☠️ Esto es letal para mi salud mental. Me estás matando lentamente ⚰️",
    },
    {
      name: "🎭 DRAMÁTICO",
      description: "Expresiones teatrales, exageración extrema, drama excesivo",
      emojis: "🎭🎪🎨🎬🎤",
      phrases: [
        "¡Qué tragedia!",
        "Esto es una obra maestra de la incompetencia",
        "Qué espectáculo tan deplorable",
        "Esto merece un Oscar por lo malo",
        "Qué drama tan patético",
      ],
      example:
        "🎭🎪 ¡Qué tragedia! Esto es una obra maestra de la incompetencia 🎨",
    },
    {
      name: "🤡 PAYASO",
      description: "Comentarios ridículos, emojis de payaso, burla exagerada",
      emojis: "🤡🎪🎭🎨",
      phrases: [
        "Qué payasada...",
        "Esto es un circo...",
        "Qué espectáculo tan ridículo...",
        "Esto es una comedia...",
        "Qué chiste tan malo...",
      ],
      example: "🤡🎪 Qué payasada... esto es un circo de incompetencia 🎭",
    },
  ];

  // Return a random style
  return haterStyles[Math.floor(Math.random() * haterStyles.length)];
}
