const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

module.exports = {
  PORT: process.env.PORT || 3000,
  HMAC_SECRET: process.env.HMAC_SECRET || 'playshield-secret',
  FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID || 'playshield-e5f49',
  SERVICE_ACCOUNT_PATH: path.resolve(__dirname, '../serviceAccountKey.json'),
  UPLOADS_DIR: path.resolve(__dirname, 'uploads', 'originals'),
  FRAMES_DIR: path.resolve(__dirname, 'uploads', 'frames'),
};
