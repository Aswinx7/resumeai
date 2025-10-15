import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'

const firebaseConfig = {
  apiKey: "AIzaSyDQ38OgfrDdJb1W8Ftqx9URHofRKAYZC7k",
  authDomain: "resume-builder-609e3.firebaseapp.com",
  projectId: "resume-builder-609e3",
  storageBucket: "resume-builder-609e3.firebasestorage.app",
  messagingSenderId: "700428464351",
  appId: "1:700428464351:web:ea151fbd9739b0187bf96a"
};

export const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const googleProvider = new GoogleAuthProvider()
