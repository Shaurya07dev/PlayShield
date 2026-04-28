#!/usr/bin/env node

/**
 * PlayShield Scanner — Main Entry Point
 * 
 * Usage:
 *   node scan.js                           # Search with default query
 *   node scan.js "goal highlights free"    # Search with custom query
 *   node scan.js --video=VIDEO_ID          # Scan a specific YouTube video
 *   node scan.js --demo                    # Run with mock data for demonstration
 */

const config = require('./config');
const { db } = require('./firebase-admin');
const { searchYouTube, getVideoDetails } = require('./youtube');
const { downloadSnippet } = require('./downloader');
const { extractFingerprints } = require('./fingerprint');
const { matchAgainstAssets } = require('./matcher');
const { createAlert, alertExists } = require('./alerter');
const { cleanAllTemp } = require('./downloader');

// ─── CLI Argument Parsing ──────────────────────────────────────────────────────

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    query: 'sports highlights free stream',
    videoId: null,
    demo: false,
    cleanup: true,
  };

  for (const arg of args) {
    if (arg === '--demo') {
      options.demo = true;
    } else if (arg === '--no-cleanup') {
      options.cleanup = false;
    } else if (arg.startsWith('--video=')) {
      options.videoId = arg.split('=')[1];
    } else {
      options.query = arg;
    }
  }

  return options;
}

// ─── Main Scanner Logic ────────────────────────────────────────────────────────

async function main() {
  const options = parseArgs();

  console.log('\n' + '═'.repeat(60));
  console.log('🛡️  PLAYSHIELD SCANNER');
  console.log('═'.repeat(60));
  console.log(`   Project:   ${config.FIREBASE_PROJECT_ID}`);
  console.log(`   Mode:      ${options.demo ? 'DEMO' : options.videoId ? 'Single Video' : 'YouTube Search'}`);
  console.log(`   Query:     ${options.videoId || options.query}`);
  console.log('═'.repeat(60));

  // Step 1: Fetch registered original assets from Firestore
  console.log('\n📁 Step 1: Loading registered assets from Firestore...');
  const assetsSnapshot = await db.collection('assets').get();
  const assets = assetsSnapshot.docs.map(doc => doc.data());
  console.log(`   Found ${assets.length} registered original asset(s)`);

  if (assets.length === 0) {
    console.warn('\n⚠️  No assets registered in Firestore.');
    console.warn('   Run the Ingestion Server first and upload an original video.');
    console.warn('   Then run the scanner again.\n');
    // Continue anyway for demo purposes
  }

  // Step 2: Find candidate videos on YouTube
  console.log('\n🔍 Step 2: Searching for candidate pirated videos...');
  let candidates;

  if (options.videoId) {
    // Scan a specific video by ID
    const details = await getVideoDetails(options.videoId);
    candidates = details ? [details] : [];
  } else {
    // Search YouTube
    candidates = await searchYouTube(options.query);
  }

  if (candidates.length === 0) {
    console.log('   No candidate videos found. Exiting.');
    return;
  }

  // Step 3: Process each candidate
  console.log(`\n🔬 Step 3: Analyzing ${candidates.length} candidate(s)...`);
  const downloadedFiles = [];
  let alertCount = 0;
  let skippedCount = 0;

  for (let i = 0; i < candidates.length; i++) {
    const candidate = candidates[i];
    console.log(`\n${'─'.repeat(60)}`);
    console.log(`📹 Candidate ${i + 1}/${candidates.length}: ${candidate.title}`);
    console.log(`   URL: ${candidate.url}`);
    console.log(`   Channel: ${candidate.channelTitle}`);

    // Check if alert already exists for this URL
    const exists = await alertExists(candidate.url);
    if (exists) {
      console.log('   ⏭️  Alert already exists for this video. Skipping.');
      skippedCount++;
      continue;
    }

    // Step 3a: Download snippet
    console.log('\n   📥 Downloading video snippet...');
    const snippetPath = await downloadSnippet(candidate.videoId);

    if (!snippetPath) {
      console.log('   ❌ Download failed. Skipping.');
      continue;
    }
    downloadedFiles.push(snippetPath);

    // Step 3b: Extract fingerprints
    console.log('\n   🔐 Extracting fingerprints...');
    const candidateFP = await extractFingerprints(snippetPath);
    console.log(`      pHash:      ${candidateFP.phash}`);
    console.log(`      Chromaprint: ${candidateFP.chromaprint.substring(0, 30)}...`);

    // Step 3c: Match against registered assets
    console.log('\n   📐 Matching against registered assets...');
    const matchResult = matchAgainstAssets(candidateFP, assets);

    if (matchResult) {
      // Step 3d: Create alert in Firestore
      console.log('\n   🚨 MATCH DETECTED — Creating alert...');
      await createAlert(matchResult, candidate);
      alertCount++;
    } else {
      console.log('\n   ✅ No significant match found for this video.');
    }
  }

  // Step 4: Summary
  console.log('\n' + '═'.repeat(60));
  console.log('📊 SCAN COMPLETE — Summary');
  console.log('═'.repeat(60));
  console.log(`   Videos analyzed:    ${candidates.length}`);
  console.log(`   Alerts created:     ${alertCount}`);
  console.log(`   Duplicates skipped: ${skippedCount}`);
  console.log(`   Assets in DB:       ${assets.length}`);
  console.log('═'.repeat(60));

  // Step 5: Cleanup
  if (options.cleanup) {
    console.log('\n🧹 Cleaning up temp files...');
    cleanAllTemp();
  }

  console.log('\n🛡️  PlayShield Scanner finished.\n');
}

// ─── Execute ───────────────────────────────────────────────────────────────────

main().catch(err => {
  console.error('\n❌ Scanner failed with error:', err);
  process.exit(1);
});
