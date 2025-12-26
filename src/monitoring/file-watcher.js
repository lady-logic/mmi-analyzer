import chokidar from 'chokidar';
import path from 'path';

// Active watchers: Map<projectPath, watcher>
const activeWatchers = new Map();

// Debounce timers: Map<projectPath, timeout>
const debounceTimers = new Map();

/**
 * Start watching C# files in a project
 * @param {string} projectPath - Path to the project
 * @param {Function} onChangeCallback - Called when files change (projectPath, changedFiles)
 * @returns {boolean} - Success status
 */
export function startWatching(projectPath, onChangeCallback) {
  // Check if already watching
  if (activeWatchers.has(projectPath)) {
    console.error(`[MMI] Already watching: ${projectPath}`);
    return false;
  }

  console.error(`[MMI] ========================================`);
  console.error(`[MMI] Starting file watcher for: ${projectPath}`);
  console.error(`[MMI] ========================================`);

  const absolutePattern = path.join(projectPath, '**/*.cs').replace(/\\/g, '/');
  console.error(`[MMI] Watching pattern: ${absolutePattern}`);

  // Create watcher
  const watcher = chokidar.watch(absolutePattern, {
    ignored: ['**/bin/**', '**/obj/**', '**/node_modules/**'],
    ignoreInitial: true,
    persistent: true,
    
    usePolling: true,           
    interval: 1000,              
    binaryInterval: 1000,
    
    awaitWriteFinish: {
      stabilityThreshold: 500,
      pollInterval: 100
    }
  });

  // Track changed files for debouncing
  let changedFiles = new Set();

  // File change handler
  const handleChange = (filePath) => {
    const relativePath = filePath.replace(projectPath, '').replace(/^[\/\\]/, '');

    console.error(`[MMI] ⚡ FILE CHANGED: ${relativePath}`);
    console.error(`[MMI]    Full path: ${projectPath}/${relativePath}`);
    changedFiles.add(relativePath);

    // Clear existing debounce timer
    if (debounceTimers.has(projectPath)) {
      clearTimeout(debounceTimers.get(projectPath));
      console.error(`[MMI]    Debounce timer reset`);
    }

    // Set new debounce timer (wait 2 seconds after last change)
    const timer = setTimeout(() => {
      const files = Array.from(changedFiles);
      changedFiles.clear();
      
      console.error(`[MMI] 🔄 TRIGGERING ANALYSIS for ${files.length} files:`);
      onChangeCallback(projectPath, files);
      
      debounceTimers.delete(projectPath);
    }, 2000);

    debounceTimers.set(projectPath, timer);
  };

  // Listen to events
  watcher
  .on('change', (filePath) => {
    console.error(`[MMI] 📝 EVENT: change - ${filePath}`);
    handleChange(filePath);
  })
  .on('add', (filePath) => {
    console.error(`[MMI] ➕ EVENT: add - ${filePath}`);
    handleChange(filePath);
  })
  .on('unlink', (filePath) => {
    console.error(`[MMI] ➖ EVENT: unlink - ${filePath}`);
    handleChange(filePath);
  })
  .on('error', (error) => {
    console.error(`[MMI] ❌ WATCHER ERROR:`, error);
  })
  .on('ready', () => {
    console.error(`[MMI] ✅ WATCHER READY`);
    console.error(`[MMI]    Pattern: ${absolutePattern}`);
    console.error(`[MMI]    Polling: ENABLED (Windows mode)`);
  });

activeWatchers.set(projectPath, watcher);
return true;
}

/**
 * Stop watching a project
 * @param {string} projectPath - Path to the project
 * @returns {boolean} - Success status
 */
export async function stopWatching(projectPath) {
  const watcher = activeWatchers.get(projectPath);
  
  if (!watcher) {
    console.error(`[MMI] Not watching: ${projectPath}`);
    return false;
  }

  console.error(`[MMI] Stopping file watcher for: ${projectPath}`);

  // Clear debounce timer
  if (debounceTimers.has(projectPath)) {
    clearTimeout(debounceTimers.get(projectPath));
    debounceTimers.delete(projectPath);
  }

  // Close watcher
  await watcher.close();
  activeWatchers.delete(projectPath);

  return true;
}

/**
 * Check if a project is being watched
 * @param {string} projectPath - Path to the project
 * @returns {boolean}
 */
export function isWatching(projectPath) {
  return activeWatchers.has(projectPath);
}

/**
 * Get all watched projects
 * @returns {string[]} - Array of project paths
 */
export function getWatchedProjects() {
  return Array.from(activeWatchers.keys());
}

/**
 * Stop all watchers (cleanup on shutdown)
 */
export async function stopAll() {
  console.error(`[MMI] Stopping all watchers...`);
  
  const promises = [];
  for (const projectPath of activeWatchers.keys()) {
    promises.push(stopWatching(projectPath));
  }
  
  await Promise.all(promises);
  console.error(`[MMI] All watchers stopped`);
}