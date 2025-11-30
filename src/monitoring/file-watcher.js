import chokidar from 'chokidar';

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

  console.error(`[MMI] Starting file watcher for: ${projectPath}`);

  // Create watcher
  const watcher = chokidar.watch('**/*.cs', {
    cwd: projectPath,
    ignored: ['**/bin/**', '**/obj/**', '**/node_modules/**'],
    ignoreInitial: true, // Don't trigger for existing files
    persistent: true,
    awaitWriteFinish: {
      stabilityThreshold: 500, // Wait 500ms after last change
      pollInterval: 100
    }
  });

  // Track changed files for debouncing
  let changedFiles = new Set();

  // File change handler
  const handleChange = (path) => {
    console.error(`[MMI] File changed: ${path}`);
    changedFiles.add(path);

    // Clear existing debounce timer
    if (debounceTimers.has(projectPath)) {
      clearTimeout(debounceTimers.get(projectPath));
    }

    // Set new debounce timer (wait 2 seconds after last change)
    const timer = setTimeout(() => {
      const files = Array.from(changedFiles);
      changedFiles.clear();
      
      console.error(`[MMI] Triggering analysis for ${files.length} files`);
      onChangeCallback(projectPath, files);
      
      debounceTimers.delete(projectPath);
    }, 2000);

    debounceTimers.set(projectPath, timer);
  };

  // Listen to events
  watcher
    .on('change', handleChange)
    .on('add', handleChange)
    .on('unlink', (path) => {
      console.error(`[MMI] File deleted: ${path}`);
      // Still trigger analysis on delete
      handleChange(path);
    })
    .on('error', (error) => {
      console.error(`[MMI] Watcher error:`, error);
    })
    .on('ready', () => {
      console.error(`[MMI] Watcher ready for: ${projectPath}`);
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