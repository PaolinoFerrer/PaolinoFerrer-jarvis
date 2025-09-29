// Import the functions you need from the SDKs you need
// FIX: Corrected Firebase initialization. The previous namespace import `import * as FirebaseApp`
// is not the standard way for the Firebase v9+ modular SDK and caused an error.
// Switched to a direct named import of `initializeApp`.
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyA2_-RPwj6jxXzQKJCCTO7qwCkiiwnEMXY",
  authDomain: "jarvis-dvr-net.firebaseapp.com",
  projectId: "jarvis-dvr-net",
  storageBucket: "jarvis-dvr-net.appspot.com",
  messagingSenderId: "672925946803",
  appId: "1:672925946803:web:33a3ddf0206157bc2431c6"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize and export Firebase services
export const db = getFirestore(app);
export const storage = getStorage(app);
