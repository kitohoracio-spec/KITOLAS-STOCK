import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: "AIzaSyAUe97ilvAHDT3r6uJNJgAvQmPraTMmHeg",
  authDomain: "kitolas--stock.firebaseapp.com",
  projectId: "kitolas--stock",
  storageBucket: "kitolas--stock.firebasestorage.app",
  messagingSenderId: "864902989752",
  appId: "1:864902989752:web:d589b3d86c3c5bb9e7f14d"
}

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)
