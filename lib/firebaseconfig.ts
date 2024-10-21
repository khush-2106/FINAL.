// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyByE0n0VmIkf4aNy9UdW7ny92OXIwDWnf0",
  authDomain: "tracking-57fa5.firebaseapp.com",
  projectId: "tracking-57fa5",
  storageBucket: "tracking-57fa5.appspot.com",
  messagingSenderId: "253981080387",
  appId: "1:253981080387:web:db2931c0f6c406b714cdf6"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
import { getFirestore } from "firebase/firestore";
export const db = getFirestore(app);