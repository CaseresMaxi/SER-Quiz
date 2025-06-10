import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../config/firebase";

export const diagnoseFirebase = async (user) => {
  console.log("🔍 DIAGNÓSTICO DE FIREBASE");

  if (!user) {
    console.error("❌ Usuario no autenticado");
    return false;
  }

  console.log(`✅ Usuario autenticado: ${user.uid}`);
  console.log(`📧 Email: ${user.email}`);

  try {
    // Test 1: Try to read user document
    console.log("🧪 Test 1: Intentando leer documento de usuario...");
    const userDocRef = doc(db, "users", user.uid);
    const userDoc = await getDoc(userDocRef);

    if (userDoc.exists()) {
      console.log("✅ Documento de usuario existe");
      console.log("📄 Datos:", userDoc.data());
    } else {
      console.log("⚠️ Documento de usuario no existe, intentando crear...");

      // Test 2: Try to create user document
      console.log("🧪 Test 2: Intentando crear documento de usuario...");
      await setDoc(userDocRef, {
        createdAt: new Date(),
        lastUpdated: new Date(),
        quizData: {
          questionType: "choice",
        },
        migrated: false,
        test: true,
      });

      console.log("✅ Documento de usuario creado exitosamente");
    }

    return true;
  } catch (error) {
    console.error("❌ Error en diagnóstico de Firebase:", error);

    if (error.code === "permission-denied") {
      console.error("🚫 ERROR DE PERMISOS");
      console.error("Las reglas de Firestore no permiten esta operación.");
      console.error("Sigue las instrucciones en FIRESTORE_RULES_SETUP.md");
    }

    return false;
  }
};

// Test de conectividad básica
export const testFirebaseConnection = () => {
  console.log("🔗 Testing Firebase connection...");

  if (!db) {
    console.error("❌ Firebase DB no inicializado");
    return false;
  }

  console.log("✅ Firebase DB conectado");
  console.log("🏗️ App:", db.app.name);

  return true;
};
