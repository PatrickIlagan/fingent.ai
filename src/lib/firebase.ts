import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

const firebaseConfig = {
  projectId: "vast-connection-dn50x",
  appId: "1:562923369745:web:258d07261e30c964ff48b0",
  apiKey: "AIzaSyCWEwyZkN4l1Glv5h-HkHM7KI6uAOYe8ek",
  authDomain: "vast-connection-dn50x.firebaseapp.com",
  storageBucket: "vast-connection-dn50x.firebasestorage.app",
  messagingSenderId: "562923369745"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('https://www.googleapis.com/auth/drive.file');
