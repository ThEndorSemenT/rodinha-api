#!/usr/bin/env node

import { readFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { pipeline } from 'stream/promises';
import { createWriteStream } from 'fs';
import fetch from 'node-fetch';

/**
 * Downloads all files from narkou and MrJay folders
 * Files are organized into tmp/downloads/{artist}/filename
 */

const GATEWAY_BASE = 'https://gateway.pinata.cloud/ipfs';
const DOWNLOAD_DIR = 'tmp/downloads';
const FILES_CONFIG = 'files-to-move.json';

// Parse command line arguments
const args = process.argv.slice(2);
const parsed = {};
for (let i = 0; i < args.length; i++) {
  if (args[i].startsWith('--')) {
    const key = args[i].substring(2);
    const value = args[i + 1]?.startsWith('--') ? 'true' : args[++i];
    parsed[key] = value || 'true';
  }
}

const VERBOSE = parsed.verbose === 'true' || parsed.v === 'true';

if (!existsSync(FILES_CONFIG)) {
  console.error(`❌ Error: Config file not found: ${FILES_CONFIG}`);
  process.exit(1);
}

/**
 * Download file with retry logic
 */
async function downloadFile(fileCid, filename, artist, retries = 8, initialDelay = 2000) {
  // Create artist directory
  const artistDir = join(DOWNLOAD_DIR, artist);
  mkdirSync(artistDir, { recursive: true });
  
  const filepath = join(artistDir, filename.replace(/[/\\]/g, '_'));
  const url = `${GATEWAY_BASE}/${fileCid}`;
  
  let lastError;
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await fetch(url);
      
      // If rate limited, wait and retry
      if (response.status === 429) {
        const delay = initialDelay * Math.pow(2, attempt);
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
 * Main execution
 */
async function main() {
  console.log('\n📥 Download Nested Folder Files');
  console.log('═══════════════════════════════════════\n');
  console.log(`Download directory: ${DOWNLOAD_DIR}`);
  console.log(`Config file: ${FILES_CONFIG}\n`);
  
  try {
    // Create downloads directory
    mkdirSync(DOWNLOAD_DIR, { recursive: true });
    
    // Load config
    const configContent = readFileSync(FILES_CONFIG, 'utf-8');
    const config = JSON.parse(configContent);
    
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
          process.stdout.write(`   ⏳ ${name}... `);
          const filepath = await downloadFile(cid, name, artist);
          console.log('✓');
          successCount++;
          
          // Add delay between files to avoid rate limiting (except for last file)
          if (i < files.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay between files
          }
        } catch (err) {
          console.log(`failed: ${err.message}`);
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
    console.log(`   Downloaded: ${successCount}`);
    console.log(`   Failed: ${failCount}`);
    console.log(`\n📂 Files organized in: ${DOWNLOAD_DIR}/{artist}/\n`);
    
    if (failCount === 0) {
      console.log('✅ All files downloaded successfully!\n');
    } else {
      console.log(`⚠️  ${failCount} files failed to download. Please retry with --verbose for more details.\n`);
    }
    
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

main();
