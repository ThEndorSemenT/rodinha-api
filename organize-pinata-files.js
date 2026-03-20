#!/usr/bin/env node

/**
 * Pinata Folder Organizer Script
 * 
 * Organizes audio files in Pinata by artist folders.
 * Removes artist prefixes from filenames and updates metadata.
 * 
 * Usage:
 *   node organize-pinata-files.js --group-id <id> --jwt <token> [--dry-run true]
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load .env.local
const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dirname, '.env.local');

function loadEnv() {
  try {
    const content = readFileSync(envPath, 'utf-8');
    const env = {};
    content.split('\n').forEach(line => {
      const [key, value] = line.split('=');
      if (key && value) {
        env[key.trim()] = value.trim().replace(/^["']|["']$/g, '');
      }
    });
    return env;
  } catch (err) {
    return {};
  }
}

const dotenv = loadEnv();

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const parsed = {};
  
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const key = args[i].substring(2);
      const value = args[i + 1]?.startsWith('--') ? 'true' : args[++i];
      parsed[key] = value || 'true';
    }
  }
  
  return parsed;
}

// Extract parameters
const args = parseArgs();
const GROUP_ID = args['group-id'] || dotenv.PINATA_GROUP_ID || process.env.PINATA_GROUP_ID;
const DRY_RUN = args['dry-run'] !== 'false';
const VERBOSE = args['verbose'] === 'true';
const SPECIFIC_ARTISTS = args['artists'] ? args['artists'].split(',').map(a => a.trim()) : null;

// Use different JWTs for read vs write operations
// For dry-run (reading): use standard JWT (can be read-only)
// For execution (writing): use organizer JWT (must have write permissions)
const READ_JWT = args['jwt'] || dotenv.PINATA_JWT || process.env.PINATA_JWT;
const WRITE_JWT = args['write-jwt'] || dotenv.PINATA_ORGANISER_JWT || process.env.PINATA_ORGANISER_JWT;

// Validation
if (!READ_JWT) {
  console.error('❌ Error: PINATA_JWT not provided and not in .env.local');
  process.exit(1);
}

if (!GROUP_ID) {
  console.error('❌ Error: group-id not provided');
  process.exit(1);
}

// For execution mode, check if we have write permissions
if (!DRY_RUN && !WRITE_JWT) {
  console.error('❌ Error: PINATA_ORGANISER_JWT not provided for write operations');
  console.error('   Either provide --write-jwt or set PINATA_ORGANISER_JWT in .env.local');
  process.exit(1);
}

const API_BASE = 'https://api.pinata.cloud/v3/files/public';

/**
 * Fuzzy match to detect if filename contains artist name
 * Handles variations in spacing and special characters
 */
function artistInFilename(filename, artistName) {
  const normalized = filename.toLowerCase()
    .replace(/[\s\-_]+/g, ' ')
    .trim();
  
  const artistNorm = artistName.toLowerCase()
    .replace(/[\s\-_]+/g, ' ')
    .trim();
  
  // Check if artist name appears at the start followed by separator
  return normalized.startsWith(artistNorm + ' ');
}

/**
 * Extract clean track name by removing artist prefix
 */
function cleanFilename(filename, artistName) {
  if (!artistInFilename(filename, artistName)) {
    return filename;
  }
  
  const artistNorm = artistName.toLowerCase().replace(/[\s\-_]+/g, ' ').trim();
  const filenameNorm = filename.toLowerCase().replace(/[\s\-_]+/g, ' ').trim();
  
  // Find where artist name ends in the filename
  let cleaned = filename;
  
  // Try exact match with the original artist name
  const exactMatch = filename.match(new RegExp(`^${artistName}\\s*[\\-:]\\s*`, 'i'));
  if (exactMatch) {
    cleaned = filename.substring(exactMatch[0].length);
  }
  
  return cleaned;
}

/**
 * Fetch all items in a group
 */
