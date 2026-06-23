import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, GoogleAuthProvider, GithubAuthProvider, OAuthProvider } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-analytics.js";

export const CFG = {
  cloudinaryCloud:  "dt7jg4zci",
  cloudinaryPreset: "logostrack",
  firebaseConfig: {
    apiKey:            "AIzaSyC8LkY1_voo2AFX0NImfkZjdc1Zrcjn2S8",
    authDomain:        "logossystemcoleta.firebaseapp.com",
    projectId:         "logossystemcoleta",
    storageBucket:     "logossystemcoleta.appspot.com",
    messagingSenderId: "681461082199",
    appId:             "1:681461082199:web:0d9012ac945f4d951a9b12"
  },
  appId: 'patriscan-mvp',
  itemsPerPage: 10
};

export const fbApp = initializeApp(CFG.firebaseConfig);
export const auth = getAuth(fbApp);
export const db = getFirestore(fbApp);
export const analytics = getAnalytics(fbApp);

export const googleProvider = new GoogleAuthProvider();
export const githubProvider = new GithubAuthProvider();
export const microsoftProvider = new OAuthProvider('microsoft.com');