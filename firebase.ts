import { initializeApp } from "firebase/app";
import { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBh61RDyPcpP03Kp7YEyCQhGLP7JhBw-IY",
  authDomain: "future-industrialists.firebaseapp.com",
  projectId: "future-industrialists",
  storageBucket: "future-industrialists.firebasestorage.app",
  messagingSenderId: "282582549925",
  appId: "1:282582549925:web:384d9ca0f1171d3a65144c",
};

export const app = initializeApp(firebaseConfig);

// Initialize Firestore with offline persistence enabled
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
});

export const storage = getStorage(app);
export const auth = getAuth(app);