import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";

import {
  getFirestore,
  doc,
  setDoc,
  onSnapshot,
  collection
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAXs3JIC32b4JFhndDxtTptywQqSb5oeOw",
  authDomain: "plutomars-game.firebaseapp.com",
  projectId: "plutomars-game",
  storageBucket: "plutomars-game.firebasestorage.app",
  messagingSenderId: "861771746833",
  appId: "1:861771746833:web:c66f62ca1d589fb157abb0"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db, doc, setDoc, onSnapshot, collection };
