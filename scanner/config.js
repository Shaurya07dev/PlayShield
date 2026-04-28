const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

module.exports = {
  YOUTUBE_API_KEY: process.env.YOUTUBE_API_KEY || '',
  FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID || 'playshield-e5f49',
  SERVICE_ACCOUNT_PATH: path.resolve(__dirname, '../serviceAccountKey.json'),
  TEMP_DIR: path.resolve(__dirname, 'temp'),
  FRAMES_DIR: path.resolve(__dirname, 'temp', 'frames'),

  // Matching thresholds
  PHASH_THRESHOLD: 10,         // Max Hamming distance to consider a match
  AUDIO_THRESHOLD: 0.75,       // Min audio similarity to consider a match
  CONFIDENCE_THRESHOLD: 0.7,   // Min combined confidence to trigger alert
  PHASH_WEIGHT: 0.6,           // Weight of pHash in combined score
  AUDIO_WEIGHT: 0.4,           // Weight of audio in combined score
  MAX_RESULTS: 5,              // Max YouTube search results
  SNIPPET_DURATION: 15,        // Seconds of video to download
};
