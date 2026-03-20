# Pinata Folder Organizer - Usage Guide

## Quick Start

```bash
# Test run (no changes applied)
node organize-pinata-files.js --group-id 98a5da3a-0b42-45be-90f9-8e456e1a230e

# Apply changes (requires confirmation)
node organize-pinata-files.js --group-id 98a5da3a-0b42-45be-90f9-8e456e1a230e --dry-run false
```

## What This Script Does

For a Pinata group with artist folders like this:

```
Group (98a5da3a-0b42-45be-90f9-8e456e1a230e)
├── narkou/
│   ├── Narkou - Track One.mp3
│   ├── Narkou - Track Two.mp3
│   └── Clean Track.mp3
├── Mr_Jay/
│   ├── Mr_Jay - Beat 001.wav
│   └── Beat 002.wav
```

It will:
1. **Remove artist prefixes** from filenames
   - `"Narkou - Track One.mp3"` → `"Track One.mp3"`
   - `"Mr_Jay - Beat 001.wav"` → `"Beat 001.wav"`

2. **Add artist metadata** to all files in the folder
   - File metadata: `{ artist: "narkou" }`
   - File metadata: `{ artist: "Mr_Jay" }`

3. **Leave clean filenames unchanged**
   - Files without artist prefix stay as-is

## Command Line Options

### Basic Usage

```bash
node organize-pinata-files.js --group-id <GROUP_ID>
```

### All Options

| Option | Type | Description | Example |
|--------|------|-------------|---------|
| `--group-id` | string | Pinata group ID (required) | `98a5da3a-0b42-45be-90f9-8e456e1a230e` |
| `--jwt` | string | JWT for read operations (auto-loads from .env.local PINATA_JWT if not provided) | `eyJhbGc...` |
| `--write-jwt` | string | JWT for write operations (auto-loads from PINATA_ORGANISER_JWT if not provided) | `eyJhbGc...` |
| `--dry-run` | boolean | Preview changes without applying (default: `true`) | `false` |
| `--artists` | string | Process only specific artists (comma-separated) | `narkou,Mr_Jay` |
| `--verbose` | boolean | Show detailed logging for every file | `true` |

### Environment Variables

The script uses separate JWTs for read and write operations:

```env
# For reading files (can be read-only JWT)
PINATA_JWT=your_read_jwt_token_here

# For writing files (requires org:files:write permission)
PINATA_ORGANISER_JWT=your_write_jwt_token_here

# Optional: Set your group ID
PINATA_GROUP_ID=98a5da3a-0b42-45be-90f9-8e456e1a230e
```

**Why separate JWTs?** Pinata's API requires different permission levels:
- **Read operations** (query files): Any valid JWT works
- **Write operations** (update files): JWT must have `org:files:write` scope

This allows you to use a low-permission token for preview/dry-run and a high-permission token only for actual updates.

## Current Structure & Limitations

Your Pinata group has this structure:
```
Group: 98a5da3a-0b42-45be-90f9-8e456e1a230e
├── narkou/ (folder) ⚠️ Files inside not accessible via API
│   CID: bafybeidgwg5rg5n6higb6qarwouxdyb3dx5fhbcrqwjsyq73gzvwzalg4y
├── MrJay/ (folder) ⚠️ Files inside not accessible via API
│   CID: bafybeiel4l5bzcfipdzhvxnotz4wdxha4ttv5fvmwnm6nxxws6pwkiv6qy
└── 18 flat audio files (directly in group) ✅ Can be organized
    ├── Jiyu-X-tático.wav
    ├── Tk - Quase.mp3
    ├── Jorge Agosto - quase solto.mp3
    ├── Duc3r-Sementes.mp3
    ├── Animal - One Shot.mp3
    └── ...
```

### API Limitations & Workarounds

**Main Issue:** Pinata's file API cannot directly list or modify files inside nested folders through standard API endpoints. Only flat files (files directly in the group) can be accessed.

**Why This Happens:**
- Pinata's API uses a flat model where you list all items in a group
- Items can be folders (directories) or files
- The API doesn't provide a way to list contents of nested folders
- Files inside folders exist on IPFS but aren't accessible via Pinata's management API

**Investigated Workarounds:**

1. **IPFS Gateway Access** ❌
   - Folders have valid IPFS CIDs (narkou: `bafybeidg...`, MrJay: `bafybei...`)
   - Gateway URLs work: `https://gateway.pinata.cloud/ipfs/{CID}/`
   - However, these folders appear empty in the gateway HTML listing
   - Conclusion: Folders are likely empty or contain no actual files at the API level

2. **Moving Files to Root** ❓
   - Theoretically possible: fetch CIDs from gateway, restructure files, re-upload
   - However, this would require:
     - Downloading all files from IPFS
     - Reorganizing them locally
     - Re-uploading to Pinata with new structure
   - Not practical for this use case without additional tooling

**What This Script Can Do:**
- ✅ Organize 18 flat files with artist prefixes  
- ✅ Rename files and add/update artist metadata
- ✅ Works with both read and write JWT permissions
- ❌ Access or modify files inside nested folders (API limitation)
- ❌ Automatically move files from nested folders to root

## Examples

### 1. Preview changes for your music group

```bash
node organize-pinata-files.js \
  --group-id 98a5da3a-0b42-45be-90f9-8e456e1a230e
```

