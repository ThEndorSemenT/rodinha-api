# Pinata Folder Organizer - Implementation Summary

## What Was Created

You now have a complete skill and implementation for organizing audio files in Pinata by artist. Here's what's included:

### Files Created

1. **PINATA_FOLDER_ORGANIZER_SKILL.md** - Skill documentation describing the purpose, concepts, and workflow
2. **organize-pinata-files.js** - The main Node.js script that organizes files
3. **ORGANIZE_PINATA_README.md** - Comprehensive usage guide with examples

## Key Features

✅ **Automatic artist detection** from filenames  
✅ **Filename cleanup** - removes artist prefixes  
✅ **Metadata management** - adds/updates artist field in keyvalues  
✅ **Dry-run mode** - preview changes before applying  
✅ **Flexible filtering** - process specific artists only  
✅ **Error handling** - safe rollback on failures  
✅ **No dependencies** - uses only Node.js built-ins  

## How to Use

### Quick Start

```bash
# Preview changes (no modifications)
node organize-pinata-files.js --group-id 98a5da3a-0b42-45be-90f9-8e456e1a230e

# Apply changes
node organize-pinata-files.js --group-id 98a5da3a-0b42-45be-90f9-8e456e1a230e --dry-run false
```

### All Options

```bash
node organize-pinata-files.js \
  --group-id <GROUP_ID>              # Required: Pinata group ID
  --jwt <TOKEN>                       # Optional: JWT (reads from .env.local by default)
  --dry-run true                      # Optional: Preview mode (default: true)
  --artists artist1,artist2           # Optional: Process only specific artists
  --verbose true                      # Optional: Show detailed logging
```

## What It Does

For files like these in your group:
- `"Jiyu-X-tático.wav"` → becomes → `"X-tático.wav"` (removes artist prefix)
- `"Jorge Agosto - quase solto.mp3"` → becomes → `"quase solto.mp3"`
- Adds metadata: `{ artist: "Jiyu" }` to each file

## Your Group's Current State

Your group (98a5da3a-0b42-45be-90f9-8e456e1a230e) contains:

**Folders:**
- `narkou` - 10 files
- `Mr_Jay` - 12 files

**Flat audio files (18 total):**
- Jiyu (5 files) - `Jiyu-*` naming
- Tk (1 file) - `Tk - Quase`
- Jorge Agosto (2 files) - `Jorge Agosto - *`
- gonsalocomc (4 files) - `gonsalocomc - *`
- Duc3r (4 files) - mixed naming
- Animal (2 files) - `Animal - *`

## Expected Changes

Running the script would make approximately **36 changes**:

```
Jiyu files (5):
  - Rename to remove "Jiyu-" prefix
  - Add artist metadata

Jorge Agosto files (2):
  - Rename to remove "Jorge Agosto - " prefix
  - Add artist metadata

[And so on for other artists...]
```

## Integration with rodinha-api

The script can be integrated into your API in several ways:

### Option 1: Manual execution
```bash
npm run organize-pinata
```
(Add to package.json scripts)

### Option 2: Admin API endpoint
```javascript
// app/api/admin/organize-pinata/route.js
export async function POST(req) {
  const { exec } = await import('child_process');
  return new Promise(resolve => {
    exec('node organize-pinata-files.js --group-id $PINATA_GROUP_ID',
      (error, stdout) => {
        resolve(new Response(stdout, { status: 200 }));
      }
    );
  });
}
```

### Option 3: Cron job
```bash
# Run daily at 2 AM
0 2 * * * cd /path/to/rodinha-api && node organize-pinata-files.js --group-id $PINATA_GROUP_ID --dry-run false
```

## Important Notes

### API Limitations

Pinata's API doesn't directly expose folder contents. The script handles:
- ✅ Files at the group level (flat structure)
- ✅ Artists detected from filename prefixes
- ⚠️ Files inside folders may not be accessible via this approach

### Safety Features

- **Dry-run by default** - no changes until you explicitly set `--dry-run false`
- **Clear preview** - shows exactly what will change before applying
- **Idempotent** - safe to run multiple times on the same data
- **Error handling** - reports failures per file

### Next Steps

1. **Test with dry-run first:**
   ```bash
   node organize-pinata-files.js --group-id 98a5da3a-0b42-45be-90f9-8e456e1a230e
   ```

2. **Review the changes** shown in the output

3. **Apply if satisfied:**
   ```bash
   node organize-pinata-files.js --group-id 98a5da3a-0b42-45be-90f9-8e456e1a230e --dry-run false
   ```

4. **Verify in Pinata dashboard** - check file names and metadata were updated

5. **Update your API** - modify `/app/api/pinata/tracks/route.js` to use the artist metadata:
   ```javascript
   .map(f => ({
     name: f.name,
     artist: f.keyvalues?.artist || '', // Now populated!
     url: `https://gateway.pinata.cloud/ipfs/${f.cid}`
   }))
   ```

## Troubleshooting

### "PINATA_JWT not provided"
- Ensure `.env.local` exists with `PINATA_JWT=...`
- Or pass explicitly: `--jwt "your_token"`

### No files to update
- Check file naming conventions match expected patterns
- Use `--verbose true` to see detailed analysis

### API rate limits
- Pinata may limit large batch updates
- Script is safe to re-run (already updated files won't change again)

## File Locations

```
/home/nuno/web3/rodinha-api/
├── organize-pinata-files.js          # Main script
├── PINATA_FOLDER_ORGANIZER_SKILL.md  # Skill documentation
├── ORGANIZE_PINATA_README.md         # Usage guide (this file)
└── app/api/pinata/tracks/route.js    # Your existing API route
```

## Support

For detailed information, see:
- **PINATA_FOLDER_ORGANIZER_SKILL.md** - Architecture and concepts
- **ORGANIZE_PINATA_README.md** - Complete usage examples
- Comments in **organize-pinata-files.js** - Implementation details
