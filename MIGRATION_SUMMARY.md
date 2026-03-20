# Migration Summary: Nested Folder Files

## ✅ Completed Tasks

All 22 files from the nested folders (narkou and MrJay) have been successfully prepared for manual upload and automatic metadata organization.

### What Was Done

1. **Downloaded 22 files** from nested IPFS folders using the Pinata gateway
   - 10 files from narkou folder
   - 12 files from MrJay folder
   - Used retry logic with exponential backoff to handle rate limiting

2. **Converted 10 WAV files to MP3 format**
   - Used ffmpeg with 192kbps bitrate (good quality/size balance)
   - Reduced file sizes from raw WAV to compressed MP3

3. **Organized files with artist prefixes**
   - **Kept artist prefixes** (e.g., "Narkou-Track.mp3", "MrJay-Track.mp3")
   - This allows `organize-pinata-files.js` to automatically detect and process them
   - Organized into folders by artist in `tmp/ready-for-upload/`

## 📁 File Structure

All files are ready in: `tmp/ready-for-upload/`

```
tmp/ready-for-upload/
├── MrJay/           (12 files, all .mp3)
│   ├── MrJay-25.mp3
│   ├── MrJay-Am Ring.mp3
│   ├── MrJay-Casanova.mp3
│   ├── MrJay-Creed.mp3
│   ├── MrJay-Flower.mp3
│   ├── MrJay-Hapiness.mp3
│   ├── MrJay-Juízo Final.mp3
│   ├── MrJay-Light Years.mp3
│   ├── MrJay-Mobb_SC_023.mp3
│   ├── MrJay-Mobb_SC_071.mp3
│   ├── MrJay-STARMANIA.mp3
│   └── MrJay-Summer Love.mp3
│
└── narkou/          (10 files, all .mp3)
    ├── Narkou-Agressiva.mp3
    ├── Narkou-Águas mil.mp3
    ├── Narkou-Águias de fogo trap.mp3
    ├── Narkou-Back to tha old school story telling.mp3
    ├── Narkou-Chuva ácida.mp3
    ├── Narkou-Legado  live entrada jingle.mp3
    ├── Narkou-Natureza.mp3
    ├── Narkou-Skitz one.mp3
    ├── Narkou-Skitz Tw trap.mp3
    └── Narkou-Vestida a Rigor.mp3
```

## 📊 Statistics

| Metric | Value |
|--------|-------|
| Total Files | 22 |
| Original Format | 10 WAV + 12 MP3 |
| Final Format | 22 MP3 |
| WAV → MP3 Conversions | 10 |
| Total Size (ready) | ~98 MB |
| Success Rate | 100% |

## 🚀 Recommended Workflow

### Step 1: Upload Files to Pinata
Choose one method:

**Option A: Upload via Pinata Web UI (Easiest)**
- Go to [pinata.cloud](https://pinata.cloud)
- Select your group
- Drag & drop the `tmp/ready-for-upload/` folders
- Done!

**Option B: Upload via Pinata API** (individual requests)
- Use authenticated API endpoint with group_id
- No payload size issues with individual file uploads

### Step 2: Automatic Metadata Organization
Once files are uploaded to Pinata root, run the organize script:

```bash
# Preview changes (dry-run)
node organize-pinata-files.js --group-id 98a5da3a-0b42-45be-90f9-8e456e1a230e

# Apply changes (removes artist prefixes and adds metadata)
node organize-pinata-files.js --group-id 98a5da3a-0b42-45be-90f9-8e456e1a230e --dry-run false
```

This will:
- Remove artist prefixes from filenames (e.g., "Narkou-Track.mp3" → "Track.mp3")
- Add metadata: `artist: narkou` or `artist: Mr. Jay`
- Keep all files in the root (not in subfolders)

## 📝 Scripts Used

Three scripts were created/used during this process:

1. **`download-nested-files.mjs`** - Downloads files from nested IPFS folders
   - Handles rate limiting with exponential backoff
   - Organizes files by artist folder

2. **`convert-and-organize-files.mjs`** - Converts WAV to MP3 and preserves artist prefixes
   - Uses ffmpeg for WAV → MP3 conversion (192kbps)
   - **Keeps artist prefixes** for chaining with organize-pinata-files.js

3. **`organize-pinata-files.js`** (existing) - Automatic metadata organization
   - Removes artist prefixes from filenames
   - Adds artist metadata via keyvalues
   - Organizes files in Pinata

## ✨ Expected Final Result

After uploading and running the organize script:
- **Total Files**: 40 (18 already organized + 22 newly uploaded)
- **Location**: All in Pinata group root (no subfolders)
- **Naming**: Clean names without artist prefixes
- **Metadata**: `artist` keyvalue for each file

Example:
- `Track.mp3` with metadata `{artist: "narkou"}`
- `Light Years.mp3` with metadata `{artist: "Mr. Jay"}`

## 🔄 Why This Workflow?

1. **Download Phase**: Bypasses API limitations (can't list nested folder contents)
2. **Convert Phase**: Reduces file sizes (WAV → MP3) for better performance
3. **Prefix Preservation**: Enables automatic metadata organization by `organize-pinata-files.js`
4. **Manual Upload**: Avoids 413 payload errors from automated multipart uploads
5. **Automatic Metadata**: Lets organize-pinata-files.js handle the final cleanup

This approach combines automation where it works and manual steps where needed!
