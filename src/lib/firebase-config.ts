
import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDVBwk2dqZXbVGkWvxwIEmDCrHKGy-7Wow",
  authDomain: "greenhouse-656f2.firebaseapp.com",
  databaseURL: "https://greenhouse-656f2-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "greenhouse-656f2",
  storageBucket: "greenhouse-656f2.firebasestorage.app",
  messagingSenderId: "1006729001046",
  appId: "1:1006729001046:web:0e0fce0ea4c143911b23f7"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const database = getDatabase(app);

