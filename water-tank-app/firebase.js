// src/firebase.js
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCFp5OG1P82GGfOhmBJ-tRqdZUQ3K2a0PI",
  authDomain: "water-tank-project-a7a5d.firebaseapp.com",
  projectId: "water-tank-project-a7a5d",
  storageBucket: "water-tank-project-a7a5d.appspot.com",
  messagingSenderId: "851360399166",
  appId: "1:851360399166:web:3bcc8ad9073ddfc798f66f",
  measurementId: "G-KPJELQ16IE"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
