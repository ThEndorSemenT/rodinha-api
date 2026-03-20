# Moving Nested Folder Files to Root in Pinata

## Problem Solved

Your Pinata group has 2 nested folders (`narkou/` and `MrJay/`) containing 22 files that cannot be accessed or modified via the Pinata API. This guide shows how to move them to the root of your group.

## Solution Overview

Since Pinata's API doesn't list files inside folders, we:

1. **Extract CIDs** from the IPFS gateway (22 files total)
2. **Download files** from the gateway using their CIDs
3. **Re-upload to root** with artist metadata and cleaned filenames

## Quick Start

### Step 1: Extract All File CIDs

Run this once to list all files in each folder:

```bash
# Extract narkou files
node extract-folder-cids.mjs --folder narkou

# Extract mrjay files  
node extract-folder-cids.mjs --folder mrjay
```

This creates a JSON config with all file CIDs. The `files-to-move.json` is already populated with all 22 files.

### Step 2: Preview Changes

```bash
# Fast preview (no downloads, ~1 second)
node move-nested-files-to-root.mjs
```

Shows exactly what will happen:
- 10 narkou files → move to root
- 12 MrJay files → move to root
- Artist prefixes removed from filenames
- Artist metadata added

### Step 3: Apply Changes

```bash
# Download and upload all files
node move-nested-files-to-root.mjs --dry-run false
```

This will:
- Download each file from IPFS gateway
- Upload to Pinata root group
- Add artist metadata
- Remove artist prefixes from names
- Clean up temp files

**Estimated time:** ~2-5 minutes (depends on file sizes and network)

## File Inventory

### narkou folder (10 files, 58 MB)
- Agressiva.mp3
- Back to tha old school story telling.mp3
- Chuva ácida.mp3
- Legado live entrada jingle.mp3
- Natureza.mp3
- Skitz Tw trap.mp3
- Skitz one.mp3
- Vestida a Rigor.mp3
- Águas mil.mp3
- Águias de fogo trap.mp3

### mrjay folder (12 files, 375 MB)
- 25.wav
- Am Ring.wav
- Casanova.wav
- Creed.wav
- Flower.wav
- Hapiness.wav
- Juízo Final.wav
- Light Years.wav
- Mobb_SC_023.mp3
- Mobb_SC_071.mp3
- STARMANIA.wav
- Summer Love.wav

## Configuration

The `files-to-move.json` contains:

```json
{
  "narkou": [
    {
      "name": "Narkou-Agressiva.mp3",
      "cid": "bafybeidvyx3wqfxitsee6of5xdeo74kssqmxh4r4rqozqlkec2f2nlabwa",
      "artist": "narkou"
    },
    // ... more files
  ],
  "mrjay": [
    // ... 12 files
  ]
}
```

**Key points:**
- `name`: Original filename (with artist prefix)
- `cid`: Content ID from IPFS gateway (used to download)
- `artist`: Artist name (used for metadata and prefix removal)

## Scripts

### extract-folder-cids.mjs
Extracts all file CIDs from a Pinata folder via the IPFS gateway.

```bash
node extract-folder-cids.mjs --folder narkou
node extract-folder-cids.mjs --folder mrjay
```

Output: JSON config ready to paste into `files-to-move.json`

### move-nested-files-to-root.mjs
Downloads files and uploads them to the root group.

```bash
# Preview (fast, no downloads)
node move-nested-files-to-root.mjs

# Execute (downloads and uploads)
node move-nested-files-to-root.mjs --dry-run false

# Verbose output
node move-nested-files-to-root.mjs --dry-run false --verbose true
```

## How It Works

### Technical Details

1. **Extract Phase**
   - Fetches folder HTML from `https://gateway.pinata.cloud/ipfs/{CID}/`
   - Parses links to find direct-access CIDs for each file
   - Creates JSON config with name, CID, and artist

2. **Preview Phase** (DRY RUN)
   - Reads config file
   - Shows what will happen
   - No network requests, instant feedback

3. **Migration Phase** (EXECUTION)
   - For each file:
     - Download from: `https://gateway.pinata.cloud/ipfs/{CID}?filename=...`
     - Create FormData with file + metadata
     - POST to: `https://api.pinata.cloud/v3/files`
     - Result: File in root with cleaned name and artist metadata

### Example Transformation

```
Before:
  └── narkou/ (folder)
      └── Narkou-Agressiva.mp3 (not accessible via API)

After:
  └── Agressiva.mp3 (in root)
      ├── filename: "Agressiva.mp3" (artist prefix removed)
      └── metadata: { artist: "narkou", source: "nested-folder" }
```

## Dependencies

```bash
npm install kubo-rpc-client form-data node-fetch
```

Used by:
- `kubo-rpc-client`: IPFS operations (installed, not actively used)
- `form-data`: Multipart form uploads to Pinata
- `node-fetch`: HTTP requests to gateway and Pinata API

## Environment Variables

Required in `.env.local`:

```env
PINATA_JWT=your_read_jwt_token
PINATA_GROUP_ID=98a5da3a-0b42-45be-90f9-8e456e1a230e
```

Both are already set in your `.env.local`.

## Troubleshooting

### "Download failed: 429"
- Gateway rate limit hit
- Wait a few minutes and retry
- Script is safe to re-run (idempotent)

### "Upload failed: 401"
- JWT token is invalid
- Check PINATA_JWT in `.env.local`
- Verify token has write permissions

### "no CID provided"
- Filename in config has placeholder CID
- Run `extract-folder-cids.mjs` again
- Copy real CIDs to `files-to-move.json`

### Script hangs during execution
- Normal for large files (downloading 375 MB takes time)
- Monitor network activity
- Press Ctrl+C to cancel (safe - uploads are atomic)

## Safety Features

✅ **Dry-run by default** - Preview changes before applying
✅ **Idempotent** - Safe to run multiple times
✅ **Streaming downloads** - Efficient memory usage
✅ **Metadata preserved** - Artist info added, not lost
✅ **Temp files cleaned** - Automatic cleanup after upload

## Next Steps

1. **Preview:** `node move-nested-files-to-root.mjs`
2. **Verify:** Check output matches your expectations
3. **Execute:** `node move-nested-files-to-root.mjs --dry-run false`
4. **Monitor:** Files will appear in Pinata root as they upload
5. **Verify:** Check Pinata dashboard - all 22 files should be in root with metadata

## Integration with API

Your `/app/api/pinata/tracks/route.js` already filters by artist metadata:

```javascript
.map(f => ({
  name: f.name,
  artist: f.keyvalues?.artist || '',  // ← Will now have "narkou" or "Mr. Jay"
  url: `https://gateway.pinata.cloud/ipfs/${f.cid}`
}));
```

After migration, your API will automatically return files from both:
- Existing flat files (18 already organized)
- Newly migrated nested folder files (22)

**Total: 40 files organized with artist metadata!**
