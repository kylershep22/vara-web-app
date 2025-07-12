// src/firebase.js
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyB_RQJh0cMU3ruEm3vAY1uSKIk7vPlY6lc",
  authDomain: "vara-4a99f.firebaseapp.com",
  projectId: "vara-4a99f",
  storageBucket: "vara-4a99f.firebasestorage.app",
  messagingSenderId: "621980275569",
  appId: "1:621980275569:web:d7a0d5fe6c024fd3575cd0"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Auth
export const auth = getAuth(app);

// Firestore
export const db = getFirestore(app); // ✅ this line fixes the error
