const express = require('express');
const multer = require('multer');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

const config = require('./config');
const { db, admin } = require('./firebase-admin');
const { extractFingerprints } = require('./fingerprint');

// ─── Setup ─────────────────────────────────────────────────────────────────────

const app = express();
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

// Ensure uploads directory exists
if (!fs.existsSync(config.UPLOADS_DIR)) {
  fs.mkdirSync(config.UPLOADS_DIR, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, config.UPLOADS_DIR),
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}_${file.originalname}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB max
  fileFilter: (req, file, cb) => {
    const allowedTypes = /mp4|avi|mkv|mov|webm|flv|wmv/;
    const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
    if (allowedTypes.test(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported video format: .${ext}`));
    }
  },
});

// ─── HMAC Provenance ────────────────────────────────────────────────────────────

function computeSignature(phash, chromaprint) {
  const data = `${phash}:${chromaprint}`;
  const hmac = crypto.createHmac('sha256', config.HMAC_SECRET);
  hmac.update(data);
  return hmac.digest('base64');
}

// ─── Routes ────────────────────────────────────────────────────────────────────

// Health check
app.get('/', (req, res) => {
  res.json({
    service: 'PlayShield Ingestion Server',
    version: '1.0.0',
    status: 'operational',
    endpoints: {
      ingest: 'POST /ingest',
      assets: 'GET /assets',
      health: 'GET /health',
    },
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Main ingestion endpoint
app.post('/ingest', upload.single('video'), async (req, res) => {
  const startTime = Date.now();

  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No video file provided. Use form field "video".' });
    }

    const { broadcasterId = 'unknown', matchId = 'unknown' } = req.body;
    const assetId = uuidv4();
    const videoPath = req.file.path;

    console.log('\n' + '═'.repeat(60));
    console.log(`🛡️  PLAYSHIELD INGESTION — New Upload`);
    console.log('═'.repeat(60));
    console.log(`   Asset ID:     ${assetId}`);
    console.log(`   File:         ${req.file.originalname}`);
    console.log(`   Size:         ${(req.file.size / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   Broadcaster:  ${broadcasterId}`);
    console.log(`   Match:        ${matchId}`);

    // Step 1: Extract fingerprints
    console.log('\n📂 Step 1: Extracting fingerprints...');
    const fingerprints = await extractFingerprints(videoPath);

    // Step 2: Compute provenance signature
    console.log('🔏 Step 2: Computing HMAC provenance signature...');
    const signature = computeSignature(fingerprints.phash, fingerprints.chromaprint);
    console.log(`   Signature:    ${signature.substring(0, 30)}...`);

    // Step 3: Write to Firestore
    console.log('☁️  Step 3: Writing to Firestore...');
    const assetDoc = {
      assetId,
      broadcasterId,
      matchId,
      originalFileName: req.file.originalname,
      localFilePath: videoPath,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      signature,
      fingerprints,
    };

    await db.collection('assets').doc(assetId).set(assetDoc);

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log('\n' + '═'.repeat(60));
    console.log(`✅ INGESTION COMPLETE — ${elapsed}s`);
    console.log(`   Asset ID:  ${assetId}`);
    console.log(`   pHash:     ${fingerprints.phash}`);
    console.log(`   Firestore: assets/${assetId}`);
    console.log('═'.repeat(60) + '\n');

    res.status(201).json({
      success: true,
      assetId,
      broadcasterId,
      matchId,
      fingerprints: {
        phash: fingerprints.phash,
        chromaprint: fingerprints.chromaprint.substring(0, 40) + '...',
      },
      signature: signature.substring(0, 30) + '...',
      processingTime: `${elapsed}s`,
    });
  } catch (err) {
    console.error('❌ Ingestion failed:', err);
    res.status(500).json({ error: 'Ingestion failed', details: err.message });
  }
});

// List all registered assets
app.get('/assets', async (req, res) => {
  try {
    const snapshot = await db.collection('assets').orderBy('timestamp', 'desc').get();
    const assets = snapshot.docs.map(doc => ({
      ...doc.data(),
      timestamp: doc.data().timestamp?.toDate?.()?.toISOString() || null,
    }));
    res.json({ count: assets.length, assets });
  } catch (err) {
    console.error('❌ Failed to fetch assets:', err);
    res.status(500).json({ error: 'Failed to fetch assets', details: err.message });
  }
});

// Get single asset
app.get('/assets/:id', async (req, res) => {
  try {
    const doc = await db.collection('assets').doc(req.params.id).get();
    if (!doc.exists) {
      return res.status(404).json({ error: 'Asset not found' });
    }
    res.json(doc.data());
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch asset', details: err.message });
  }
});

// Error handler
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ error: err.message });
  }
  res.status(500).json({ error: err.message });
});

// ─── Start Server ──────────────────────────────────────────────────────────────

app.listen(config.PORT, () => {
  console.log('\n' + '═'.repeat(60));
  console.log('🛡️  PLAYSHIELD INGESTION SERVER');
  console.log('═'.repeat(60));
  console.log(`   URL:       http://localhost:${config.PORT}`);
  console.log(`   Upload:    POST http://localhost:${config.PORT}/ingest`);
  console.log(`   Assets:    GET  http://localhost:${config.PORT}/assets`);
  console.log(`   Project:   ${config.FIREBASE_PROJECT_ID}`);
  console.log('═'.repeat(60) + '\n');
});
