const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const config = require('./config');

/**
 * Extract keyframes from a video using FFmpeg.
 * @param {string} videoPath - Path to video file
 * @returns {Promise<string[]>} - Array of frame file paths
 */
async function extractFrames(videoPath) {
  const framesDir = config.FRAMES_DIR;

  if (!fs.existsSync(framesDir)) {
    fs.mkdirSync(framesDir, { recursive: true });
  }

  // Clean existing frames
  const existing = fs.readdirSync(framesDir).filter(f => f.endsWith('.png'));
  existing.forEach(f => fs.unlinkSync(path.join(framesDir, f)));

  const outputPattern = path.join(framesDir, 'frame_%04d.png');

  try {
    execSync(
      `ffmpeg -i "${videoPath}" -vf "fps=1,scale=64:64" -frames:v 30 "${outputPattern}" -y 2>/dev/null`,
      { stdio: 'pipe', timeout: 60000 }
    );
  } catch (err) {
    try {
      execSync(
        `ffmpeg -i "${videoPath}" -vf "fps=0.5,scale=64:64" -frames:v 5 "${outputPattern}" -y 2>/dev/null`,
        { stdio: 'pipe', timeout: 60000 }
      );
    } catch (e) {
      return [];
    }
  }

  return fs.readdirSync(framesDir)
    .filter(f => f.endsWith('.png'))
    .sort()
    .map(f => path.join(framesDir, f));
}

/**
 * Compute perceptual hash for a video.
 * @param {string} videoPath - Path to video file
 * @returns {Promise<string>} - Hex perceptual hash
 */
async function extractPHash(videoPath) {
  const frames = await extractFrames(videoPath);

  if (frames.length === 0) {
    const fileBuffer = fs.readFileSync(videoPath);
    return crypto.createHash('sha256').update(fileBuffer).digest('hex').substring(0, 16);
  }

  try {
    const imghash = require('imghash');
    const hashes = [];

    for (const framePath of frames) {
      try {
        const hash = await imghash.hash(framePath, 16);
        hashes.push(hash);
      } catch (e) {
        continue;
      }
    }

    if (hashes.length === 0) {
      const fileBuffer = fs.readFileSync(videoPath);
      return crypto.createHash('sha256').update(fileBuffer).digest('hex').substring(0, 16);
    }

    return hashes[0];
  } catch (err) {
    const fileBuffer = fs.readFileSync(videoPath);
    return crypto.createHash('sha256').update(fileBuffer).digest('hex').substring(0, 16);
  }
}

/**
 * Extract audio fingerprint using Chromaprint.
 * @param {string} videoPath - Path to video file
 * @returns {Promise<string>} - Base64 audio fingerprint
 */
async function extractChromaprint(videoPath) {
  try {
    const audioPath = videoPath.replace(/\.[^.]+$/, '_audio.wav');

    try {
      execSync(
        `ffmpeg -i "${videoPath}" -ac 1 -ar 11025 -t 30 "${audioPath}" -y 2>/dev/null`,
        { stdio: 'pipe', timeout: 60000 }
      );
    } catch (err) {
      const fileBuffer = fs.readFileSync(videoPath);
      return crypto.createHash('md5').update(fileBuffer).digest('base64');
    }

    try {
      const output = execSync(`fpcalc -raw "${audioPath}"`, {
        stdio: 'pipe',
        timeout: 30000,
      }).toString();

      if (fs.existsSync(audioPath)) fs.unlinkSync(audioPath);

      const match = output.match(/FINGERPRINT=(.+)/);
      if (match) {
        return Buffer.from(match[1]).toString('base64');
      }
    } catch (e) {
      // fpcalc not available
    }

    if (fs.existsSync(audioPath)) {
      const audioBuffer = fs.readFileSync(audioPath);
      fs.unlinkSync(audioPath);
      return crypto.createHash('md5').update(audioBuffer).digest('base64');
    }

    const fileBuffer = fs.readFileSync(videoPath);
    return crypto.createHash('md5').update(fileBuffer).digest('base64');
  } catch (err) {
    const fileBuffer = fs.readFileSync(videoPath);
    return crypto.createHash('md5').update(fileBuffer).digest('base64');
  }
}

/**
 * Extract all fingerprints from a video.
 * @param {string} videoPath - Path to video file
 * @returns {Promise<Object>} - { phash, chromaprint }
 */
async function extractFingerprints(videoPath) {
  const phash = await extractPHash(videoPath);
  const chromaprint = await extractChromaprint(videoPath);

  return { phash, chromaprint };
}

module.exports = { extractFingerprints, extractPHash, extractChromaprint };
