import fs from 'fs';
import crypto from 'crypto';
import path from 'path';

const CACHE_FILE = '.mmi-cache.json';

// In-memory cache
let cache = {};

/**
 * Load cache from disk
 */
export function loadCache() {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      cache = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
    }
  } catch (err) {
    cache = {};
  }
}

/**
 * Save cache to disk
 */
function saveCache() {
  try {
    fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
  } catch (err) {
    console.error('[Cache] Save error:', err.message);
  }
}

/**
 * Calculate file hash (MD5)
 */
function getFileHash(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  return crypto.createHash('md5').update(content).digest('hex');
}

/**
 * Check if file has changed
 * @returns {boolean} true if changed
 */
export function hasFileChanged(filePath) {
  const currentHash = getFileHash(filePath);
  const cachedHash = cache[filePath];
  
  if (!cachedHash || cachedHash !== currentHash) {
    cache[filePath] = currentHash;
    saveCache();
    return true;
  }
  
  return false;
}

/**
 * Get only changed files from a list
 */
export function getChangedFiles(files) {
  return files.filter(file => hasFileChanged(file));
}

/**
 * Clear cache for a project
 */
export function clearCache(projectPath) {
  Object.keys(cache).forEach(key => {
    if (key.startsWith(projectPath)) {
      delete cache[key];
    }
  });
  saveCache();
}

// Load on import
loadCache();