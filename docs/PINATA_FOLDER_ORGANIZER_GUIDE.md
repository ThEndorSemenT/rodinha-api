# Pinata Folder Organizer Skill

## Overview

This skill provides specialized instructions for organizing audio files in Pinata folders by artist. It enables automatic normalization of filenames and metadata based on folder structure.

## Purpose

When audio files are uploaded in artist-named folders, this skill:
- Extracts the artist name from folder names
- Removes redundant artist prefixes from filenames
- Updates file metadata to include standardized artist information
- Maintains clean, consistent file organization across Pinata groups

## Key Concepts

### Folder Structure Convention
```
Group/
├── Artist_A/
│   ├── Artist_A - Song One.mp3
│   ├── Artist_A - Song Two.mp3
│   └── Song Three.mp3
├── Artist_B/
│   ├── Artist_B - Track 1.wav
│   └── Track 2.wav
```

### Normalization Rules

1. **Folder Name = Artist Name**
   - Extract the artist name from the parent folder
   - Normalize spacing and special characters

2. **Filename Cleanup**
   - If filename contains the artist name (case-insensitive, fuzzy match), remove it
   - Example: `"Narkou - Moonlight Sonata.mp3"` → `"Moonlight Sonata.mp3"`
   - Preserve file extensions

3. **Metadata Update**
   - Add/update `artist` keyvalue with the folder name
   - Preserve existing metadata
   - Format: `{ artist: "ArtistName" }`

## Implementation Details

### API Limitations & Workarounds

**Challenge**: Pinata's API doesn't directly expose folder contents for nested directories.

When you query `GET /v3/files/public?group={id}`, you get:
- Top-level directories (shown as mime_type: "directory")
- Top-level audio files
- But NOT the files inside those directories

**Solution**: The script uses an alternative approach:
1. Query the group to identify artist folders
2. For each artist folder, extract keyvalue metadata from files that belong to that artist
3. Alternative: Manually query individual file CIDs if they're known

### API Endpoints Used
- Pinata v3 Files API: `https://api.pinata.cloud/v3/files/public`
- List files by group: `?group={group_id}&limit=100`
- List files by folder/CID: `?cid={cid}&limit=100` (returns folder itself, not contents)
- Update file metadata: `PUT /v3/files/public/{file_id}`

### Recommended Structure

For best results with this script, organize Pinata like this:
```
Group ID: my-music-group
├── Artist_A (folder)
│   ├── Track 1.mp3
│   └── Track 2.mp3
└── Single tracks (flat, not in folders)
    ├── Artist_B - Song.mp3
    └── Artist_C - Song.mp3
```

Then use the script on the flat structure, or upload tracks individually with artist metadata from the start.

### Script Invocation

The skill invokes `organize-pinata-files.js` with the following approach:

```bash
node organize-pinata-files.js \
  --group-id 98a5da3a-0b42-45be-90f9-8e456e1a230e \
  --jwt $PINATA_JWT \
  --dry-run true
```

### Parameters
- `--group-id`: Pinata group ID containing artist folders
- `--jwt`: Pinata JWT authentication token
- `--dry-run`: If true, shows changes without applying them (default: true)
- `--artists`: Optional comma-separated list of specific artists to process
- `--verbose`: Enable detailed logging (default: false)

## Workflow

1. **Fetch Group Contents**
   - Query Pinata API for all items in the group
   - Identify directories (mime_type: "directory")

2. **Process Each Folder**
   - Extract folder name as artist identifier
   - List files within that folder
   - Apply normalization rules

3. **Generate Changes**
   - Compare current filename with normalized version
   - Check current metadata for artist field
   - Build list of updates needed

4. **Dry Run / Execution**
   - Display planned changes to user
   - If confirmed, apply updates via Pinata API
   - Log all changes for audit trail

## Output Example

```
Processing Group: 98a5da3a-0b42-45be-90f9-8e456e1a230e

[DRY RUN] Artist: Narkou
  File: narkou-track-one.mp3
    - No changes needed (artist metadata exists)
  
  File: Narkou - Moonlight.mp3
    → Rename to: Moonlight.mp3
    → Update artist metadata to: Narkou

[DRY RUN] Artist: Mr_Jay
  File: Mr_Jay - Beat 001.wav
    → Rename to: Beat 001.wav
    → Update artist metadata to: Mr_Jay

Total files to update: 3
Run with --dry-run false to apply changes
```

## Error Handling

- Invalid folder structures (no folders in group)
- Pinata API errors (rate limits, auth failures)
- Filename conflicts (renaming to existing name)
- File extension preservation
- Missing or invalid JWT

## Security Considerations

- JWT token never logged or displayed
- Validates group ownership before processing
- Confirms changes in dry-run before execution
- Provides rollback capability via change log

## Integration with rodinha-api

The script can be:
1. Run standalone for batch organization
2. Invoked from a Next.js API route
3. Scheduled as a maintenance task
4. Called manually when new artists are added

## Dependencies

- Node.js 18+
- dotenv (for loading .env.local)
- node-fetch or native fetch (Node.js 18+)
- No external npm packages required (uses native APIs)
