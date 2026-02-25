// Firebase configuration and service
import { initializeApp } from 'firebase/app'
import { getAnalytics } from 'firebase/analytics'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCAX6cFLuZc8DObgkjxW2ufcgwtBe3pYCQ",
  authDomain: "dvashschoolweb.firebaseapp.com",
  projectId: "dvashschoolweb",
  storageBucket: "dvashschoolweb.firebasestorage.app",
  messagingSenderId: "910709129813",
  appId: "1:910709129813:web:dca22031e6b248778c8adc",
  measurementId: "G-ZEJ35XT7C7"
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)

// Initialize Analytics (only in browser environment)
let analytics = null
if (typeof window !== 'undefined') {
  analytics = getAnalytics(app)
}

// Initialize Firestore
export const db = getFirestore(app)

// Firebase Auth (used for Firestore write rules: sign in with custom token in edit mode)
export const auth = typeof window !== 'undefined' ? getAuth(app) : null

// Initialize Storage
export const storage = getStorage(app)

// Export analytics
export { analytics }

// Contact form submission service (delegates to centralized DB service)
export const submitContactForm = async (formData) => {
  const { submitContactFormToDB } = await import('./firebaseDB')
  return await submitContactFormToDB(formData)
}

// FAQ data fetching service (if you want to store FAQs in Firebase)
export const getFAQs = async () => {
  // TODO: Implement Firebase fetching
  // Example:
  // const q = query(collection(db, 'faqs'), orderBy('order', 'asc'))
  // const querySnapshot = await getDocs(q)
  // return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))

  // For now, return empty array - FAQs are currently static
  return []
}

export default firebaseConfig
