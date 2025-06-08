# 🔥 Configuración de Firebase Auth

## Pasos para configurar Firebase Authentication

### 1. Crear proyecto en Firebase
1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Haz clic en "Crear proyecto"
3. Nombra tu proyecto (ej: "preguntitas-quiz")
4. Acepta los términos y continúa
5. Desactiva Google Analytics (opcional)
6. Haz clic en "Crear proyecto"

### 2. Configurar Authentication
1. En el panel lateral, ve a **Authentication**
2. Haz clic en "Comenzar"
3. Ve a la pestaña **Sign-in method**
4. Habilita **Email/Password**:
   - Haz clic en "Email/Password"
   - Activa la primera opción (Email/Password)
   - Haz clic en "Guardar"

### 3. Obtener configuración
1. Ve a **Project Settings** (ícono de engranaje)
2. Baja hasta la sección "Tu aplicación"
3. Haz clic en el ícono **</>** (Web)
4. Registra tu app con un nombre (ej: "Preguntitas Web")
5. **NO** marques "Firebase Hosting"
6. Haz clic en "Registrar app"
7. **Copia la configuración** que aparece

### 4. Configurar en tu aplicación
1. Abre el archivo `src/config/firebase.js`
2. Reemplaza la configuración placeholder con tu configuración real:

```javascript
const firebaseConfig = {
  apiKey: "tu-api-key-aqui",
  authDomain: "tu-proyecto.firebaseapp.com",
  projectId: "tu-proyecto-id",
  storageBucket: "tu-proyecto.appspot.com",
  messagingSenderId: "123456789",
  appId: "tu-app-id"
};
```

### 5. Configurar dominio autorizado (para producción)
1. En Firebase Console, ve a **Authentication** > **Settings**
2. En la pestaña **Authorized domains**
3. Agrega tu dominio de producción

## ✅ ¡Listo!

Ahora tu aplicación tendrá:
- 🔐 Login/registro con email y contraseña
- 🛡️ Protección de rutas (solo usuarios autenticados pueden acceder)
- 👤 Información del usuario en el header
- 🚪 Botón de logout
- 💾 Persistencia de sesión (el usuario permanece logueado)

## 🔧 Funcionalidades implementadas

### Para usuarios no autenticados:
- Página de bienvenida atractiva
- Modal de login/registro

### Para usuarios autenticados:
- Acceso completo a la aplicación
- Email del usuario en el header
- Botón de logout
- Persistencia de preferencias (tipo de pregunta, etc.)

## 🚀 Próximos pasos sugeridos

1. **Perfil de usuario**: Agregar nombre, foto, estadísticas
2. **Historial**: Guardar progreso y resultados en Firestore
3. **Compartir**: Funcionalidad para compartir quizzes
4. **Roles**: Diferentes tipos de usuarios (admin, premium, etc.)
5. **Social auth**: Login con Google, GitHub, etc.

## ⚠️ Notas importantes

- Los datos del quiz se siguen guardando en localStorage
- La autenticación es solo para acceso a la aplicación
- Para datos persistentes en la nube, necesitarías agregar Firestore
- Las configuraciones de Firebase son públicas (no incluyen secretos) 