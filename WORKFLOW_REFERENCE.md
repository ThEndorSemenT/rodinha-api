# Complete Workflow: Organize and Upload 22 Files

## Quick Start Guide

### ✅ Already Completed
- ✅ Downloaded all 22 files from nested folders
- ✅ Converted 10 WAV files to MP3
- ✅ Files organized with artist prefixes in `tmp/ready-for-upload/`

### 📋 Remaining Steps

#### Step 1: Upload Files to Pinata

**Via Pinata Web UI (Recommended - Easiest)**
```
1. Go to pinata.cloud
2. Select your group (ID: 98a5da3a-0b42-45be-90f9-8e456e1a230e)
3. Click Upload → Folder
4. Select and upload: tmp/ready-for-upload/
5. Wait for upload to complete
```

**Via Pinata API (Alternative)**
```bash
# Requires individual file uploads to avoid payload errors
# Use Pinata API with group_id parameter for each file
```

#### Step 2: Run Automatic Metadata Organization

Once all 22 files are uploaded to Pinata root:

```bash
# Preview what will change (DRY RUN)
node organize-pinata-files.js --group-id 98a5da3a-0b42-45be-90f9-8e456e1a230e

# Apply changes (EXECUTE)
node organize-pinata-files.js --group-id 98a5da3a-0b42-45be-90f9-8e456e1a230e --dry-run false
```

**What this does:**
- Removes artist prefixes: "Narkou-Track.mp3" → "Track.mp3"
- Adds metadata: `{artist: "narkou"}` or `{artist: "Mr. Jay"}`
- Keeps files in root (no subfolders)

## File Format Reference

**Input files** (in `tmp/ready-for-upload/`):
```
MrJay/
  MrJay-25.mp3                      ← Artist prefix + extension changed (WAV→MP3)
  MrJay-Am Ring.mp3
  MrJay-Mobb_SC_023.mp3             ← Original MP3, just copied

narkou/
  Narkou-Agressiva.mp3              ← Original MP3, just copied
  Narkou-Chuva ácida.mp3
```

**After organize-pinata-files.js** (in Pinata):
```
25.mp3                              ← Artist prefix removed
  └─ metadata: {artist: "Mr. Jay"}

Agressiva.mp3
  └─ metadata: {artist: "narkou"}
```

## Expected Results

### File Count
- Before: 18 organized files
- After upload: 18 + 22 = 40 total files
- All in root (no nested folders)

### File Format
- All files: MP3 (no more WAV)
- File sizes: ~98 MB total

### Metadata
Each file will have:
- `artist`: "narkou" or "Mr. Jay"
- `source`: "nested-folder" (optional, from original organize script)

## Common Commands

```bash
# View files ready for upload
ls -la tmp/ready-for-upload/

# Count files
find tmp/ready-for-upload -type f | wc -l

# Check file sizes
du -sh tmp/ready-for-upload/

# Run organize script (dry-run first!)
node organize-pinata-files.js --group-id 98a5da3a-0b42-45be-90f9-8e456e1a230e

# Run organize script (execute)
node organize-pinata-files.js --group-id 98a5da3a-0b42-45be-90f9-8e456e1a230e --dry-run false
```

## Troubleshooting

**Q: Files already uploaded but organize script didn't work?**
A: Make sure files are in Pinata group root, then run organize script

**Q: Want to undo changes after organizing?**
A: Re-add the artist prefixes manually or re-upload from `tmp/ready-for-upload/`

**Q: Files missing after organize?**
A: Check Pinata Web UI - they should all be in root with clean names

## Scripts Reference

| Script | Purpose | Status |
|--------|---------|--------|
| `download-nested-files.mjs` | Download from nested folders | ✅ Done |
| `convert-and-organize-files.mjs` | Convert WAV→MP3, keep prefixes | ✅ Done |
| `organize-pinata-files.js` | Remove prefixes, add metadata | ⏭️ Next |

## Next Steps

1. **Upload** `tmp/ready-for-upload/` to Pinata
2. **Run** `node organize-pinata-files.js --group-id 98a5da3a-0b42-45be-90f9-8e456e1a230e --dry-run false`
3. **Verify** all 40 files appear in Pinata Web UI

Done! 🎉
