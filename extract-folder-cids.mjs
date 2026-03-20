#!/usr/bin/env node

/**
 * Extract File CIDs from Pinata Folder
 * 
 * Fetches a Pinata folder's HTML listing from the gateway
 * and extracts file information and direct-access CIDs.
 * 
 * Usage:
 *   node extract-folder-cids.mjs --folder mrjay
 *   node extract-folder-cids.mjs --folder narkou
 */

const FOLDERS = {
  'mrjay': 'bafybeiel4l5bzcfipdzhvxnotz4wdxha4ttv5fvmwnm6nxxws6pwkiv6qy',
  'narkou': 'bafybeidgwg5rg5n6higb6qarwouxdyb3dx5fhbcrqwjsyq73gzvwzalg4y'
};

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

async function extractCIDsFromFolder(folderCID, folderName) {
  try {
    console.log(`\n📁 Extracting CIDs from ${folderName}...`);
    
    const url = `https://gateway.pinata.cloud/ipfs/${folderCID}/`;
    const response = await fetch(url);
    
    if (!response.ok) {
      console.log(`   ❌ Error: ${response.status}`);
      return [];
    }
    
    const html = await response.text();
    
    // Parse HTML - look for both patterns:
    // 1. Direct access: /ipfs/{CID}?filename=...
    // 2. Folder path: /ipfs/{folderCID}/{filename}
    
    const files = new Map(); // Use Map to avoid duplicates
    
    // Pattern 1: Direct CID access with filename parameter
    // href="/ipfs/bafyXXX?filename=filename.wav"
    const directRegex = /"\/ipfs\/([a-z0-9]+)\?filename=([^"]+)"/g;
    let match;
    
    while ((match = directRegex.exec(html)) !== null) {
      const cid = match[1];
      const filename = decodeURIComponent(match[2]);
      
      // Skip if already have a direct link for this filename
      if (!files.has(filename)) {
        files.set(filename, { cid, filename });
      }
    }
    
    if (files.size === 0) {
      console.log(`   ⚠️  No files found`);
      return [];
    }
    
    const fileList = Array.from(files.values());
    
    console.log(`   ✅ Found ${fileList.length} files:\n`);
    fileList.forEach((file, i) => {
      console.log(`   ${i + 1}. ${file.filename}`);
      console.log(`      CID: ${file.cid}\n`);
    });
    
    const config = {
      [folderName]: fileList.map(f => ({
        name: f.filename,
        cid: f.cid,
        artist: folderName
      }))
    };
    
    console.log('📋 JSON config for files-to-move.json:\n');
    console.log(JSON.stringify(config, null, 2));
    
    return fileList;
    
  } catch (err) {
    console.error(`   ❌ Error: ${err.message}`);
    return [];
  }
}

async function main() {
  const args = parseArgs();
  
  console.log('\n🔍 Extract File CIDs from Pinata Folder');
  console.log('═══════════════════════════════════════');
  
  const folderName = args['folder']?.toLowerCase();
  
  if (!folderName || !FOLDERS[folderName]) {
    console.log('\nUsage:');
    console.log('  node extract-folder-cids.mjs --folder mrjay');
    console.log('  node extract-folder-cids.mjs --folder narkou\n');
    process.exit(0);
  }
  
  const cid = FOLDERS[folderName];
  await extractCIDsFromFolder(cid, folderName);
  
  console.log('\n');
}

main();
