# PlayShield — Simplified Build Plan (Firebase + Local)

> **Goal**: Deliver a working demo of PlayShield for the Google Solution Challenge, using only **Firebase (Firestore, Hosting)** and a **local Node.js server**.   
> **No billing account required** (Firebase free tier covers everything).

---

## 1. Project Overview

PlayShield is a multi‑modal digital asset protection system that demonstrates:
- **Proactive authentication** via HMAC‑based provenance.
- **Multi‑modal fingerprinting** (perceptual hash + audio chromprint).
- **Real‑time alerting** and **human‑in‑the‑loop takedown**.

Everything runs on two laptops, backed by Firestore for real‑time data, and the dashboard is served from Firebase Hosting.

### 1.1 Core Demo Flow (the video you will record)

1. **Person A** starts the local **Ingestion Server** (`node ingestion/server.js`).  
2. **Person A** uploads an original sports clip (e.g., 30‑second goal highlight) via `curl` or Postman to `localhost:3000/ingest`.  
3. The server computes a **perceptual hash (pHash)** from keyframes and an **audio fingerprint (Chromaprint)**, stores the results in Firestore.  
4. **Person B** records a “pirated” version of the clip on their phone (screen recording, cropped, low quality), uploads it to YouTube as an unlisted video.  
5. **Person A** runs the **Scanner Script** (`node scanner/scan.js`), which:
   - Searches YouTube (using the Data API) for the pirated video.
   - Downloads a short snippet.
   - Extracts pHash and Chromaprint.
   - Queries Firestore for original fingerprints, computes similarity.
   - If confident, writes an alert to Firestore.  
6. The **Dashboard** (deployed on Firebase Hosting) shows the alert in real time.  
7. **Person A** clicks “Send DMCA” on the dashboard → alert status updates to `takedown_sent`.

---

## 2. Architecture (Simplified)

```
Person A's Laptop                        Cloud (Firebase)
┌──────────────────┐                  ┌─────────────────────┐
│ Ingestion Server │──── Firestore ──►│ Firestore            │
│ (Express, :3000) │                  │  assets/            │
│                  │                  │  alerts/            │
└──────────────────┘                  └─────────────────────┘

Person A's Laptop                      
┌──────────────────┐                  
│ Scanner Script   │── YouTube API ──► YouTube Data API
│ (Node.js)        │── Firestore ────► Firestore (alerts)
└──────────────────┘                  

Person A / B Browser
┌──────────────────┐
│ Dashboard        │── Firestore SDK ──► Firestore (real-time)
│ (React + Firebase│                    Firebase Hosting
│  Hosting)        │
└──────────────────┘
```

All green boxes are Google technology.

---

## 3. Google Technology Used

| Technology | How we use it |
|------------|---------------|
| **Firestore** | Stores original asset fingerprints (`assets` collection) and detected piracy alerts (`alerts` collection). Real‑time updates to the dashboard. |
| **Firebase Hosting** | Serves the React dashboard (free CDN & SSL). |
| **YouTube Data API v3** | Allows the scanner to search for candidate pirated videos on YouTube. |
| **(Optional) Gemma 4 via** any integration | Could analyze video titles/descriptions to compute a "textual piracy risk" score, but **not required for MVP**. We leave it as an extension idea. |

---

## 4. Local Development Stack

| Tool | Purpose |
|------|---------|
| **Node.js 20 LTS** | Runtime for ingestion server and scanner script. |
| **Express** | Lightweight web framework for the ingestion API. |
| **Firebase Admin SDK** | Used server‑side to read/write Firestore. |
| **Firebase Client SDK** | Used in the React dashboard for real‑time alerts. |
| **FFmpeg** | Extract frames and audio from video files (installed locally). |
| **fpcalc (Chromaprint)** | Generate audio fingerprints (bundled or installed locally). |
| **yt-dlp** or **node-ytdl-core** | Download YouTube video snippets in the scanner. |
| **imghash** or **node-phash** | Perceptual hash generation from frames. |
| **React + Material‑UI** | Dashboard UI. |
| **Postman / curl** | Manual testing of the ingestion endpoint. |

---

## 5. Task Split (Zero Merge Conflicts)

**Team of 2** → Work in parallel, integrate via Firestore data contracts.

- **Task A – Ingestion Server & Fingerprint Generation**  
  Owner: Developer 1  
  Folder: `/ingestion`

- **Task B – Scanner Script & Dashboard**  
  Owner: Developer 2  
  Folders: `/scanner` and `/dashboard`

Only shared files: root `README.md`, `schema.md`. The two folders never overlap → no merge conflicts.

---

## 6. Task A: Ingestion Server (Detailed Spec)

### 6.1 What it must do

1. Start a local Express server on `http://localhost:3000`.
2. Accept `POST /ingest` with a multipart video file and optional `broadcasterId`, `matchId`.
3. Save the original video to a local folder (e.g., `/ingestion/uploads/originals`). (No cloud storage needed; for demo, just keep local.)
4. Generate:
   - **Perceptual hash (pHash)**: Extract keyframes with FFmpeg, hash each with `imghash`, produce an average hex string.
   - **Audio fingerprint (Chromaprint)**: Extract audio track, run `fpcalc`, store base64 fingerprint.
   - **(Optional) Logo detection** using a simple image template match (e.g., `sharp` + pixel‑compare). Not mandatory.
