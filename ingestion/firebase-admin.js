const admin = require('firebase-admin');
const config = require('./config');

// Initialize Firebase Admin SDK
const serviceAccount = require(config.SERVICE_ACCOUNT_PATH);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: config.FIREBASE_PROJECT_ID,
});

const db = admin.firestore();

// Log successful connection
console.log(`🔥 Firebase Admin SDK initialized for project: ${config.FIREBASE_PROJECT_ID}`);

module.exports = { admin, db };
