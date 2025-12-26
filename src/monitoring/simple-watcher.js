import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const activeWatchers = new Map();
const debounceTimers = new Map();
const pendingChanges = new Map();
const lastAnalysisHash = new Map(); 
const cooldownUntil = new Map();     

/**
 * Berechne Hash aller geänderten Files
 */
function calculateProjectHash(projectPath, changedFiles) {
  const hashes = changedFiles.map(file => {
    try {
      const fullPath = path.join(projectPath, file);
      const content = fs.readFileSync(fullPath, 'utf8');
      return crypto.createHash('md5').update(content).digest('hex');
    } catch (err) {
      return 'error';
    }
  });
  
  return crypto.createHash('md5').update(hashes.join('|')).digest('hex');
}

/**
 * Rekursiv alle .cs Files finden
 */
function findCsFiles(dir) {
  let results = [];
  
  try {
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      if (item === 'bin' || item === 'obj' || item === 'node_modules') continue;
      
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        results = results.concat(findCsFiles(fullPath));
      } else if (item.endsWith('.cs')) {
        results.push(fullPath);
      }
    }
  } catch (err) {
    // Skip
  }
  
  return results;
}

/**
 * Alle Ordner mit .cs Files finden
 */
function findCsFolders(dir, folders = new Set()) {
  try {
    const items = fs.readdirSync(dir);
    
    let hasCs = false;
    
    for (const item of items) {
      if (item === 'bin' || item === 'obj' || item === 'node_modules') continue;
      
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        findCsFolders(fullPath, folders);
      } else if (item.endsWith('.cs')) {
        hasCs = true;
      }
    }
    
    if (hasCs) {
      folders.add(dir);
    }
  } catch (err) {
    // Skip
  }
  
  return folders;
}

/**
 * Start watching mit Deduplizierung + Cooldown + Hash-Check
 */
export function startWatching(projectPath, onChangeCallback) {
  if (activeWatchers.has(projectPath)) {
    console.error(`[MMI] Already watching: ${projectPath}`);
    return false;
  }

  console.error(`[MMI] ========================================`);
  console.error(`[MMI] Starting SIMPLE file watcher for: ${projectPath}`);
  console.error(`[MMI] ========================================`);

  const folders = findCsFolders(projectPath);
  const watchers = [];
  
  // Initialize tracking structures
  if (!pendingChanges.has(projectPath)) {
    pendingChanges.set(projectPath, new Set());
  }
  if (!lastAnalysisHash.has(projectPath)) {
    lastAnalysisHash.set(projectPath, null);
  }
  if (!cooldownUntil.has(projectPath)) {
    cooldownUntil.set(projectPath, 0);
  }
  
  console.error(`[MMI] Found ${folders.size} folders with .cs files`);
  
  for (const folder of folders) {
    console.error(`[MMI]   - Watching: ${folder}`);
    
    const watcher = fs.watch(folder, { recursive: false }, (eventType, filename) => {
      if (!filename || !filename.endsWith('.cs')) return;
      
      const fullPath = path.join(folder, filename);
      const relativePath = fullPath.replace(projectPath, '').replace(/^[\/\\]/, '');
      
      // Check cooldown
      const now = Date.now();
      const cooldown = cooldownUntil.get(projectPath);
      if (now < cooldown) {
        console.error(`[MMI] ⏳ COOLDOWN: Ignoring event for ${relativePath} (${Math.round((cooldown - now) / 1000)}s remaining)`);
        return;
      }
      
      // Deduplizierung
      const changes = pendingChanges.get(projectPath);
      const alreadyPending = changes.has(relativePath);
      changes.add(relativePath);
      
      console.error(`[MMI] ⚡ FILE EVENT: ${relativePath} (${eventType})`);
      
      if (alreadyPending) {
        console.error(`[MMI]    → Already pending, skipping duplicate event`);
        return;
      }
      
      // Clear existing timer
      if (debounceTimers.has(projectPath)) {
        clearTimeout(debounceTimers.get(projectPath));
        console.error(`[MMI]    → Debounce timer reset`);
      }
      
      // Set new timer
      const timer = setTimeout(() => {
        const changedFiles = Array.from(changes);
        
        // Calculate hash
        const currentHash = calculateProjectHash(projectPath, changedFiles);
        const previousHash = lastAnalysisHash.get(projectPath);
        
        if (currentHash === previousHash) {
          console.error(`[MMI] 🔄 Hash unchanged - skipping analysis`);
          console.error(`[MMI]    Files: ${changedFiles.join(', ')}`);
          changes.clear();
          debounceTimers.delete(projectPath);
          return;
        }
        
        console.error(`[MMI] ========================================`);
        console.error(`[MMI] 🔄 TRIGGERING ANALYSIS (${changedFiles.length} unique files)`);
        console.error(`[MMI] ========================================`);
        changedFiles.forEach(f => console.error(`[MMI]    - ${f}`));
        
        // Update hash BEFORE callback (in case callback takes time)
        lastAnalysisHash.set(projectPath, currentHash);
        
        // Set cooldown (5 seconds after analysis starts)
        cooldownUntil.set(projectPath, Date.now() + 5000);
        
        // Clear pending changes
        changes.clear();
        
        // Call the callback
        onChangeCallback(projectPath, changedFiles);
        
        debounceTimers.delete(projectPath);
        
        console.error(`[MMI] ⏳ Cooldown active for 5 seconds`);
      }, 2000); // 2 Sekunden Debounce
      
      debounceTimers.set(projectPath, timer);
    });
    
    watchers.push(watcher);
  }
  
  activeWatchers.set(projectPath, watchers);
  console.error(`[MMI] ✅ SIMPLE WATCHER READY (${watchers.length} watchers)`);
  
  return true;
}

/**
 * Stop watching
 */
export async function stopWatching(projectPath) {
  const watchers = activeWatchers.get(projectPath);
  
  if (!watchers) {
    console.error(`[MMI] Not watching: ${projectPath}`);
    return false;
  }

  console.error(`[MMI] Stopping simple watchers for: ${projectPath}`);
  
  // Clear all tracking
  if (pendingChanges.has(projectPath)) {
    pendingChanges.get(projectPath).clear();
    pendingChanges.delete(projectPath);
  }
  
  if (debounceTimers.has(projectPath)) {
    clearTimeout(debounceTimers.get(projectPath));
    debounceTimers.delete(projectPath);
  }
  
  lastAnalysisHash.delete(projectPath);
  cooldownUntil.delete(projectPath);

  // Close watchers
  watchers.forEach(w => w.close());
  activeWatchers.delete(projectPath);

  return true;
}

export function isWatching(projectPath) {
  return activeWatchers.has(projectPath);
}

export function getWatchedProjects() {
  return Array.from(activeWatchers.keys());
}

export async function stopAll() {
  console.error(`[MMI] Stopping all simple watchers...`);
  
  const promises = [];
  for (const projectPath of activeWatchers.keys()) {
    promises.push(stopWatching(projectPath));
  }
  
  await Promise.all(promises);
  console.error(`[MMI] All watchers stopped`);
}