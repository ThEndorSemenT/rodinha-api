#!/usr/bin/env node

/**
 * Move Files from Nested Pinata Folders to Root
 * 
 * Uses simpler file upload approach that handles large files.
 * 
 * Usage:
 *   # Preview changes (fast, no downloads)
 *   node move-nested-files-to-root.mjs
 *   
 *   # Apply changes
 *   node move-nested-files-to-root.mjs --dry-run false
 */

import { readFileSync, mkdirSync, rmSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createReadStream } from 'fs';
import { pipeline } from 'stream/promises';
import { createWriteStream } from 'fs';
import FormData from 'form-data';
import fetch from 'node-fetch';

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

const dotenv = loadEnv();
const args = parseArgs();

const PINATA_JWT = dotenv.PINATA_JWT || process.env.PINATA_JWT;
const PINATA_GROUP_ID = dotenv.PINATA_GROUP_ID || process.env.PINATA_GROUP_ID;
const DRY_RUN = args['dry-run'] !== 'false';
const VERBOSE = args['verbose'] === 'true';
const FILES_CONFIG = args['files-config'] || 'files-to-move.json';

const TEMP_DIR = join(__dirname, '.temp-nested-files');
// Use Pinata gateway - has rate limits but is more reliable for this use case
const GATEWAY_BASE = 'https://gateway.pinata.cloud/ipfs';

// Validation
if (!PINATA_JWT) {
  console.error('❌ Error: PINATA_JWT not found in .env.local');
  process.exit(1);
}

if (!PINATA_GROUP_ID) {
  console.error('❌ Error: PINATA_GROUP_ID not found');
  process.exit(1);
}

if (!existsSync(FILES_CONFIG)) {
  console.error(`❌ Error: Config file not found: ${FILES_CONFIG}`);
  process.exit(1);
}

/**
 * Download file from IPFS gateway with aggressive retry logic for rate limiting
 */
async function downloadFile(fileCid, filename, retries = 8, initialDelay = 2000) {
  const url = `${GATEWAY_BASE}/${fileCid}?filename=${encodeURIComponent(filename)}`;
  const filepath = join(TEMP_DIR, filename.replace(/[/\\]/g, '_'));
  
  if (VERBOSE) {
    console.log(`       ⬇️  Downloading ${filename}...`);
  }
  
  let lastError;
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await fetch(url);
      
      // If rate limited, wait significantly and retry
      if (response.status === 429) {
        const delay = initialDelay * Math.pow(2, attempt); // Exponential backoff
        const seconds = Math.round(delay / 1000);
        if (VERBOSE) {
          console.log(`       ⏸️  Rate limited (429), waiting ${seconds}s before retry ${attempt + 1}/${retries}...`);
        } else {
          process.stdout.write(`[R${attempt + 1}/${retries}] `);
        }
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      if (!response.ok) {
        throw new Error(`Download failed: ${response.status}`);
      }
      
      // Use streams for efficient download
      await pipeline(response.body, createWriteStream(filepath));
      return filepath;
    } catch (err) {
      lastError = err;
      if (attempt < retries - 1) {
        const delay = initialDelay * Math.pow(2, attempt);
        const seconds = Math.round(delay / 1000);
        if (VERBOSE) {
          console.log(`       ⏸️  Error, waiting ${seconds}s before retry...`);
        }
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError || new Error('Download failed after retries');
}

/**
 * Upload file to Pinata
 * Uses a simpler multipart upload that handles large files better
 */
async function uploadFileToRoot(filepath, filename, artist) {
  // Prepare clean filename
  const cleanName = filename.replace(new RegExp(`^${artist}\\s*[-:]\\s*`, 'i'), '');
  
  const form = new FormData();
  form.append('file', createReadStream(filepath));
  form.append('group_id', PINATA_GROUP_ID);
  form.append('name', cleanName);
  form.append('keyvalues', JSON.stringify({
    artist: artist,
    source: 'nested-folder'
  }));

  // Use raw content-type to avoid the form-data deprecation warning
  const response = await fetch(
    'https://api.pinata.cloud/v3/files',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PINATA_JWT}`,
        ...form.getHeaders()
      },
      body: form,
      timeout: 60000  // 60 second timeout for large files
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Upload failed: ${response.status} - ${errorText.substring(0, 100)}`);
  }

  const data = await response.json();
  return data.data;
}

/**
 * Main execution
 */
async function main() {
  console.log('\n🚀 Move Nested Folder Files to Root');
  console.log('═══════════════════════════════════════\n');
  console.log(`Group ID: ${PINATA_GROUP_ID}`);
  console.log(`Mode: ${DRY_RUN ? '🔍 DRY RUN' : '⚡ EXECUTION'}`);
  console.log(`Config file: ${FILES_CONFIG}\n`);

  try {
    // Load config
    const configContent = readFileSync(FILES_CONFIG, 'utf-8');
    const config = JSON.parse(configContent);
    
    if (!DRY_RUN) {
      mkdirSync(TEMP_DIR, { recursive: true });
    }
    
    let totalFiles = 0;
    let successCount = 0;
    let failCount = 0;
    
    // Process each folder
    for (const [folderName, files] of Object.entries(config)) {
      if (!Array.isArray(files)) continue;
      
      console.log(`📁 ${folderName.toUpperCase()}`);
      console.log(`   Files: ${files.length}\n`);
      
       for (let i = 0; i < files.length; i++) {
         const fileEntry = files[i];
         totalFiles++;
         const { name, cid, artist } = fileEntry;
         
         if (!cid || cid.includes('(')) {
           console.log(`   ⊘ ${name} (no CID)`);
           continue;
         }
         
         try {
           const cleanName = name.replace(new RegExp(`^${artist}\\s*[-:]\\s*`, 'i'), '');
           
           if (DRY_RUN) {
             console.log(`   ✓ ${name}`);
             console.log(`     → would rename to: ${cleanName}`);
             console.log(`     → artist: ${artist}\n`);
             successCount++;
           } else {
             // Download
             process.stdout.write(`   ⏳ ${name}... `);
             const filepath = await downloadFile(cid, name);
             
             // Upload
             const result = await uploadFileToRoot(filepath, name, artist);
             console.log('✓');
             successCount++;
             
             // Add delay between files to avoid rate limiting (except for last file)
             if (i < files.length - 1) {
               await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay between files
             }
           }
         } catch (err) {
           if (DRY_RUN) {
             console.log(`   ✗ ${name}: ${err.message}`);
           } else {
             console.log(`failed: ${err.message}`);
           }
           failCount++;
           
           // Add delay even on failure (except for last file)
           if (i < files.length - 1) {
             await new Promise(resolve => setTimeout(resolve, 1000));
           }
         }
       }
    }
    
    // Summary
    console.log('\n═══════════════════════════════════════');
    console.log(`\n📊 Summary:`);
    console.log(`   Total: ${totalFiles} files`);
    console.log(`   Success: ${successCount}`);
    console.log(`   Failed: ${failCount}`);
    
    if (DRY_RUN) {
      console.log(`\n🔍 This is a DRY RUN (no downloads or uploads).`);
      console.log(`Run with --dry-run false to apply changes.\n`);
    } else {
      console.log(`\n✅ Migration complete!\n`);
    }
    
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  } finally {
    if (!DRY_RUN) {
      rmSync(TEMP_DIR, { recursive: true, force: true });
    }
  }
}

main();
