import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
    apiKey: "AIzaSyCAckkk9c7rcsQowdKyXuyb0IqTNc9GTzQ",
    authDomain: "koizen.firebaseapp.com",
    projectId: "koizen",
    storageBucket: "koizen.firebasestorage.app",
    messagingSenderId: "578816294896",
    appId: "1:578816294896:web:8d8ca219b89b7d10de2735",
    measurementId: "G-L5WPS5PVCC"
};

export const app = initializeApp(firebaseConfig);
export const analytics = getAnalytics(app);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app, 'asia-northeast1');
export const googleProvider = new GoogleAuthProvider();
