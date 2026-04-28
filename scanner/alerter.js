const { v4: uuidv4 } = require('uuid');
const { db, admin } = require('./firebase-admin');

/**
 * Create a piracy alert in Firestore.
 * @param {Object} matchResult - Match data from matcher.js
 * @param {Object} candidateInfo - YouTube video info
 * @returns {Promise<string>} - Alert ID
 */
async function createAlert(matchResult, candidateInfo) {
  const alertId = uuidv4();

  const alertDoc = {
    alertId,
    assetId: matchResult.assetId,
    candidateVideoUrl: candidateInfo.url,
    candidateTitle: candidateInfo.title || 'Unknown',
    candidateThumbnail: candidateInfo.thumbnail || '',
    candidateChannel: candidateInfo.channelTitle || 'Unknown',
    matchConfidence: matchResult.matchConfidence,
    phashDistance: matchResult.phashDistance,
    audioSimilarity: matchResult.audioSimilarity,
    riskScore: matchResult.riskScore,
    status: 'pending_review',
    detectedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  await db.collection('alerts').doc(alertId).set(alertDoc);

  console.log(`\n   🚨 ALERT CREATED`);
  console.log(`      Alert ID:    ${alertId}`);
  console.log(`      Asset ID:    ${matchResult.assetId}`);
  console.log(`      Confidence:  ${(matchResult.matchConfidence * 100).toFixed(1)}%`);
  console.log(`      Risk Score:  ${matchResult.riskScore}/100`);
  console.log(`      Video:       ${candidateInfo.title}`);
  console.log(`      Status:      pending_review`);

  return alertId;
}

/**
 * Check if an alert already exists for a candidate video URL.
 * @param {string} videoUrl - YouTube video URL
 * @returns {Promise<boolean>} - True if alert already exists
 */
async function alertExists(videoUrl) {
  const snapshot = await db
    .collection('alerts')
    .where('candidateVideoUrl', '==', videoUrl)
    .limit(1)
    .get();

  return !snapshot.empty;
}

/**
 * Get all existing alerts.
 * @returns {Promise<Array>} - Array of alert documents
 */
async function getAllAlerts() {
  const snapshot = await db.collection('alerts').orderBy('riskScore', 'desc').get();
  return snapshot.docs.map(doc => doc.data());
}

module.exports = { createAlert, alertExists, getAllAlerts };
