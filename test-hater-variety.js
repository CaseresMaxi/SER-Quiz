// Test script to verify hater mode variety improvements
// This script tests the getRandomHaterStyle function

// Simulate the getRandomHaterStyle function
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

  return haterStyles[Math.floor(Math.random() * haterStyles.length)];
}

// Test the variety
console.log("🧪 Testing Hater Mode Variety Improvements");
console.log("==========================================");

const results = [];
const usedStyles = new Set();

// Generate 20 random styles to test variety
for (let i = 0; i < 20; i++) {
  const style = getRandomHaterStyle();
  results.push(style);
  usedStyles.add(style.name);

  console.log(`${i + 1}. ${style.name}`);
  console.log(`   Emojis: ${style.emojis}`);
  console.log(`   Example: ${style.example}`);
  console.log("");
}

// Analyze variety
console.log("📊 Variety Analysis:");
console.log(`Total styles generated: ${results.length}`);
console.log(`Unique styles used: ${usedStyles.size}`);
console.log(
  `Variety percentage: ${((usedStyles.size / results.length) * 100).toFixed(
    1
  )}%`
);

if (usedStyles.size >= 8) {
  console.log("✅ EXCELLENT variety! Most styles are being used.");
} else if (usedStyles.size >= 6) {
  console.log("✅ GOOD variety! Multiple styles are being used.");
} else if (usedStyles.size >= 4) {
  console.log("⚠️ MODERATE variety. Some repetition detected.");
} else {
  console.log("❌ POOR variety. Too much repetition.");
}

console.log("\n🎯 Used styles:");
usedStyles.forEach((style) => console.log(`   - ${style}`));

console.log("\n🎭 Unused styles:");
const allStyles = [
  "🔥 FURIOSO",
  "😩 DESESPERADO",
  "😏 SARCÁSTICO",
  "😱 HORRORIZADO",
  "🤬 AGRESIVO",
  "😤 EXASPERADO",
  "😈 MALVADO",
  "💀 MORTAL",
  "🎭 DRAMÁTICO",
  "🤡 PAYASO",
];

allStyles.forEach((style) => {
  if (!usedStyles.has(style)) {
    console.log(`   - ${style}`);
  }
});
