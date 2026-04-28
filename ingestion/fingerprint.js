const { execSync, exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const config = require('./config');

/**
 * Extract keyframes from a video using FFmpeg.
 * Extracts 1 frame per second as PNG images.
 * @param {string} videoPath - Absolute path to the video file
 * @returns {Promise<string[]>} - Array of frame file paths
 */
async function extractFrames(videoPath) {
  const framesDir = config.FRAMES_DIR;
  
  // Create frames directory if it doesn't exist
  if (!fs.existsSync(framesDir)) {
    fs.mkdirSync(framesDir, { recursive: true });
  }

  // Clean up any existing frames
  const existing = fs.readdirSync(framesDir).filter(f => f.endsWith('.png'));
  existing.forEach(f => fs.unlinkSync(path.join(framesDir, f)));

  const outputPattern = path.join(framesDir, 'frame_%04d.png');

  try {
    // Extract 1 frame per second, scale to 64x64 for consistent hashing
    execSync(
      `ffmpeg -i "${videoPath}" -vf "fps=1,scale=64:64" -frames:v 30 "${outputPattern}" -y 2>/dev/null`,
      { stdio: 'pipe', timeout: 60000 }
    );
  } catch (err) {
    console.warn('⚠️  FFmpeg frame extraction encountered an issue, trying fallback...');
    // Fallback: extract just 5 frames
    try {
      execSync(
        `ffmpeg -i "${videoPath}" -vf "fps=0.5,scale=64:64" -frames:v 5 "${outputPattern}" -y 2>/dev/null`,
        { stdio: 'pipe', timeout: 60000 }
      );
    } catch (fallbackErr) {
      console.error('❌ FFmpeg not available or video format unsupported');
      return [];
    }
  }

  const frames = fs.readdirSync(framesDir)
    .filter(f => f.endsWith('.png'))
    .sort()
    .map(f => path.join(framesDir, f));

  console.log(`🎞️  Extracted ${frames.length} keyframes`);
  return frames;
}

/**
 * Compute a perceptual hash (pHash) for a video.
 * Extracts keyframes and hashes each, then produces a representative hash.
 * @param {string} videoPath - Path to video file
 * @returns {Promise<string>} - Hex perceptual hash string
 */
async function extractPHash(videoPath) {
  const frames = await extractFrames(videoPath);
  
  if (frames.length === 0) {
    // Fallback: generate hash from video file content
    console.warn('⚠️  No frames extracted, generating hash from file content');
    const fileBuffer = fs.readFileSync(videoPath);
    const hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
    return hash.substring(0, 16); // Return first 16 hex chars as pseudo-pHash
  }

  try {
    const imghash = require('imghash');
    const hashes = [];

    for (const framePath of frames) {
      try {
        const hash = await imghash.hash(framePath, 16); // 16-bit hash per frame
        hashes.push(hash);
      } catch (frameErr) {
        // Skip frames that fail
        continue;
      }
    }

    if (hashes.length === 0) {
      const fileBuffer = fs.readFileSync(videoPath);
      return crypto.createHash('sha256').update(fileBuffer).digest('hex').substring(0, 16);
    }

    // Use the most common hash as the representative, or the first one
    console.log(`🔐 Computed pHash from ${hashes.length} frames`);
    return hashes[0]; // Return the first frame's hash as representative
  } catch (err) {
    console.warn('⚠️  imghash library issue, using file-based hash fallback');
    const fileBuffer = fs.readFileSync(videoPath);
    return crypto.createHash('sha256').update(fileBuffer).digest('hex').substring(0, 16);
  }
}

/**
 * Extract audio fingerprint using Chromaprint (fpcalc).
 * @param {string} videoPath - Path to video file
 * @returns {Promise<string>} - Base64 audio fingerprint
 */
async function extractChromaprint(videoPath) {
  try {
    // First extract audio from video
    const audioPath = videoPath.replace(/\.[^.]+$/, '_audio.wav');
    
    try {
      execSync(
        `ffmpeg -i "${videoPath}" -ac 1 -ar 11025 -t 30 "${audioPath}" -y 2>/dev/null`,
        { stdio: 'pipe', timeout: 60000 }
      );
    } catch (err) {
      console.warn('⚠️  Audio extraction failed, using file-based fingerprint');
      const fileBuffer = fs.readFileSync(videoPath);
      return crypto.createHash('md5').update(fileBuffer).digest('base64');
    }

    // Run fpcalc on the audio file
    try {
      const output = execSync(`fpcalc -raw "${audioPath}"`, { 
        stdio: 'pipe', 
        timeout: 30000 
      }).toString();
      
      // Clean up audio file
      if (fs.existsSync(audioPath)) fs.unlinkSync(audioPath);

      // Parse fpcalc output — extract the FINGERPRINT line
      const match = output.match(/FINGERPRINT=(.+)/);
      if (match) {
        const fingerprint = Buffer.from(match[1]).toString('base64');
        console.log(`🎵 Extracted Chromaprint fingerprint`);
        return fingerprint;
      }
    } catch (fpcalcErr) {
      console.warn('⚠️  fpcalc not available, using FFmpeg-based audio hash');
    }

    // Fallback: hash the audio file content
    if (fs.existsSync(audioPath)) {
      const audioBuffer = fs.readFileSync(audioPath);
      fs.unlinkSync(audioPath);
      return crypto.createHash('md5').update(audioBuffer).digest('base64');
    }

    // Final fallback
    const fileBuffer = fs.readFileSync(videoPath);
    return crypto.createHash('md5').update(fileBuffer).digest('base64');
  } catch (err) {
    console.error('❌ Chromaprint extraction failed:', err.message);
    const fileBuffer = fs.readFileSync(videoPath);
    return crypto.createHash('md5').update(fileBuffer).digest('base64');
  }
}

/**
 * Extract all fingerprints from a video file.
 * @param {string} videoPath - Path to video file
 * @returns {Promise<Object>} - { phash, chromaprint, logoDetected, logoConfidence }
 */
async function extractFingerprints(videoPath) {
  console.log(`\n📊 Extracting fingerprints from: ${path.basename(videoPath)}`);
  console.log('─'.repeat(50));

  const phash = await extractPHash(videoPath);
  console.log(`   pHash:      ${phash}`);

  const chromaprint = await extractChromaprint(videoPath);
  console.log(`   Chromaprint: ${chromaprint.substring(0, 40)}...`);
  console.log('─'.repeat(50));

  return {
    phash,
    chromaprint,
    logoDetected: false,
    logoConfidence: 0,
  };
}

module.exports = { extractFingerprints, extractPHash, extractChromaprint };
