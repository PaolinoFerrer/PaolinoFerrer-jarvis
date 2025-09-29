// Import the functions you need from the SDKs you need
// FIX: The direct named import `initializeApp` was failing, likely due to a module resolution issue in the build environment.
// Switched to a namespace import (`* as firebase`) which can be more robust in these cases.
import * as firebase from "firebase/app";
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
const app = firebase.initializeApp(firebaseConfig);

// Initialize and export Firebase services
export const db = getFirestore(app);
export const storage = getStorage(app);
