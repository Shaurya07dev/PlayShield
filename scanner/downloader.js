const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const config = require('./config');

/**
 * Download a video snippet from YouTube using yt-dlp.
 * @param {string} videoId - YouTube video ID
 * @param {number} duration - Duration in seconds to download
 * @returns {Promise<string|null>} - Path to downloaded file or null
 */
async function downloadSnippet(videoId, duration = config.SNIPPET_DURATION) {
  // Ensure temp directory exists
  if (!fs.existsSync(config.TEMP_DIR)) {
    fs.mkdirSync(config.TEMP_DIR, { recursive: true });
  }

  const outputPath = path.join(config.TEMP_DIR, `${videoId}.mp4`);
  const url = `https://www.youtube.com/watch?v=${videoId}`;

  // Skip download if file already exists
  if (fs.existsSync(outputPath)) {
    console.log(`   📁 Using cached snippet: ${videoId}.mp4`);
    return outputPath;
  }

  // Check if this is a mock video ID
  if (videoId.startsWith('mock_')) {
    console.log(`   📋 Mock video — generating synthetic snippet`);
    return generateMockSnippet(videoId, outputPath);
  }

  try {
    console.log(`   ⬇️  Downloading ${duration}s snippet from: ${url}`);

    // Try yt-dlp first
    try {
      execSync(
        `yt-dlp -f "best[height<=480]" --download-sections "*0-${duration}" ` +
        `-o "${outputPath}" "${url}" --no-warnings --quiet`,
        { stdio: 'pipe', timeout: 120000 }
      );

      if (fs.existsSync(outputPath)) {
        const size = (fs.statSync(outputPath).size / 1024 / 1024).toFixed(2);
        console.log(`   ✅ Downloaded: ${videoId}.mp4 (${size} MB)`);
        return outputPath;
      }
    } catch (ytdlpErr) {
      console.warn('   ⚠️  yt-dlp failed, trying alternative method...');
    }

    // Fallback: try yt-dlp without section download
    try {
      execSync(
        `yt-dlp -f "worst" -o "${outputPath}" "${url}" --no-warnings --quiet`,
        { stdio: 'pipe', timeout: 120000 }
      );

      if (fs.existsSync(outputPath)) {
        // Trim to desired duration with ffmpeg
        const trimmedPath = outputPath.replace('.mp4', '_trimmed.mp4');
        try {
          execSync(
            `ffmpeg -i "${outputPath}" -t ${duration} -c copy "${trimmedPath}" -y 2>/dev/null`,
            { stdio: 'pipe', timeout: 30000 }
          );
          fs.renameSync(trimmedPath, outputPath);
        } catch (e) {
          // Keep original if trim fails
        }
        
        const size = (fs.statSync(outputPath).size / 1024 / 1024).toFixed(2);
        console.log(`   ✅ Downloaded: ${videoId}.mp4 (${size} MB)`);
        return outputPath;
      }
    } catch (fallbackErr) {
      console.warn('   ⚠️  Alternative download also failed');
    }

    // Final fallback: generate mock snippet
    console.warn('   ⚠️  Download tools unavailable, using synthetic snippet');
    return generateMockSnippet(videoId, outputPath);
  } catch (err) {
    console.error(`   ❌ Download failed for ${videoId}:`, err.message);
    return generateMockSnippet(videoId, outputPath);
  }
}

/**
 * Generate a synthetic mock video snippet for testing.
 * Creates a small file with identifiable content for fingerprint comparison.
 */
function generateMockSnippet(videoId, outputPath) {
  try {
    // Try generating a test video with ffmpeg
    execSync(
      `ffmpeg -f lavfi -i "color=c=red:s=64x64:d=5" -f lavfi -i "sine=frequency=440:duration=5" ` +
      `-shortest "${outputPath}" -y 2>/dev/null`,
      { stdio: 'pipe', timeout: 15000 }
    );

    if (fs.existsSync(outputPath)) {
      console.log(`   🎬 Generated synthetic snippet for: ${videoId}`);
      return outputPath;
    }
  } catch (e) {
    // ffmpeg not available, create a binary placeholder
  }

  // Create a binary placeholder file for fingerprinting
  const mockContent = Buffer.alloc(1024, videoId);
  fs.writeFileSync(outputPath, mockContent);
  console.log(`   📄 Created placeholder snippet for: ${videoId}`);
  return outputPath;
}

/**
 * Clean up downloaded temp files.
 * @param {string[]} filePaths - Array of file paths to delete
 */
function cleanupTemp(filePaths = []) {
  filePaths.forEach(fp => {
    try {
      if (fs.existsSync(fp)) {
        fs.unlinkSync(fp);
      }
    } catch (e) {
      // Ignore cleanup errors
    }
  });
}

/**
 * Clean all files in the temp directory.
 */
function cleanAllTemp() {
  if (!fs.existsSync(config.TEMP_DIR)) return;
  
  const files = fs.readdirSync(config.TEMP_DIR).filter(f => !f.startsWith('.'));
  files.forEach(f => {
    const fp = path.join(config.TEMP_DIR, f);
    try {
      const stat = fs.statSync(fp);
      if (stat.isFile()) fs.unlinkSync(fp);
    } catch (e) {}
  });

  console.log(`🧹 Cleaned ${files.length} temp files`);
}

module.exports = { downloadSnippet, cleanupTemp, cleanAllTemp };
