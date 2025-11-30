import fs from 'fs';

/**
 * Validate that a project path exists
 * @param {string} projectPath - Path to validate
 * @returns {Object} - { valid: boolean, error?: string }
 */
export function validateProjectPath(projectPath) {
  if (!projectPath) {
    return {
      valid: false,
      error: 'Project path is required'
    };
  }

  if (!fs.existsSync(projectPath)) {
    return {
      valid: false,
      error: `Path not found: ${projectPath}\n\nPlease check if the path is correct and accessible.`
    };
  }

  return { valid: true };
}