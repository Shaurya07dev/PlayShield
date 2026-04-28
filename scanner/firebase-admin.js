const admin = require('firebase-admin');
const config = require('./config');

// Prevent multiple initializations
if (!admin.apps.length) {
  const serviceAccount = require(config.SERVICE_ACCOUNT_PATH);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: config.FIREBASE_PROJECT_ID,
  });
}

const db = admin.firestore();
console.log(`🔥 Scanner connected to Firestore: ${config.FIREBASE_PROJECT_ID}`);

module.exports = { admin, db };
