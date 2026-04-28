# PlayShield — Shared Data Contracts

> These schemas define the Firestore collections used across all three modules.  
> Both developers must follow these contracts exactly.

---

## `assets` Collection

Each document represents a registered original video with its computed fingerprints.

| Field | Type | Description |
|-------|------|-------------|
| `assetId` | `string` | UUID v4 — document ID |
| `broadcasterId` | `string` | e.g., `"espn"`, `"star_sports"` |
| `matchId` | `string` | e.g., `"mun-liv-2025"` |
| `originalFileName` | `string` | Original upload filename |
| `localFilePath` | `string` | Local path to saved original |
| `timestamp` | `Timestamp` | `FieldValue.serverTimestamp()` |
| `signature` | `string` | Base64 HMAC-SHA256 of `phash + chromaprint` |
| `fingerprints.phash` | `string` | Hex perceptual hash |
| `fingerprints.chromaprint` | `string` | Base64 audio fingerprint |
| `fingerprints.logoDetected` | `boolean` | `false` by default |
| `fingerprints.logoConfidence` | `number` | `0` if not used |

---

## `alerts` Collection

Each document represents a detected piracy match from the scanner.

| Field | Type | Description |
|-------|------|-------------|
| `alertId` | `string` | UUID v4 — document ID |
| `assetId` | `string` | FK → original asset UUID |
| `candidateVideoUrl` | `string` | Full YouTube URL |
| `candidateTitle` | `string` | Video title |
| `candidateThumbnail` | `string` | Thumbnail image URL |
| `candidateChannel` | `string` | Channel name |
| `matchConfidence` | `number` | 0–1 float |
| `phashDistance` | `number` | Hamming distance (lower = more similar) |
| `audioSimilarity` | `number` | 0–1 float |
| `riskScore` | `number` | 0–100 integer |
| `status` | `string` | `pending_review` \| `takedown_sent` \| `whitelisted` |
| `detectedAt` | `Timestamp` | `FieldValue.serverTimestamp()` |

### Status Transitions

```
pending_review ──► takedown_sent   (user clicks "Send DMCA")
pending_review ──► whitelisted     (user clicks "Whitelist")
```

---

## Risk Score Calculation

```
base = matchConfidence × 100
if (matchConfidence > 0.9) base += 10
if (phashDistance < 5)     base += 10
riskScore = Math.min(base, 100)
```
