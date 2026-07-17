import { initializeApp, getApps, getApp } from 'firebase/app';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyBhDzpEwXmitzfKsRSOb2bl7iJNc2hefrk",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "rankistic-bb66a.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "rankistic-bb66a",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "rankistic-bb66a.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "874222323678",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:874222323678:web:940d8399a5e2f13d3fff4f",
};

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const storage = getStorage(app);

export { app, storage };

/**
 * Uploads a file to Firebase Storage under the receipts folder
 * and returns the public download URL.
 */
export async function uploadReceipt(file: File): Promise<string> {
  const fileName = `${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
  const storageRef = ref(storage, `payment_receipts/${fileName}`);
  
  // Upload bytes
  await uploadBytes(storageRef, file);
  
  // Get download URL
  const downloadUrl = await getDownloadURL(storageRef);
  return downloadUrl;
}

/**
 * Uploads a subscription image (logo/cover) to Firebase Storage
 * under the subscription_assets folder and returns the public download URL.
 */
export async function uploadSubscriptionAsset(file: File): Promise<string> {
  const fileName = `${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
  const storageRef = ref(storage, `subscription_assets/${fileName}`);
  
  // Upload bytes
  await uploadBytes(storageRef, file);
  
  // Get download URL
  const downloadUrl = await getDownloadURL(storageRef);
  return downloadUrl;
}
