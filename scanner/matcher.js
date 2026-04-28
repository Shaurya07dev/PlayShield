const config = require('./config');

/**
 * Compute Hamming distance between two hex hash strings.
 * Counts the number of differing bits.
 * @param {string} hash1 - First hex hash
 * @param {string} hash2 - Second hex hash
 * @returns {number} - Number of differing bits
 */
function hammingDistance(hash1, hash2) {
  if (!hash1 || !hash2) return Infinity;

  // Normalize lengths
  const maxLen = Math.max(hash1.length, hash2.length);
  const h1 = hash1.padEnd(maxLen, '0');
  const h2 = hash2.padEnd(maxLen, '0');

  let distance = 0;

  for (let i = 0; i < maxLen; i++) {
    const val1 = parseInt(h1[i], 16) || 0;
    const val2 = parseInt(h2[i], 16) || 0;
    let xor = val1 ^ val2;

    // Count set bits (Brian Kernighan's algorithm)
    while (xor > 0) {
      distance++;
      xor &= xor - 1;
    }
  }

  return distance;
}

/**
 * Compute similarity between two Chromaprint fingerprints.
 * Uses character-level overlap as a simple comparison.
 * @param {string} fp1 - First base64 fingerprint
 * @param {string} fp2 - Second base64 fingerprint
 * @returns {number} - Similarity score 0-1
 */
function chromaprintSimilarity(fp1, fp2) {
  if (!fp1 || !fp2) return 0;

  // Decode from base64 for comparison
  const buf1 = Buffer.from(fp1, 'base64');
  const buf2 = Buffer.from(fp2, 'base64');

  const minLen = Math.min(buf1.length, buf2.length);
  if (minLen === 0) return 0;

  let matchingBytes = 0;

  for (let i = 0; i < minLen; i++) {
    // Count matching bits per byte
    const xor = buf1[i] ^ buf2[i];
    let diffBits = 0;
    let val = xor;
    while (val > 0) {
      diffBits++;
      val &= val - 1;
    }
    // 8 bits per byte, so similarity = (8 - diffBits) / 8
    matchingBytes += (8 - diffBits) / 8;
  }

  return matchingBytes / minLen;
}

/**
 * Compute combined match confidence from pHash distance and audio similarity.
 * @param {number} phashDist - Hamming distance (lower = more similar)
 * @param {number} audioSim - Audio similarity (0-1, higher = more similar)
 * @returns {number} - Combined confidence 0-1
 */
function computeConfidence(phashDist, audioSim) {
  // Convert pHash distance to a 0-1 similarity score
  // Distance of 0 = perfect match = 1.0
  // Distance of 64 (max for 16-hex-char hash) = no match = 0.0
  const maxDistance = 64;
  const phashScore = Math.max(0, 1 - (phashDist / maxDistance));

  return (config.PHASH_WEIGHT * phashScore) + (config.AUDIO_WEIGHT * audioSim);
}

/**
 * Compute risk score from confidence and fingerprint metrics.
 * @param {number} confidence - Combined confidence 0-1
 * @param {number} phashDist - Hamming distance
 * @returns {number} - Risk score 0-100
 */
function computeRiskScore(confidence, phashDist) {
  let score = confidence * 100;

  if (confidence > 0.9) score += 10;
  if (phashDist < 5) score += 10;

  return Math.min(Math.round(score), 100);
}

/**
 * Match a candidate's fingerprints against all registered original assets.
 * @param {Object} candidateFingerprints - { phash, chromaprint }
 * @param {Array} assets - Array of asset documents from Firestore
 * @returns {Object|null} - Best match result or null if no match
 */
function matchAgainstAssets(candidateFingerprints, assets) {
  if (!assets || assets.length === 0) {
    console.log('   ⚠️  No registered assets to compare against');
    return null;
  }

  let bestMatch = null;
  let bestConfidence = 0;

  for (const asset of assets) {
    const originalFP = asset.fingerprints;
    if (!originalFP) continue;

    const phashDist = hammingDistance(candidateFingerprints.phash, originalFP.phash);
    const audioSim = chromaprintSimilarity(candidateFingerprints.chromaprint, originalFP.chromaprint);
    const confidence = computeConfidence(phashDist, audioSim);
    const riskScore = computeRiskScore(confidence, phashDist);

    console.log(`   📐 vs Asset [${asset.assetId?.substring(0, 8)}...]: ` +
                `pHash=${phashDist} bits, audio=${(audioSim * 100).toFixed(1)}%, ` +
                `confidence=${(confidence * 100).toFixed(1)}%, risk=${riskScore}`);

    if (confidence > bestConfidence) {
      bestConfidence = confidence;
      bestMatch = {
        assetId: asset.assetId,
        phashDistance: phashDist,
        audioSimilarity: parseFloat(audioSim.toFixed(4)),
        matchConfidence: parseFloat(confidence.toFixed(4)),
        riskScore,
      };
    }
  }

  if (bestMatch && bestMatch.matchConfidence >= config.CONFIDENCE_THRESHOLD) {
    return bestMatch;
  }

  return null;
}

module.exports = {
  hammingDistance,
  chromaprintSimilarity,
  computeConfidence,
  computeRiskScore,
  matchAgainstAssets,
};
