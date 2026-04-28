# 🛡️ PlayShield
> **Digital Asset Protection & Autonomous Takedown Engine**
> *Built for the Google Solution Challenge*

PlayShield is an advanced, autonomous infrastructure designed to combat digital media piracy using complex algorithmic telemetry, perceptual hashing, and Google Cloud's serverless ecosystem (Firebase + Firestore).

![PlayShield Dashboard Preview](https://via.placeholder.com/1200x600/060913/4285F4?text=PlayShield+Cyber+Command+Dashboard)

## ⚡ Overview

Current copyright enforcement heavily relies on reactive, manual takedown notices. PlayShield shifts this paradigm into a **proactive, algorithmic workflow**:
1. **Asset Proof of Provenance**: Broadcasters ingest their original media. PlayShield splits this media into frame-by-frame Perceptual Image Hashes (pHash) and Audio Chromaprints, locking the immutable array into Firestore via an HMAC signature.
2. **Autonomous Sub-Network Sweeps**: A background Node.js engine continuously polls video distribution chains (e.g., YouTube via Data API).
3. **Algorithmic Threat Modeling**: By calculating Hamming Distances and cross-referencing Audio similarity vectors against the Firestore database, candidates are given a deterministic Risk Score.
4. **Enforcement Command Dashboard**: Operations teams visualize active telemetry streams from Firestore WebSockets in real-time and issue one-click network tactical responses (DMCA sweeps).

---

## 🛠️ Architecture & Tech Stack

- **Core Infrastructure Layer**: Google Firebase Admin SDK, Cloud Firestore (Native Mode)
- **Ingestion Relay (Backend)**: Node.js, Express, Multer, FFmpeg, Cryptographic HMAC signing
- **Scanning Node**: Node.js, YouTube Data API v3, `yt-dlp`, ImageHash, Chromaprint/`fpcalc`
- **Command Dashboard**: Next.js App Router, Framer Motion, Vanilla CSS (Glassmorphism design language)

---

## 🚀 Setup & Execution Guide

### Prerequisites
- Node.js (v20+)
- System Dependencies: `ffmpeg`, `yt-dlp`, `chromaprint` (fpcalc)
  *Mac Users: `brew install ffmpeg yt-dlp chromaprint`*

### 1. Environment Configuration
Ensure you have a `.env` file at the root of the project with your Firebase Admin and YouTube API keys:
```env
# Root /.env
YOUTUBE_API_KEY=your_key_here
FIREBASE_PROJECT_ID=playshield-...
HMAC_SECRET=your_secure_secret
PORT=3005
```

Ensure you have a `serviceAccountKey.json` inside the root to authorize the Admin SDK payloads.

### 2. Boot the Ingestion Node
The designated gateway for legitimate broadcasters.
```bash
cd ingestion
npm install
node server.js
# Runs reliably on http://localhost:3005
```

### 3. Start the Next.js Enforcement Dashboard
The client-side command center.
```bash
cd dashboard
npm install
npm run dev
# Accessible via http://localhost:3000 (or 3001)
```

### 4. Running the End-to-End Simulation
1. Open the **Dashboard** in your browser.
2. Click **[INGEST SOURCE MEDIA]** to select a local MP4 file. The asset will be mathematically hashed and registered.
3. Open a separate terminal for the scanner:
   ```bash
   cd scanner
   npm install
   node scan.js --demo
   ```
4. Watch the Dashboard **Target Queue**. You will witness real-time Firestore injections appearing autonomously as the scanner calculates threat matrices.

---

## 💻 Included Scripts

- `scanner/scan.js` — The main YouTube algorithmic sweeper. Accepts parameters like `--demo` (for synthetic generation without API rate limits) or `--video=ID` to target specific breaches.
- `scanner/seed.js` — Instantly pumps high-threat quality mock data directly into your active dashboard via Firestore bindings (perfect for pitching or UI testing).

---

### Google Solution Challenge Note
*This software was exclusively engineered with scalability and affordability in mind. By bypassing heavy VM architecture and relying entirely on the native document capabilities of Firestore and serverless integrations, PlayShield can enforce digital rights globally, infinitely, utilizing native Google Tech.*