async function fetchGroupItems(groupId) {
  try {
    const response = await fetch(`${API_BASE}?group=${groupId}&limit=100`, {
      headers: {
        'Authorization': `Bearer ${READ_JWT}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Pinata API error: ${response.status}`);
    }

    const data = await response.json();
    return data.data.files || [];
  } catch (error) {
    console.error('❌ Error fetching group items:', error.message);
    throw error;
  }
}

/**
 * Fetch files within a folder
 * Since Pinata API doesn't directly list folder contents,
 * we'll filter all group files by folder prefix
 */
async function fetchFolderContents(folderName, groupId) {
  try {
    const response = await fetch(`${API_BASE}?group=${groupId}&limit=100`, {
      headers: {
        'Authorization': `Bearer ${READ_JWT}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Pinata API error: ${response.status}`);
    }

    const data = await response.json();
    const allFiles = data.data.files || [];
    
    // Filter files that are in this folder (we'll check by looking at parent folder structure)
    // For now, just return all non-directory files as a fallback
    // The Pinata API structure makes it hard to get nested contents directly
    return allFiles.filter(f => f.mime_type !== 'directory');
  } catch (error) {
    console.error(`❌ Error fetching folder ${folderName}:`, error.message);
    return [];
  }
}

/**
 * Update file metadata and name
 */
async function updateFile(fileId, updates) {
  try {
    const payload = {};
    
    if (updates.name) {
      payload.name = updates.name;
    }
    
    if (updates.keyvalues) {
      payload.keyvalues = updates.keyvalues;
    }

    const response = await fetch(`${API_BASE}/${fileId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${WRITE_JWT}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Pinata API error: ${response.status} - ${error}`);
    }

    return true;
  } catch (error) {
    console.error(`❌ Error updating file ${fileId}:`, error.message);
    return false;
  }
}

/**
 * Process a single artist folder
 */
async function processArtistFolder(folder, groupId) {
  const artistName = folder.name;
  
  if (SPECIFIC_ARTISTS && !SPECIFIC_ARTISTS.includes(artistName)) {
    return [];
  }

  console.log(`\n📁 Processing artist: ${artistName}`);
  
  // Fetch files in the group and filter for this artist
  // Note: Pinata's API doesn't provide direct folder contents,
  // so we query all files and would need a workaround in practice
  const allFiles = await fetchFolderContents(artistName, groupId);
  
  if (allFiles.length === 0) {
    console.log('   (no files found - folders may need to be accessed differently)');
    return [];
  }

  const updates = [];

  for (const file of allFiles) {
    if (file.mime_type === 'directory') {
      if (VERBOSE) {
        console.log(`   ⊘ Skipping nested directory: ${file.name}`);
      }
      continue;
    }

    const hasArtistInName = artistInFilename(file.name, artistName);
    const cleanedName = cleanFilename(file.name, artistName);
    const hasArtistMetadata = file.keyvalues?.artist === artistName;

    let changes = [];
    
    if (hasArtistInName) {
      changes.push(`rename: "${file.name}" → "${cleanedName}"`);
    }
    
    if (!hasArtistMetadata) {
      changes.push(`add metadata: artist = "${artistName}"`);
    }

    if (changes.length > 0) {
      console.log(`   • ${file.name}`);
      changes.forEach(change => console.log(`     → ${change}`));
      
      updates.push({
        fileId: file.id,
        currentName: file.name,
        newName: cleanedName,
        artist: artistName,
        currentMetadata: file.keyvalues || {},
        hasArtistInName,
        needsMetadataUpdate: !hasArtistMetadata
      });
    } else {
      if (VERBOSE) {
        console.log(`   ✓ ${file.name} (no changes needed)`);
      }
    }
  }

  return updates;
}

/**
 * Main execution
 */
async function main() {
  console.log('\n🎵 Pinata Folder Organizer');
  console.log('═══════════════════════════════════\n');
  console.log(`Group ID: ${GROUP_ID}`);
  console.log(`Mode: ${DRY_RUN ? '🔍 DRY RUN' : '⚡ EXECUTION'}`);
  
  if (SPECIFIC_ARTISTS) {
    console.log(`Target artists: ${SPECIFIC_ARTISTS.join(', ')}`);
  }
  console.log('');

  try {
    // Fetch all items in the group
    const groupItems = await fetchGroupItems(GROUP_ID);
    
    // Separate folders and files
    const artistFolders = groupItems.filter(item => item.mime_type === 'directory');
    const audioFiles = groupItems.filter(item => item.mime_type && item.mime_type.startsWith('audio'));
    
    console.log(`Found ${artistFolders.length} artist folder(s)`);
    console.log(`Found ${audioFiles.length} audio file(s) in group\n`);

    let allUpdates = [];
    
    // NOTE: Due to Pinata API limitations, we can only reliably process flat files
    // (files directly in the group). Files inside folders are listed but we can't
    // determine which folder they belong to via the API.
    
    if (audioFiles.length > 0) {
      console.log('🎵 Processing Audio Files:');
      
      // Group files by artist (inferred from filename)
      const artistGroups = {};
      
      for (const file of audioFiles) {
        // Try to detect artist from filename (everything before " - " or " - " or "-")
        let artistName = null;
        const match = file.name.match(/^([^-]+?)[\s]*[-][\s]*/);
        if (match) {
          artistName = match[1].trim();
        }
        
        if (!artistName) {
          if (VERBOSE) {
            console.log(`   ⊘ ${file.name} (no artist prefix detected)`);
          }
          continue;
        }
        
        if (SPECIFIC_ARTISTS && !SPECIFIC_ARTISTS.includes(artistName)) {
          continue;
        }
        
        if (!artistGroups[artistName]) {
          artistGroups[artistName] = [];
        }
        artistGroups[artistName].push(file);
      }
      
      // Process each artist group
      for (const [artistName, files] of Object.entries(artistGroups)) {
        console.log(`\n  📁 Artist: ${artistName}`);
        
        for (const file of files) {
          const cleanedName = cleanFilename(file.name, artistName);
          const hasArtistMetadata = file.keyvalues?.artist === artistName;
          
          let changes = [];
          
          if (file.name !== cleanedName) {
            changes.push(`rename: "${file.name}" → "${cleanedName}"`);
          }
          
          if (!hasArtistMetadata) {
            changes.push(`add metadata: artist = "${artistName}"`);
          }
          
          if (changes.length > 0) {
            console.log(`     • ${file.name}`);
            changes.forEach(change => console.log(`       → ${change}`));
            
            allUpdates.push({
              fileId: file.id,
              currentName: file.name,
              newName: cleanedName,
              artist: artistName,
              currentMetadata: file.keyvalues || {},
              hasArtistInName: file.name !== cleanedName,
              needsMetadataUpdate: !hasArtistMetadata
            });
          } else if (VERBOSE) {
            console.log(`     ✓ ${file.name} (no changes needed)`);
          }
        }
      }
      
      if (artistFolders.length > 0) {
        console.log(`\n⚠️  Note: Found ${artistFolders.length} folder(s) (${artistFolders.map(f => f.name).join(', ')})`);
        console.log('   Files inside these folders cannot be accessed via the Pinata API.');
        console.log('   Only flat files in the group can be organized with this script.');
      }
    } else {
      console.log('⚠️  No audio files found in group');
    }

    // Summary
    console.log('\n═══════════════════════════════════');
    
    if (allUpdates.length === 0) {
      console.log('✅ No updates needed - all files are properly organized!');
      process.exit(0);
    }

    console.log(`\n📊 Summary: ${allUpdates.length} file(s) to update`);

    if (DRY_RUN) {
      console.log('\n🔍 This is a DRY RUN. No changes were applied.');
      console.log('Run with --dry-run false to apply these changes.\n');
      process.exit(0);
    }

    // Apply updates
    console.log('\n⚡ Applying updates...\n');
    
    let successCount = 0;
    
    for (const update of allUpdates) {
      const payload = {
        name: update.newName,
        keyvalues: {
          ...update.currentMetadata,
          artist: update.artist
        }
      };

      const success = await updateFile(update.fileId, payload);
      
      if (success) {
        console.log(`✓ Updated: ${update.currentName}`);
        successCount++;
      } else {
        console.log(`✗ Failed: ${update.currentName}`);
      }
    }

    console.log(`\n✅ Completed: ${successCount}/${allUpdates.length} files updated`);
    
  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    process.exit(1);
  }
}

main();