5. Compute a **provenance signature** using HMAC-SHA256 with a secret key (hardcoded for demo, e.g., `"playshield-secret"`). Sign the pHash + chromprint string.
6. Write an `assets` document to Firestore:

```json
{
  "assetId": "uuid",
  "broadcasterId": "string",
  "matchId": "string",
  "localFilePath": "/path/original.mp4",
  "timestamp": "firestore.FieldValue.serverTimestamp()",
  "signature": "base64-hmac",
  "fingerprints": {
    "phash": "hex",
    "chromaprint": "base64",
    "logoDetected": false,
    "logoConfidence": 0
  }
}
```

7. Return a success JSON with `assetId`.

### 6.2 Acceptance Criteria for Demo

- Run `node ingestion/server.js` and upload a video via Postman.
- Firestore `assets` collection shows a new document with valid pHash and Chromaprint.
- The server logs each step clearly (good for video).

---

## 7. Task B: Scanner Script & Dashboard (Detailed Spec)

### 7.1 Scanner Script (`node scanner/scan.js`)

**What it does**:

1. Use the YouTube Data API to search for a query (e.g., `"goal highlights free"`) and retrieve the top 5 results.  
   *For demo reliability, we can hard‑code the expected pirate video ID after uploading.*
2. For each result, download a 15‑second sample using `yt-dlp` (or `node-ytdl-core`) to a local temp folder.
3. Extract fingerprints **exactly like the ingestion** (same pHash/Chromaprint logic; Developer 2 writes their own version in `/scanner/fingerprint.js` to stay independent, but uses the same libraries).
4. Read all documents from Firestore `assets` collection.
5. For each original, compute:
   - **pHash distance**: Hamming distance between the two hex strings. If < threshold (e.g., 10 bits) → pass.
   - **Chromaprint similarity**: Cosine or simple string matching based on fpcalc output. If > 0.75 → pass.
   - **Combined confidence**: Weighted average (e.g., 0.6 * pHash_score + 0.4 * audio_score).
6. If `confidence > 0.7`, create an alert in Firestore `alerts`:

```json
{
  "alertId": "uuid",
  "assetId": "original-asset-uuid",
  "candidateVideoUrl": "https://youtube.com/watch?v=...",
  "candidateThumbnail": "url",
  "matchConfidence": 0.88,
  "phashDistance": 5,
  "audioSimilarity": 0.92,
  "riskScore": 95,
  "status": "pending_review",
  "detectedAt": "firestore.FieldValue.serverTimestamp()"
}
```

**Risk Score calculation**:
- Base: `matchConfidence * 100`.
- If confidence > 0.9 → add 10.
- If pHash distance < 5 → add 10.
- Cap at 100.

### 7.2 Takedown Dashboard

**Folder**: `/dashboard`  
**Tech**: React + Firebase + Material‑UI

**Functionality**:
- Listen to Firestore `alerts` collection in real time (`onSnapshot`).
- Display a table of alerts sorted by risk score descending:
  - Thumbnail, URL, Match Confidence, Risk Score, Status, Actions.
- Each row has two buttons: **“Send DMCA”** and **“Whitelist”**.
- Click **“Send DMCA”**:
  - Update alert status to `takedown_sent`.
  - (Mock) Display a success toast; no actual email sending.
- Click **“Whitelist”**:
  - Update status to `whitelisted`, remove from active list.

**Deployment**:
- `firebase init hosting` inside `/dashboard` folder.
- Build: `npm run build`.
- Deploy: `firebase deploy`.
- Accessible via public URL like `https://playshield-demo.web.app`.

### 7.3 Acceptance Criteria for Scanner + Dashboard

- Running `node scanner/scan.js` fetches YouTube results, downloads a snippet, and if a match is found, writes an alert to Firestore.
- Open the dashboard in browser; alert appears immediately.
- Clicking “Send DMCA” updates the alert’s status.

---

## 8. Shared Data Contracts (Schema)

Create a `schema.md` in the repo root:

### `assets` document

| Field | Type | Description |
|-------|------|-------------|
| `assetId` | string | UUID v4 |
| `broadcasterId` | string | e.g., "espn" |
| `matchId` | string | e.g., "mun-liv-2025" |
| `localFilePath` | string | local path to original video |
| `timestamp` | timestamp | serverTimestamp |
| `signature` | string | base64 HMAC |
| `fingerprints.phash` | string | hex perceptual hash |
| `fingerprints.chromaprint` | string | base64 audio fingerprint |
| `fingerprints.logoDetected` | boolean | `false` by default |
| `fingerprints.logoConfidence` | number | `0` if not used |

### `alerts` document