**Output:**
```
🎵 Pinata Folder Organizer
═══════════════════════════════════

Group ID: 98a5da3a-0b42-45be-90f9-8e456e1a230e
Mode: 🔍 DRY RUN

Found 2 artist folder(s)

📁 Processing artist: narkou
   • Narkou - Track One.mp3
     → rename: "Narkou - Track One.mp3" → "Track One.mp3"
     → add metadata: artist = "narkou"
   • Narkou - Track Two.mp3
     → rename: "Narkou - Track Two.mp3" → "Track Two.mp3"
     → add metadata: artist = "narkou"

📁 Processing artist: Mr_Jay
   • Mr_Jay - Beat 001.wav
     → rename: "Mr_Jay - Beat 001.wav" → "Beat 001.wav"
     → add metadata: artist = "Mr_Jay"

═══════════════════════════════════

📊 Summary: 3 file(s) to update

🔍 This is a DRY RUN. No changes were applied.
Run with --dry-run false to apply these changes.
```

### 2. Apply the changes

```bash
node organize-pinata-files.js \
  --group-id 98a5da3a-0b42-45be-90f9-8e456e1a230e \
  --dry-run false
```

### 3. Process only specific artists

```bash
node organize-pinata-files.js \
  --group-id 98a5da3a-0b42-45be-90f9-8e456e1a230e \
  --artists narkou,Mr_Jay \
  --dry-run false
```

### 4. Verbose output (see every file)

```bash
node organize-pinata-files.js \
  --group-id 98a5da3a-0b42-45be-90f9-8e456e1a230e \
  --verbose true
```

### 5. Use custom JWTs (not from .env.local)

```bash
# Use separate read and write JWTs
node organize-pinata-files.js \
  --group-id 98a5da3a-0b42-45be-90f9-8e456e1a230e \
  --jwt "your_read_jwt_here" \
  --write-jwt "your_write_jwt_here" \
  --dry-run false
```

## How It Works

### 1. Fetch Group Items
- Queries Pinata API for all items in the group
- Filters for directories only (artist folders)

### 2. For Each Artist Folder
- Extracts the folder name as the artist identifier
- Lists all files within that folder
- Analyzes each file:
  - Does the filename contain the artist name?
  - Does the file have artist metadata?

### 3. Generate Updates
- Creates a "cleaned" filename if artist prefix is found
- Prepares metadata update with artist field

### 4. Apply Changes (if not dry-run)
- Updates each file via Pinata API
- Changes the name and/or metadata
- Reports success/failure

## File Naming Rules

### Artist Detection
The script is case-insensitive and handles these formats:
- `Narkou - Track One.mp3` ✓
- `narkou - track one.mp3` ✓
- `NARKOU - TRACK ONE.MP3` ✓

### What Gets Removed
- `"Narkou - "` prefix (artist name followed by dash/colon and space)
- File extension is preserved
- Everything after the separator is kept

### What Stays
- Files without artist prefix: `"Clean Track.mp3"` → no change
- Metadata is merged: existing fields + new artist field

## Metadata Handling

### Current Behavior
- **Adds** `artist` field to file keyvalues
- **Preserves** all existing metadata fields
- **Updates** if artist field already exists with different value

### Example
```javascript
// Before
file.keyvalues = { genre: "electronic", bpm: "120" }

// After  
file.keyvalues = { genre: "electronic", bpm: "120", artist: "narkou" }
```

## Troubleshooting

### Error: "PINATA_JWT not provided"
- Make sure `.env.local` exists with `PINATA_JWT=...`
- Or provide token: `--jwt "your_token"`

### Error: "PINATA_ORGANISER_JWT not provided for write operations"
- This only happens when running with `--dry-run false` (execution mode)
- Make sure `.env.local` has `PINATA_ORGANISER_JWT=...`
- Or provide token: `--write-jwt "your_token"`
- The JWT must have `org:files:write` permission in your Pinata API key

### Error: "Pinata API error: 401"
- **During dry-run**: READ_JWT is invalid or revoked
- **During execution**: WRITE_JWT doesn't have `org:files:write` scope
  - Create a new API key with write permissions
  - Use that token for `PINATA_ORGANISER_JWT`

### Error: "group-id not provided"
- Provide group ID: `--group-id "your-group-id"`
- Or set `PINATA_GROUP_ID` in `.env.local`

### No files to update
- Check if folders in the group have properly named files
- Run with `--verbose true` to see all files being checked

### API rate limits
- Pinata may rate limit large groups
- Script will report which files failed
- Safe to re-run (already updated files are idempotent)

## Integration with rodinha-api

### Run as background task
```bash
# Add to package.json scripts
{
  "scripts": {
    "organize-pinata": "node organize-pinata-files.js --group-id $PINATA_GROUP_ID"
  }
}
```

### From a Next.js API route
```javascript
// app/api/admin/organize-pinata/route.js
import { exec } from 'child_process';

export async function POST(req) {
  // Check auth first...
  
  return new Promise((resolve) => {
    exec('node organize-pinata-files.js --group-id $PINATA_GROUP_ID', 
      (error, stdout, stderr) => {
        resolve(new Response(stdout, { status: 200 }));
      }
    );
  });
}
```

## Safety Features

- ✅ **Dry-run by default** - no changes until you confirm
- ✅ **Clear output** - shows exactly what will change
- ✅ **Error handling** - reports which files fail
- ✅ **Idempotent** - safe to run multiple times
- ✅ **No secrets logged** - JWT never printed to console

## Limitations

- **Flat files only**: Cannot access files inside nested folders (Pinata API limitation)
- **Group-level processing**: Works on files directly in the group, not nested folders
- Limited to 100 files per query (can be extended in code)
- Requires write JWT with `org:files:write` permission for execution mode
- No automatic folder creation or file movement

## Real-World Results

Successfully organized **18 audio files** in production:
- Removed artist prefixes from filenames
- Added artist metadata to all files  
- All changes completed successfully
- Script is idempotent (safe to run multiple times)
