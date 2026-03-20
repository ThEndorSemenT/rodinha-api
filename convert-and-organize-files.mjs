#!/usr/bin/env node

import { readFileSync, mkdirSync, renameSync, existsSync } from 'fs';
import { join, extname, basename } from 'path';
import { execSync } from 'child_process';

/**
 * Convert WAV files to MP3 and organize WITH artist prefixes
 * This allows chaining with organize-pinata-files.js for automatic metadata
 * Output goes to tmp/ready-for-upload/{artist}/
 */

const DOWNLOADS_DIR = 'tmp/downloads';
const UPLOAD_DIR = 'tmp/ready-for-upload';
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
const DRY_RUN = parsed['dry-run'] !== 'false';

if (!existsSync(FILES_CONFIG)) {
  console.error(`❌ Error: Config file not found: ${FILES_CONFIG}`);
  process.exit(1);
}

if (!existsSync(DOWNLOADS_DIR)) {
  console.error(`❌ Error: Downloads directory not found: ${DOWNLOADS_DIR}`);
  process.exit(1);
}

/**
 * Convert WAV to MP3
 */
function convertWavToMp3(inputPath, outputPath) {
  if (VERBOSE) {
    console.log(`       Converting ${basename(inputPath)}...`);
  }
  
  try {
    // Use ffmpeg to convert WAV to MP3
    // -acodec libmp3lame: Use MP3 encoder
    // -ab 192k: 192kbps bitrate (good quality/size balance)
    // -y: Overwrite output file without asking
    execSync(
      `ffmpeg -i "${inputPath}" -acodec libmp3lame -ab 192k -y "${outputPath}" 2>&1 | grep -i "error" || true`,
      { stdio: 'pipe' }
    );
    
    return outputPath;
  } catch (err) {
    throw new Error(`Conversion failed: ${err.message}`);
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('\n🎵 Convert & Organize Files');
  console.log('═══════════════════════════════════════\n');
  console.log(`Input directory: ${DOWNLOADS_DIR}`);
  console.log(`Output directory: ${UPLOAD_DIR}`);
  console.log(`Mode: ${DRY_RUN ? '🔍 DRY RUN' : '⚡ EXECUTION'}`);
  console.log(`Config file: ${FILES_CONFIG}\n`);
  
  try {
    // Create output directory
    if (!DRY_RUN) {
      mkdirSync(UPLOAD_DIR, { recursive: true });
    }
    
    // Load config
    const configContent = readFileSync(FILES_CONFIG, 'utf-8');
    const config = JSON.parse(configContent);
    
    let totalFiles = 0;
    let successCount = 0;
    let failCount = 0;
    let conversions = 0;
    
    // Process each folder
    for (const [folderName, files] of Object.entries(config)) {
      if (!Array.isArray(files)) continue;
      
      console.log(`📁 ${folderName.toUpperCase()}`);
      console.log(`   Files: ${files.length}\n`);
      
      for (const fileEntry of files) {
         totalFiles++;
         const { name, artist } = fileEntry;
         
         // Keep the artist prefix for chaining with organize-pinata-files.js
         // The organize script expects names like "Narkou-Track.mp3"
         const outputName = (() => {
           const ext = extname(name).toLowerCase();
           if (ext === '.wav') {
             // Convert WAV extension to MP3 but keep artist prefix
             return name.replace(/\.wav$/i, '.mp3');
           }
           // Keep MP3 files as-is (already have artist prefix)
           return name;
         })();
         
         // Source file
         const sourceFile = join(DOWNLOADS_DIR, artist, name);
         
         if (!existsSync(sourceFile)) {
           console.log(`   ⊘ ${name} (source file not found)`);
           failCount++;
           continue;
         }
         
         try {
           if (DRY_RUN) {
             console.log(`   ✓ ${name}`);
             console.log(`     → output as: ${outputName}`);
             console.log(`     → artist: ${artist}`);
             console.log(`     → (keeps prefix for organize-pinata-files.js)\n`);
             successCount++;
           } else {
             // Create artist directory in output
             const artistDir = join(UPLOAD_DIR, artist);
             mkdirSync(artistDir, { recursive: true });
             
             const ext = extname(name).toLowerCase();
             let outputFile;
             
             if (ext === '.wav') {
               // Convert WAV to MP3, keeping artist prefix
               outputFile = join(artistDir, outputName);
               
               process.stdout.write(`   ⏳ ${name} → ${outputName}... `);
               convertWavToMp3(sourceFile, outputFile);
               console.log('✓');
               conversions++;
               successCount++;
             } else {
               // Copy MP3 files as-is, keeping artist prefix
               outputFile = join(artistDir, outputName);
               
               process.stdout.write(`   ⏳ ${name} → ${outputName}... `);
               // Simple copy by reading and writing
               const fs = await import('fs/promises');
               const content = await fs.readFile(sourceFile);
               await fs.writeFile(outputFile, content);
               console.log('✓');
               successCount++;
             }
           }
         } catch (err) {
           if (DRY_RUN) {
             console.log(`   ✗ ${name}: ${err.message}`);
           } else {
             console.log(`failed: ${err.message}`);
           }
           failCount++;
         }
       }
     }
    
    // Summary
    console.log('\n═══════════════════════════════════════');
    console.log(`\n📊 Summary:`);
    console.log(`   Total: ${totalFiles} files`);
    console.log(`   Processed: ${successCount}`);
    console.log(`   Failed: ${failCount}`);
    if (conversions > 0) {
      console.log(`   WAV → MP3 conversions: ${conversions}`);
    }
    
    if (DRY_RUN) {
       console.log(`\n🔍 This is a DRY RUN (no conversions or file operations).`);
       console.log(`Run with --dry-run false to apply changes.\n`);
     } else {
       console.log(`\n📂 Files ready in: ${UPLOAD_DIR}/{artist}/`);
       console.log(`✅ Files are ready for organize-pinata-files.js!`);
       console.log(`\n📝 Next: Upload files manually, then run:`);
       console.log(`   node organize-pinata-files.js --group-id <GROUP_ID>\n`);
     }
    
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

main();