| Field | Type | Description |
|-------|------|-------------|
| `alertId` | string | UUID v4 |
| `assetId` | string | FK to original asset |
| `candidateVideoUrl` | string | YouTube URL |
| `candidateThumbnail` | string | Thumbnail URL |
| `matchConfidence` | number | 0-1 |
| `phashDistance` | number | Hamming distance |
| `audioSimilarity` | number | 0-1 |
| `riskScore` | number | 0-100 |
| `status` | string | `pending_review`, `whitelisted`, `takedown_sent` |
| `detectedAt` | timestamp | serverTimestamp |

---

## 9. Optional Integration: Gemma for Metadata Analysis

**Legitimate use case**: Use Gemma (a lightweight LLM) to process the text metadata of candidate YouTube videos (title, description, first few comments) to detect piracy‑indicating language like “free stream”, “full match replay”, “no copyright”. This could be an additional modality in the late‑fusion system.

**How to integrate**:
- In the scanner, after fetching a video snippet, pass the video title + description to a Gemma endpoint (huggingface, ollama, or a local transform). 
- Ask it to rate “How likely is this video to host unauthorized sports content?” on a 0‑1 scale.
- Add that score to the confidence calculation.

**Why it’s optional**: The core demo works without it. It adds complexity and requires a model runtime. Mention it as a “future upgrade” or a stretch goal if time permits.

---

## 10. GitHub Collaboration Guide (For Beginners)

### 10.1 Repository Structure

```
playshield/
├── ingestion/            # Task A
│   ├── server.js
│   ├── fingerprint.js
│   ├── uploads/          # gitignored
│   └── package.json
├── scanner/              # Task B – scanner script
│   ├── scan.js
│   ├── fingerprint.js
│   └── package.json
├── dashboard/            # Task B – React app
│   ├── public/
│   ├── src/
│   ├── package.json
│   └── firebase.json
├── schema.md
└── README.md
```

### 10.2 Workflow

1. **One person creates the repo** on GitHub, adds the other as collaborator.
2. **Both clone**: `git clone <url>`.
3. **Create branches**:
   - Developer 1: `git checkout -b ingestion`
   - Developer 2: `git checkout -b scanner-dashboard`
4. **Work only in your own folders**. Commit often.
5. **Push daily**: `git push origin <branch>`.
6. **When a feature works**, open a Pull Request against `main`. Review and merge.

### 10.3 Avoiding Merge Conflicts

- Never edit files outside your assigned folder.
- Root `schema.md` is updated via separate PR with mutual agreement.
- Use `git pull origin main` before merging to catch any common changes.

### 10.4 Useful Git Commands

```bash
# Start fresh
git checkout main
git pull origin main
git checkout -b my-feature

# Save progress
git add -A
git commit -m "Describe change"

# Push
git push origin my-feature

# Merge latest main into your branch
git merge main
```

---

## 11. Demo Video Plan (3 minutes)

**Script outline**:

1. **Intro (15s)**: “PlayShield — a Firebase‑powered system to protect sports media.”
2. **Setup (10s)**: Show the local servers running, Firestore in browser empty.
3. **Ingestion (40s)**: Use Postman to upload a goal clip. Show the console logs extracting fingerprints, then refresh Firestore to see the `assets` document.
4. **Pirate simulation (20s)**: Cut to phone screen, Person B plays the original and records it, uploads to YouTube (show progress). Mention it’s unlisted.
5. **Scanning (45s)**: Run `node scanner/scan.js`. Show logs: “Searching YouTube…”, “Downloading snippet…”, “Match confidence 0.87”. Refresh Firestore → new `alerts` doc appears.
6. **Dashboard (30s)**: Open the deployed dashboard URL. Alert pops up in real time. Click “Send DMCA”. Show status change in Firestore.
7. **Outro (15s)**: “Zero cloud servers, 100% Google technology — PlayShield protects sports media, affordably.”

---

## 12. How to Prompt Claude Code

With this plan, you can ask Claude inside the repo:

> *“In the `/ingestion` folder, create a Node.js Express server that accepts video uploads, saves them locally, extracts pHash and Chromaprint, and writes a Firestore document. Use HMAC for provenance. Add a .gitignore for uploads.”*

> *“In the `/scanner` folder, create a script that uses the YouTube Data API to search and download a video snippet, then replicates the fingerprint logic and compares with Firestore assets, writing alerts.”*

> *“In `/dashboard`, create a React app that connects to Firestore, displays alerts in real time, and allows ‘Send DMCA’ / ‘Whitelist’ actions. Use Material-UI.”*

---

## 13. Next Steps

1. **Agree on the schema** in `schema.md` before coding.
2. **Set up Firebase project** (Firestore in native mode, Hosting enabled).
3. **Install local dependencies**: Node.js, FFmpeg, fpcalc, yt-dlp.
4. **Clone the repo**, create branches, and start vibe‑coding.

Questions? Open an issue on the GitHub repo.**
```

This revised plan reflects the actual Firebase‑only + local approach, includes all details for a student team, and leaves the door open for Gemma if they choose to add text‑based piracy detection.