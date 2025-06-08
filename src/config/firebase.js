// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAuNQRRsg58VrWnKdxbaR6-_eWOyZnEMts",
  authDomain: "preguntitas-d05dc.firebaseapp.com",
  projectId: "preguntitas-d05dc",
  storageBucket: "preguntitas-d05dc.firebasestorage.app",
  messagingSenderId: "1017154746945",
  appId: "1:1017154746945:web:7d338c110aa605af7a64c0",
  measurementId: "G-9CWLB5TW8C",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);
export default app;
