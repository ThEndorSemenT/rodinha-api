# Pinata File Organization Script - What Was Created

## Summary

You now have a **practical command-line tool** (not a "skill" in the OpenCode sense) for organizing your audio files in Pinata.

## Status: ✅ FULLY TESTED & WORKING

The script has been successfully tested in production:
- **18 audio files** organized in one run
- All files renamed and metadata added successfully
- Dual-JWT system working correctly (read + write permissions)

## File Structure

```
rodinha-api/
├── organize-pinata-files.js              # The executable script (dual-JWT support)
├── .env.local                            # Contains PINATA_JWT and PINATA_ORGANISER_JWT
├── docs/
│   ├── ORGANIZE_PINATA_README.md         # Detailed usage guide (updated)
│   ├── ORGANIZE_PINATA_SUMMARY.md        # Quick reference & integration
│   └── PINATA_FOLDER_ORGANIZER_GUIDE.md  # Architecture & concepts
└── AGENTS.md                              # (Updated with reference)
```

## What the Script Does

Cleans up your Pinata audio files by:

1. **Removing artist prefixes** from filenames
   - `"Jiyu-X-tático.wav"` → `"X-tático.wav"`
   - `"Jorge Agosto - quase solto.mp3"` → `"quase solto.mp3"`

2. **Adding artist metadata** to all files
   - Updates `keyvalues.artist` field with the artist name

3. **Previewing changes first** (safe dry-run mode)
   - Shows exactly what will change before you apply it

4. **Using separate JWTs for security**
   - Read JWT: `PINATA_JWT` (can be read-only)
   - Write JWT: `PINATA_ORGANISER_JWT` (requires `org:files:write` scope)

## How to Run

```bash
cd /home/nuno/web3/rodinha-api

# Preview changes (DRY RUN - no modifications)
node organize-pinata-files.js --group-id 98a5da3a-0b42-45be-90f9-8e456e1a230e

# Apply changes
node organize-pinata-files.js --group-id 98a5da3a-0b42-45be-90f9-8e456e1a230e --dry-run false
```

## Key Options

| Option | Purpose |
|--------|---------|
| `--group-id` | Required: Pinata group ID |
| `--jwt` | Read JWT (defaults to PINATA_JWT) |
| `--write-jwt` | Write JWT (defaults to PINATA_ORGANISER_JWT) |
| `--dry-run true/false` | Default: true (safe preview) |
| `--artists artist1,artist2` | Process only specific artists |
| `--verbose true` | Show detailed logging |

## JWT Setup

The script uses **two different JWTs** for security and flexibility:

```env
# .env.local

# For reading/previewing (can be read-only)
PINATA_JWT=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# For writing/updating files (must have org:files:write scope)
PINATA_ORGANISER_JWT=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

This separation means:
- ✅ Dry-run mode can use a low-permission JWT
- ✅ Write mode requires a high-permission JWT
- ✅ More secure than using one JWT for everything

## Nested Folder Findings

Your Pinata group has two nested folders that **cannot be accessed via the API**:

```
narkou/      (CID: bafybeidgwg5rg5n6higb6qarwouxdyb3dx5fhbcrqwjsyq73gzvwzalg4y)
MrJay/       (CID: bafybeiel4l5bzcfipdzhvxnotz4wdxha4ttv5fvmwnm6nxxws6pwkiv6qy)
```

**Investigation Results:**
- Tested IPFS gateway access: Folders exist on IPFS but appear empty
- Tested direct API listing: Folders cannot be queried via Pinata's file API
- **Conclusion:** Files inside nested folders are not accessible through Pinata's management API

**Workaround Options:**
1. **Move files to root** - Requires download/reorganize/re-upload workflow (complex)
2. **Create new flat structure** - Manually copy files to root via Pinata web UI
3. **Accept limitation** - Only organize flat files (current approach)

The script currently handles the 18 flat files successfully and warns about the inaccessible folders.

## Is This a "Skill"?

**No**, this is NOT an OpenCode skill. It's:
- ✅ A standalone Node.js script you can run
- ✅ Documentation explaining how to use it
- ❌ NOT registered as a system skill (doesn't need to be)

The word "SKILL" in the documentation names was misleading. I've renamed it to "GUIDE" to be clearer.

## Integration with Your API

Your `/app/api/pinata/tracks/route.js` already filters by artist metadata:
```javascript
.filter(f => f.mime_type && f.mime_type.startsWith('audio'))
.map(f => ({
  name: f.name,
  artist: f.keyvalues?.artist || '',  // ← This will be populated!
  url: `https://gateway.pinata.cloud/ipfs/${f.cid}`
}));
```

Once you run the organizer script, your API will automatically have artist metadata for all files.

## No External Dependencies

The script uses only:
- Built-in Node.js modules (`fs`, `path`, `url`)
- No npm packages required
- Works with Node.js 18+

## Documentation Files

1. **ORGANIZE_PINATA_README.md** - Complete usage guide with examples
2. **ORGANIZE_PINATA_SUMMARY.md** - Integration guide for rodinha-api
3. **PINATA_FOLDER_ORGANIZER_GUIDE.md** - Architecture & API details
